import modal
import os

# 1. Define the Modal App
app = modal.App("redub-whisper")

# 2. Persistent volumes shared across all pipeline apps
model_vol = modal.Volume.from_name("redub-model-weights", create_if_missing=True)
pipeline_vol = modal.Volume.from_name("redub-pipeline", create_if_missing=True)

# 3. Build the custom Docker image (no weight baking — lazy load at runtime)
whisper_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "openai-whisper",
        "torch",
        "torchaudio",
        "requests"
    )
)

# 4. Define the Serverless GPU Function
@app.function(
    image=whisper_image,
    gpu="A10G",
    timeout=600,
    volumes={"/models": model_vol, "/pipeline": pipeline_vol}
)
def transcribe_video(job_id: str):
    import whisper

    WHISPER_CACHE = "/models/whisper"
    needs_commit = not os.path.exists(f"{WHISPER_CACHE}/large-v3.pt")

    if needs_commit:
        print("Cold start: downloading Whisper large-v3 weights to volume...")

    print("Loading Whisper model into VRAM...")
    model = whisper.load_model("large-v3", download_root=WHISPER_CACHE)

    if needs_commit:
        model_vol.commit()
        print("Whisper weights cached to volume.")

    source_video_path = f"/pipeline/{job_id}/source.mp4"
    print(f"Transcribing {source_video_path}...")

    # word_timestamps=True is critical for precise lip-syncing downstream
    result = model.transcribe(source_video_path, word_timestamps=True)

    print("Transcription complete.")
    return {
        "text": result["text"],
        "segments": result["segments"]
    }

# 5. Local Testing Entrypoint
@app.local_entrypoint()
def main(job_id: str = "test-123"):
    """
    Run this locally using: modal run ml/app_whisper.py --job-id <JOB_ID>
    Requires source.mp4 to already be present at /pipeline/{job_id}/source.mp4
    """
    print(f"Triggering Modal transcription job for job_id={job_id}...")
    transcription_data = transcribe_video.remote(job_id)

    print("\n--- Final Output ---")
    for segment in transcription_data["segments"]:
        print(f"[{segment['start']:.2f}s - {segment['end']:.2f}s]: {segment['text']}")
