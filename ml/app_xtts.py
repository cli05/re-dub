import modal
import os

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
        "torch",
        "torchaudio"
    )
)

# 4. Define the Serverless GPU Function
@app.function(
    image=xtts_image,
    gpu="A10G",
    timeout=600,
    volumes={"/models": model_vol, "/pipeline": pipeline_vol}
)
def generate_dubbed_audio(job_id: str, text: str, target_language: str):
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

    speaker_ref_path = f"/pipeline/{job_id}/speaker_ref.wav"
    dubbed_audio_path = f"/pipeline/{job_id}/dubbed_audio.wav"

    print(f"Cloning voice and generating audio for text: '{text[:30]}...'")

    # Language codes for XTTS are 2-letter ISO codes (e.g., 'es', 'fr')
    tts.tts_to_file(
        text=text,
        speaker_wav=speaker_ref_path,
        language=target_language.lower(),
        file_path=dubbed_audio_path
    )

    pipeline_vol.commit()  # Makes dubbed_audio.wav visible to LatentSync container
    print("Audio generation complete.")

# 5. Local Testing Entrypoint
@app.local_entrypoint()
def main(job_id: str = "test-123"):
    """
    Run this locally using: modal run ml/app_xtts.py --job-id <JOB_ID>
    Requires speaker_ref.wav to already be present at /pipeline/{job_id}/speaker_ref.wav
    """
    test_text = "Bienvenidos a este tutorial. Hoy vamos a aprender sobre componentes de React."
    target_lang = "es"

    print(f"Triggering Modal voice cloning job for job_id={job_id}...")
    generate_dubbed_audio.remote(job_id=job_id, text=test_text, target_language=target_lang)
    print(f"Success! dubbed_audio.wav written to /pipeline/{job_id}/ on the volume.")
