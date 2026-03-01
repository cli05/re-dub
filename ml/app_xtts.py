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
        "torchaudio<2.6.0"
    )
)

# ── Helpers ───────────────────────────────────────────────────────

# Acceptable stretch range — beyond this the audio sounds unnatural
MIN_TEMPO = 0.5   # slowest (2× slower)
MAX_TEMPO = 1.8   # fastest (1.8× faster)

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


# ── Main Function ─────────────────────────────────────────────────

# 4. Define the Serverless GPU Function
@app.function(
    image=xtts_image,
    gpu="H100",
    timeout=900,   # longer timeout for per-segment generation
    volumes={"/models": model_vol, "/pipeline": pipeline_vol}
)
def generate_dubbed_audio(job_id: str, segments: list[dict], target_language: str):
    """Generate time-aligned dubbed audio from translated segments.

    Each segment dict must have:
        - "translated_text": str   — the text to speak
        - "start": float           — original segment start time (seconds)
        - "end": float             — original segment end time (seconds)

    The function generates TTS audio per segment, time-stretches each clip
    to match the original segment duration, inserts silence for gaps between
    segments, and writes the final stitched result to dubbed_audio.wav.
    """
    # TTS_HOME must be set before TTS resolves its cache path at import time
    XTTS_HOME = "/models/xtts"
    os.environ["COQUI_TOS_AGREED"] = "1"
    os.environ["TTS_HOME"] = XTTS_HOME

    from TTS.api import TTS

    XTTS_SENTINEL = f"{XTTS_HOME}/tts_models--multilingual--multi-dataset--xtts_v2"
    if not os.path.exists(XTTS_SENTINEL):
        print("Cold start: downloading XTTS v2 weights to volume...")
        os.makedirs(XTTS_HOME, exist_ok=True)
        TTS("tts_models/multilingual/multi-dataset/xtts_v2")  # downloads to TTS_HOME
        model_vol.commit()
        print("XTTS v2 weights cached to volume.")

    print(f"Loading XTTS v2 for language '{target_language}'...")
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")

    job_dir = f"/pipeline/{job_id}"
    speaker_ref_path = f"{job_dir}/speaker_ref.wav"
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
        tts.tts_to_file(
            text=text,
            speaker_wav=speaker_ref_path,
            language=lang_code,
            file_path=raw_path,
        )
        raw_duration = _get_wav_duration(raw_path)

        # ── Time-stretch to match original segment duration ───────
        if target_duration > 0.05 and raw_duration > 0.05:
            tempo = raw_duration / target_duration  # >1 = speed up, <1 = slow down
            clamped_tempo = max(MIN_TEMPO, min(MAX_TEMPO, tempo))

            stretched_path = f"{seg_dir}/stretched_{i:04d}.wav"
            _time_stretch_wav(raw_path, stretched_path, tempo)
            actual_duration = _get_wav_duration(stretched_path)

            print(
                f"  Segment {i}: \"{text[:40]}...\" "
                f"target={target_duration:.2f}s  raw={raw_duration:.2f}s  "
                f"tempo={tempo:.2f} (clamped={clamped_tempo:.2f})  "
                f"final={actual_duration:.2f}s"
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
    )
    print(f"Success! {json.dumps(result, indent=2)}")
    print(f"dubbed_audio.wav written to /pipeline/{job_id}/ on the volume.")
