"""
Test script: runs the full dubbing pipeline end-to-end WITHOUT backend dependencies.

Chains: Whisper → Translation → XTTS → MuseTalk
Skips:  R2 upload, webhook callback

Setup:
    1. Upload a test video to the Modal volume:
        modal volume put redub-pipeline /path/to/local/video.mp4 test-full/source.mp4

    2. Deploy all 4 pipeline apps:
        modal deploy ml/app_whisper.py
        modal deploy ml/app_translate.py
        modal deploy ml/app_xtts.py
        modal deploy ml/app_musetalk.py

Usage:
    modal run ml/test_full_pipeline.py
    modal run ml/test_full_pipeline.py --job-id my-test --target-language French

Requires:
    - source.mp4 on the volume at /pipeline/{job_id}/source.mp4
    - Modal secrets: groq-secret (for translation)
"""
import modal
import os
import subprocess
import time

app = modal.App("redub-test-full-pipeline")

pipeline_vol = modal.Volume.from_name("redub-pipeline", create_if_missing=True)

# Lightweight image just for extracting speaker reference audio
setup_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
)


@app.function(
    image=setup_image,
    timeout=300,
    volumes={"/pipeline": pipeline_vol},
)
def prepare_source_files(job_id: str):
    """Verify source video exists on the volume and extract speaker reference audio."""
    job_dir = f"/pipeline/{job_id}"
    source_video_path = f"{job_dir}/source.mp4"
    speaker_ref_path = f"{job_dir}/speaker_ref.wav"

    if not os.path.exists(source_video_path):
        raise FileNotFoundError(
            f"source.mp4 not found at {source_video_path}\n"
            f"Upload it first with:\n"
            f"  modal volume put redub-pipeline /path/to/video.mp4 {job_id}/source.mp4"
        )

    size_mb = os.path.getsize(source_video_path) / (1024 * 1024)
    print(f"Found source video: {source_video_path} ({size_mb:.2f} MB)")

    print("Extracting 6-second speaker reference for XTTS...")
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", source_video_path,
            "-t", "6", "-vn", "-acodec", "pcm_s16le", "-ar", "22050", "-ac", "1",
            speaker_ref_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    # print("Extracting 6-second speaker reference for XTTS...")
    # result = subprocess.run(
    #     [
    #         "ffmpeg", "-y", "-i", source_video_path,
    #         "-t", "6", "-vn", "-acodec", "pcm_s16le", "-ar", "22050", "-ac", "1",
    #         speaker_ref_path,
    #     ],
    #     capture_output=True,
    #     text=True,
    # )
    # if result.returncode != 0:
    #     print(f"  ffmpeg stdout: {result.stdout}")
    #     print(f"  ffmpeg stderr: {result.stderr}")
    #     raise RuntimeError(f"ffmpeg failed with exit code {result.returncode}")
    print(f"  → saved speaker_ref.wav ({os.path.getsize(speaker_ref_path)} bytes)")

    pipeline_vol.commit()
    print("Volume committed — source files are now visible to downstream containers.\n")


@app.local_entrypoint()
def main(
    job_id: str = "test-full",
    target_language: str = "zh-cn",
):
    overall_start = time.time()

    print("=" * 60)
    print(f"  FULL PIPELINE TEST  (job_id={job_id})")
    print(f"  Target language: {target_language}")
    print(f"  Source: volume redub-pipeline @ /{job_id}/source.mp4")
    print("=" * 60)

    # ── Step 0: Verify source video & extract speaker ref ──────────
    print("\n▶ Step 0/4 — Verifying source video & extracting speaker ref...")
    t = time.time()
    prepare_source_files.remote(job_id)
    print(f"  ✓ Done ({time.time() - t:.1f}s)")

    # ── Step 1: Transcription (Whisper) ────────────────────────────
    print("\n▶ Step 1/4 — Transcribing audio (Whisper large-v3)...")
    t = time.time()
    whisper_func = modal.Function.from_name("redub-whisper", "transcribe_video")
    transcription = whisper_func.remote(job_id)
    elapsed = time.time() - t
    print(f"  ✓ Transcription complete ({elapsed:.1f}s)")
    print(f"    Segments: {len(transcription['segments'])}")
    print(f"    Preview:  {transcription['text'][:120]}...")

    # ── Step 2: Translation (Groq) ─────────────────────────────────
    print(f"\n▶ Step 2/4 — Translating to {target_language} (Groq)...")
    t = time.time()
    translate_func = modal.Function.from_name("redub-translate", "translate_text")
    translated_segments = translate_func.remote(
        segments=transcription["segments"],
        target_language=target_language,
        glossary={},
    )
    elapsed = time.time() - t
    print(f"  ✓ Translation complete ({elapsed:.1f}s)")
    print("    Sample translations:")
    for seg in translated_segments[:3]:
        print(f"      [{seg['start']:.1f}s-{seg['end']:.1f}s] {seg['original_text'].strip()}")
        print(f"      → {seg['translated_text'].strip()}")

    # ── Step 3: Voice Cloning (XTTS) — per-segment with duration matching ──
    print(f"\n▶ Step 3/4 — Per-segment voice cloning via XTTS (lang={target_language})...")
    t = time.time()
    xtts_func = modal.Function.from_name("redub-xtts", "generate_dubbed_audio")
    xtts_result = xtts_func.remote(
        job_id=job_id,
        segments=translated_segments,
        target_language=target_language,
    )
    elapsed = time.time() - t
    print(f"  ✓ Dubbed audio generated ({elapsed:.1f}s)")
    print(f"    Result: {xtts_result}")
    print(f"    Written to volume: /pipeline/{job_id}/dubbed_audio.wav")

    # ── Step 4: Lip Sync (MuseTalk on H100) ──────────────────────
    print(f"\n▶ Step 4/4 — Lip-syncing video (MuseTalk / H100)...")
    t = time.time()
    musetalk_func = modal.Function.from_name("redub-musetalk", "sync_lip_movements")
    final_video_bytes = musetalk_func.remote(job_id)
    elapsed = time.time() - t
    print(f"  ✓ Lip sync complete ({elapsed:.1f}s)")
    print(f"    Output size: {len(final_video_bytes) / (1024 * 1024):.2f} MB")

    # ── Save output locally ────────────────────────────────────────
    output_dir = os.path.join(os.path.dirname(__file__), "tmp")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{job_id}_dubbed_output_{target_language}.mp4")
    with open(output_path, "wb") as f:
        f.write(final_video_bytes)

    total_elapsed = time.time() - overall_start
    print("\n" + "=" * 60)
    print("  ✅ PIPELINE COMPLETE")
    print(f"  Total time:   {total_elapsed:.1f}s ({total_elapsed / 60:.1f} min)")
    print(f"  Output saved:  {output_path}")
    print(f"  Output size:   {len(final_video_bytes) / (1024 * 1024):.2f} MB")
    print("=" * 60)
