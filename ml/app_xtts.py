import modal
import os
import subprocess
import json
import struct
import tempfile

# 1. Define the Modal App
app = modal.App("redub-xtts")

# 2. Persistent volumes shared across all pipeline apps
model_vol = modal.Volume.from_name("redub-model-weights", create_if_missing=True)
pipeline_vol = modal.Volume.from_name("redub-pipeline", create_if_missing=True)

# 3. Build the custom Docker image (no weight baking — lazy load at runtime)
xtts_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "TTS==0.22.0",  # Pinning the version for stability
        "transformers>=4.33.0,<4.40.0",  # TTS 0.22.0 is incompatible with transformers>=4.40
        "torch<2.6.0",      # TTS 0.22.0 uses torch.load() without weights_only; PyTorch 2.6 changed the default to True, breaking checkpoint loading
        "torchaudio<2.6.0",
        "requests",
        "boto3",
    )
)

# ── Helpers ───────────────────────────────────────────────────────

# Acceptable stretch range — beyond this the audio sounds unnatural
MIN_TEMPO = 0.5   # slowest (2× slower)
MAX_TEMPO = 1.8   # fastest (1.8× faster)

# How much of the time-stretch to actually apply (0.0 = none, 1.0 = full).
# 0.5 means we meet the original timing halfway — noticeably aligned but
# still natural-sounding. Go down for less stretching, up for tighter timing alignment
STRETCH_ALPHA = 0.3

SAMPLE_RATE = 22050  # XTTS v2 output sample rate
NUM_CHANNELS = 1     # mono


def _get_wav_duration(path: str) -> float:
    """Get WAV duration in seconds via ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


def _time_stretch_wav(input_path: str, output_path: str, tempo: float):
    """Time-stretch a WAV file using ffmpeg atempo filter.

    ffmpeg's atempo filter only accepts values in [0.5, 100.0], but values
    beyond ~2.0 degrade quality.  For extreme ratios we chain two atempo
    filters (e.g., 0.25 → atempo=0.5,atempo=0.5).
    """
    # Clamp to our quality bounds
    tempo = max(MIN_TEMPO, min(MAX_TEMPO, tempo))

    # Build filter chain — ffmpeg atempo valid range is [0.5, 100]
    filters = []
    remaining = tempo
    while remaining < 0.5:
        filters.append("atempo=0.5")
        remaining /= 0.5
    while remaining > 2.0:
        filters.append("atempo=2.0")
        remaining /= 2.0
    filters.append(f"atempo={remaining:.6f}")

    filter_str = ",".join(filters)

    subprocess.run(
        ["ffmpeg", "-y", "-i", input_path,
         "-filter:a", filter_str,
         "-ar", str(SAMPLE_RATE), "-ac", str(NUM_CHANNELS),
         "-acodec", "pcm_s16le", output_path],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def _generate_silence_wav(path: str, duration_sec: float):
    """Write a silent WAV file of the given duration (16-bit PCM, mono, 22050 Hz)."""
    num_samples = int(SAMPLE_RATE * duration_sec)
    data_size = num_samples * NUM_CHANNELS * 2  # 16-bit = 2 bytes per sample

    with open(path, "wb") as f:
        # RIFF header
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + data_size))
        f.write(b"WAVE")
        # fmt chunk
        f.write(b"fmt ")
        f.write(struct.pack("<I", 16))                    # chunk size
        f.write(struct.pack("<H", 1))                     # PCM format
        f.write(struct.pack("<H", NUM_CHANNELS))
        f.write(struct.pack("<I", SAMPLE_RATE))
        f.write(struct.pack("<I", SAMPLE_RATE * NUM_CHANNELS * 2))  # byte rate
        f.write(struct.pack("<H", NUM_CHANNELS * 2))      # block align
        f.write(struct.pack("<H", 16))                    # bits per sample
        # data chunk
        f.write(b"data")
        f.write(struct.pack("<I", data_size))
        f.write(b"\x00" * data_size)


def _concat_wavs(wav_paths: list[str], output_path: str):
    """Concatenate WAV files using ffmpeg's concat demuxer."""
    list_file = tempfile.mktemp(suffix=".txt")
    with open(list_file, "w") as f:
        for p in wav_paths:
            f.write(f"file '{p}'\n")

    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file,
         "-acodec", "pcm_s16le", "-ar", str(SAMPLE_RATE), "-ac", str(NUM_CHANNELS),
         output_path],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    os.remove(list_file)


# ── Shared Model Setup ────────────────────────────────────────────

XTTS_HOME = "/models/xtts"
PRESETS_DIR = "/models/xtts_presets"


def _ensure_base_model():
    """Download XTTS v2 base weights to volume if not already cached."""
    os.environ["COQUI_TOS_AGREED"] = "1"
    os.environ["TTS_HOME"] = XTTS_HOME

    from TTS.api import TTS

    sentinel = f"{XTTS_HOME}/tts_models--multilingual--multi-dataset--xtts_v2"
    if not os.path.exists(sentinel):
        print("Cold start: downloading XTTS v2 weights to volume...")
        os.makedirs(XTTS_HOME, exist_ok=True)
        TTS("tts_models/multilingual/multi-dataset/xtts_v2")
        model_vol.commit()
        print("XTTS v2 weights cached to volume.")


def _load_tts(checkpoint_volume_path: str = None):
    """Load XTTS v2, optionally with pre-computed speaker conditioning latents."""
    os.environ["COQUI_TOS_AGREED"] = "1"
    os.environ["TTS_HOME"] = XTTS_HOME

    _ensure_base_model()

    from TTS.api import TTS

    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")

    return tts


# ── Fine-Tuning Function ─────────────────────────────────────────

@app.function(
    image=xtts_image,
    gpu="H100",
    timeout=1800,   # 30 min — fine-tuning can be slow
    secrets=[
        modal.Secret.from_name("backend-webhook-secret"),
        modal.Secret.from_name("redub-r2-secret"),
    ],
    volumes={"/models": model_vol, "/pipeline": pipeline_vol},
)
def fine_tune_speaker(preset_id: str, audio_url: str):
    """Compute high-quality speaker conditioning latents from reference audio.

    XTTS v2's Xtts class has no training support (forward/train_step raise
    NotImplementedError). Instead, we extract speaker conditioning latents
    (gpt_cond_latent + speaker_embedding) from many audio chunks, average
    them for robustness, and cache the result. At inference time we load
    these pre-computed latents and pass them directly to the model, bypassing
    the short 6-second speaker_ref.wav extraction and producing much more
    consistent and higher-quality voice cloning.

    Steps:
        1. Download reference audio from R2 (via presigned URL)
        2. Normalize to 22050 Hz mono WAV
        3. Split into 8-15 second chunks
        4. Extract gpt_cond_latent + speaker_embedding from each chunk
        5. Average across all chunks for a robust speaker representation
        6. Save latents + best speaker_ref.wav to volume
        7. Fire webhook to backend
    """
    import requests
    import torch
    import shutil
    import traceback

    os.environ["COQUI_TOS_AGREED"] = "1"
    os.environ["TTS_HOME"] = XTTS_HOME

    _ensure_base_model()

    webhook_url = os.environ["WEBHOOK_URL"]
    webhook_headers = {"Authorization": f"Bearer {os.environ['WEBHOOK_SECRET']}"}

    try:
        # ── Download reference audio ──────────────────────────────
        work_dir = f"/pipeline/finetune_{preset_id}"
        os.makedirs(work_dir, exist_ok=True)
        raw_audio_path = f"{work_dir}/reference_raw.wav"

        print(f"Downloading reference audio for preset {preset_id}...")
        with requests.get(audio_url, stream=True) as r:
            r.raise_for_status()
            with open(raw_audio_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

        # ── Normalize to 22050 Hz mono WAV ────────────────────────
        normalized_path = f"{work_dir}/reference.wav"
        subprocess.run([
            "ffmpeg", "-y", "-i", raw_audio_path,
            "-ar", "22050", "-ac", "1", "-acodec", "pcm_s16le",
            normalized_path,
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        total_duration = _get_wav_duration(normalized_path)
        print(f"Reference audio: {total_duration:.1f}s")

        # ── Split into conditioning chunks (8-15 sec each) ────────
        chunks_dir = f"{work_dir}/chunks"
        os.makedirs(chunks_dir, exist_ok=True)

        chunk_duration = 10  # seconds per chunk
        num_chunks = max(1, int(total_duration / chunk_duration))
        chunk_paths = []

        for i in range(num_chunks):
            start = i * chunk_duration
            chunk_path = f"{chunks_dir}/chunk_{i:03d}.wav"
            subprocess.run([
                "ffmpeg", "-y", "-i", normalized_path,
                "-ss", str(start), "-t", str(chunk_duration),
                "-ar", "22050", "-ac", "1", "-acodec", "pcm_s16le",
                chunk_path,
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            # Only include chunks that are at least 3 seconds
            dur = _get_wav_duration(chunk_path)
            if dur >= 3.0:
                chunk_paths.append(chunk_path)
            else:
                os.remove(chunk_path)

        print(f"Split into {len(chunk_paths)} conditioning chunks (≥3s each)")

        if len(chunk_paths) < 2:
            raise ValueError(
                f"Not enough usable audio for speaker conditioning "
                f"({total_duration:.1f}s total, {len(chunk_paths)} chunks ≥3s). "
                f"Please upload at least 30 seconds of clear speech."
            )

        # ── Extract conditioning latents from each chunk ──────────
        from TTS.api import TTS

        print("Loading XTTS v2 for speaker conditioning extraction...")
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
        model = tts.synthesizer.tts_model

        all_gpt_cond = []
        all_speaker_emb = []

        for i, chunk_path in enumerate(chunk_paths):
            print(f"  Extracting latents from chunk {i+1}/{len(chunk_paths)}...")
            gpt_cond_latent, speaker_embedding = model.get_conditioning_latents(
                audio_path=[chunk_path],
                gpt_cond_len=30,            # longer context = better quality
                gpt_cond_chunk_len=4,
            )
            all_gpt_cond.append(gpt_cond_latent)
            all_speaker_emb.append(speaker_embedding)

        # ── Average latents across all chunks ─────────────────────
        avg_gpt_cond = torch.mean(torch.stack(all_gpt_cond), dim=0)
        avg_speaker_emb = torch.mean(torch.stack(all_speaker_emb), dim=0)

        print(f"Averaged conditioning latents from {len(chunk_paths)} chunks")
        print(f"  gpt_cond_latent: {avg_gpt_cond.shape}")
        print(f"  speaker_embedding: {avg_speaker_emb.shape}")

        # ── Save latents to volume ────────────────────────────────
        checkpoint_dir = f"{PRESETS_DIR}/{preset_id}"
        os.makedirs(checkpoint_dir, exist_ok=True)
        latents_path = f"{checkpoint_dir}/speaker_latents.pth"

        torch.save({
            "gpt_cond_latent": avg_gpt_cond.cpu(),
            "speaker_embedding": avg_speaker_emb.cpu(),
            "num_chunks": len(chunk_paths),
            "total_duration": total_duration,
            "preset_id": preset_id,
        }, latents_path)

        model_vol.commit()
        print(f"Speaker latents saved to {latents_path}")

        # Also save a long speaker reference WAV (the full normalized audio)
        # as fallback and for future use
        speaker_ref_dest = f"{checkpoint_dir}/speaker_ref.wav"
        shutil.copy2(normalized_path, speaker_ref_dest)
        model_vol.commit()

        # ── Upload completion marker to R2 (webhook fallback) ──
        import boto3 as _boto3
        _s3 = _boto3.client(
            "s3",
            endpoint_url=f"https://{os.environ['ACCOUNT_ID']}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            region_name="auto",
        )
        marker_key = f"presets/{preset_id}/done.json"
        marker_body = json.dumps({
            "preset_id": preset_id,
            "status": "READY",
            "checkpoint_volume_path": latents_path,
        })
        _s3.put_object(
            Bucket=os.environ["R2_BUCKET_NAME"],
            Key=marker_key,
            Body=marker_body.encode(),
            ContentType="application/json",
        )
        print(f"Uploaded completion marker to R2: {marker_key}")

        # ── Clean up working directory ────────────────────────────
        shutil.rmtree(work_dir, ignore_errors=True)
        pipeline_vol.commit()

        # ── Fire webhook ──────────────────────────────────────────
        # print("Notifying backend — speaker conditioning complete...")
        # webhook_base = webhook_url.replace("/job-complete", "")
        # payload = {
        #     "preset_id": preset_id,
        #     "status": "READY",
        #     "checkpoint_volume_path": latents_path,
        # }
        # resp = requests.post(
        #     f"{webhook_base}/preset-complete",
        #     json=payload, headers=webhook_headers, timeout=10,
        # )
        # resp.raise_for_status()
        print(f"Speaker conditioning complete for preset {preset_id}.")

    except Exception as e:
        print(f"Speaker conditioning FAILED for preset {preset_id}: {e}")
        traceback.print_exc()
        try:
            webhook_base = webhook_url.replace("/job-complete", "")
            requests.post(
                f"{webhook_base}/preset-complete",
                json={"preset_id": preset_id, "status": "FAILED", "error": str(e)},
                headers=webhook_headers, timeout=10,
            )
        except Exception:
            pass
        raise


# ── Main Function ─────────────────────────────────────────────────

# 4. Define the Serverless GPU Function
@app.function(
    image=xtts_image,
    gpu="H100",
    timeout=900,   # longer timeout for per-segment generation
    volumes={"/models": model_vol, "/pipeline": pipeline_vol}
)
def generate_dubbed_audio(
    job_id: str,
    segments: list[dict],
    target_language: str,
    checkpoint_volume_path: str = None,
):
    """Generate time-aligned dubbed audio from translated segments.

    Each segment dict must have:
        - "translated_text": str   — the text to speak
        - "start": float           — original segment start time (seconds)
        - "end": float             — original segment end time (seconds)

    If checkpoint_volume_path is provided, loads a fine-tuned XTTS model
    and uses the preset's bundled speaker_ref.wav instead of the one
    extracted from the source video.

    The function generates TTS audio per segment, time-stretches each clip
    to match the original segment duration, inserts silence for gaps between
    segments, and writes the final stitched result to dubbed_audio.wav.
    """
    print(f"Loading XTTS v2 for language '{target_language}'"
          f"{' (preset)' if checkpoint_volume_path else ''}...")
    tts = _load_tts(checkpoint_volume_path)

    job_dir = f"/pipeline/{job_id}"

    # Load pre-computed speaker latents if a preset is available,
    # otherwise we'll use speaker_wav for zero-shot conditioning
    import torch
    preset_latents = None
    speaker_ref_path = f"{job_dir}/speaker_ref.wav"

    if checkpoint_volume_path and os.path.exists(checkpoint_volume_path):
        print(f"Loading pre-computed speaker latents from {checkpoint_volume_path}...")
        preset_latents = torch.load(checkpoint_volume_path, map_location="cuda", weights_only=False)
        print(f"  gpt_cond_latent: {preset_latents['gpt_cond_latent'].shape}")
        print(f"  speaker_embedding: {preset_latents['speaker_embedding'].shape}")
        print(f"  (averaged from {preset_latents.get('num_chunks', '?')} chunks, "
              f"{preset_latents.get('total_duration', '?')}s total)")
        # Also use the preset's long speaker_ref.wav as fallback
        preset_dir = os.path.dirname(checkpoint_volume_path)
        preset_speaker_ref = f"{preset_dir}/speaker_ref.wav"
        if os.path.exists(preset_speaker_ref):
            speaker_ref_path = preset_speaker_ref
    elif checkpoint_volume_path:
        print(f"[warn] Latents not found at {checkpoint_volume_path}, using zero-shot from video.")

    dubbed_audio_path = f"{job_dir}/dubbed_audio.wav"
    seg_dir = f"{job_dir}/segments"
    os.makedirs(seg_dir, exist_ok=True)

    lang_code = target_language[:2].lower()
    pieces: list[str] = []  # ordered list of WAV paths to concatenate

    print(f"Generating audio for {len(segments)} segments (lang={lang_code})...")

    for i, seg in enumerate(segments):
        text = seg["translated_text"].strip()
        target_start = float(seg["start"])
        target_end = float(seg["end"])
        target_duration = target_end - target_start

        if not text:
            print(f"  Segment {i}: empty text — skipping.")
            continue

        # ── Insert silence gap before this segment ────────────────
        if pieces:
            # End of the previous piece in the timeline
            prev_end = float(segments[i - 1]["end"]) if i > 0 else 0.0
        else:
            prev_end = 0.0

        gap = target_start - prev_end
        if gap > 0.01:  # only insert if gap is meaningful (>10ms)
            silence_path = f"{seg_dir}/silence_{i:04d}.wav"
            _generate_silence_wav(silence_path, gap)
            pieces.append(silence_path)
            print(f"  Gap before segment {i}: {gap:.3f}s of silence")

        # ── Generate raw TTS for this segment ─────────────────────
        raw_path = f"{seg_dir}/raw_{i:04d}.wav"

        if preset_latents is not None:
            # Use pre-computed speaker conditioning latents (higher quality)
            import torchaudio
            model = tts.synthesizer.tts_model
            out = model.inference(
                text=text,
                language=lang_code,
                gpt_cond_latent=preset_latents["gpt_cond_latent"].to("cuda"),
                speaker_embedding=preset_latents["speaker_embedding"].to("cuda"),
                temperature=0.7,
            )
            wav_tensor = torch.tensor(out["wav"]).unsqueeze(0)
            torchaudio.save(raw_path, wav_tensor, SAMPLE_RATE)
        else:
            # Zero-shot: use speaker_wav file
            tts.tts_to_file(
                text=text,
                speaker_wav=speaker_ref_path,
                language=lang_code,
                file_path=raw_path,
            )
        raw_duration = _get_wav_duration(raw_path)

        # ── Time-stretch to match original segment duration ───────
        if target_duration > 0.05 and raw_duration > 0.05:
            raw_tempo = raw_duration / target_duration  # >1 = speed up, <1 = slow down
            # Dampen: blend toward 1.0 so we don't fully distort the voice
            tempo = 1.0 + STRETCH_ALPHA * (raw_tempo - 1.0)
            clamped_tempo = max(MIN_TEMPO, min(MAX_TEMPO, tempo))

            stretched_path = f"{seg_dir}/stretched_{i:04d}.wav"
            _time_stretch_wav(raw_path, stretched_path, tempo)
            actual_duration = _get_wav_duration(stretched_path)

            print(
                f"  Segment {i}: \"{text[:40]}...\" "
                f"target={target_duration:.2f}s  raw={raw_duration:.2f}s  "
                f"raw_tempo={raw_tempo:.2f}  applied={clamped_tempo:.2f} "
                f"(alpha={STRETCH_ALPHA})  final={actual_duration:.2f}s"
            )
            pieces.append(stretched_path)
        else:
            # Segment too short to stretch — use raw audio as-is
            print(f"  Segment {i}: \"{text[:40]}...\" raw={raw_duration:.2f}s (no stretch)")
            pieces.append(raw_path)

    # ── Handle leading silence (if first segment doesn't start at 0) ──
    if segments and float(segments[0]["start"]) > 0.01 and pieces:
        lead_silence = f"{seg_dir}/silence_lead.wav"
        _generate_silence_wav(lead_silence, float(segments[0]["start"]))
        pieces.insert(0, lead_silence)

    # ── Concatenate all pieces into final dubbed_audio.wav ────────
    if not pieces:
        raise RuntimeError("No audio segments were generated — nothing to concatenate.")

    print(f"Concatenating {len(pieces)} audio pieces into dubbed_audio.wav...")
    _concat_wavs(pieces, dubbed_audio_path)

    final_duration = _get_wav_duration(dubbed_audio_path)
    print(f"Final dubbed audio: {final_duration:.2f}s")

    pipeline_vol.commit()  # Makes dubbed_audio.wav visible to lip-sync container
    print("Audio generation complete.")

    return {
        "duration": final_duration,
        "num_segments": len(segments),
        "num_pieces": len(pieces),
    }


# 5. Local Testing Entrypoint
@app.local_entrypoint()
def main(job_id: str = "test-123"):
    """
    Run this locally using: modal run ml/app_xtts.py --job-id <JOB_ID>
    Requires speaker_ref.wav to already be present at /pipeline/{job_id}/speaker_ref.wav
    """
    test_segments = [
        {"translated_text": "Bienvenidos a este tutorial.", "start": 0.0, "end": 2.5},
        {"translated_text": "Hoy vamos a aprender sobre componentes de React.", "start": 3.0, "end": 5.5},
        {"translated_text": "Vamos a sumergirnos en el código.", "start": 6.0, "end": 8.0},
    ]
    target_lang = "es"

    print(f"Triggering Modal voice cloning job for job_id={job_id}...")
    result = generate_dubbed_audio.remote(
        job_id=job_id, segments=test_segments, target_language=target_lang,
        checkpoint_volume_path=None,  # pass a path to test fine-tuned preset
    )
    print(f"Success! {json.dumps(result, indent=2)}")
    print(f"dubbed_audio.wav written to /pipeline/{job_id}/ on the volume.")
