import modal
import os
import json
import subprocess

# 1. Define the Modal App
app = modal.App("redub-orchestrator")

# 2. Persistent volumes shared across all pipeline apps
pipeline_vol = modal.Volume.from_name("redub-pipeline", create_if_missing=True)

# 3. Define the Environment
orchestrator_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("boto3", "requests")
)

# 4. The Main Pipeline Function
@app.function(
    image=orchestrator_image,
    secrets=[
        modal.Secret.from_name("redub-r2-secret"),       # R2 credentials
        modal.Secret.from_name("backend-webhook-secret")  # Webhook API key
    ],
    timeout=1800,  # 30 minutes to account for the entire pipeline
    volumes={"/pipeline": pipeline_vol}
)
def process_video(job_id: str, video_url: str, target_language: str):
    import boto3
    import requests

    print(f"--- Starting Pipeline for Job: {job_id} ---")

    # Set up per-job scratch space on the pipeline volume
    job_dir = f"/pipeline/{job_id}"
    os.makedirs(job_dir, exist_ok=True)
    source_video_path = f"{job_dir}/source.mp4"
    speaker_ref_path  = f"{job_dir}/speaker_ref.wav"

    # Download source video once — shared by Whisper and LatentSync via volume
    print(f"Downloading source video from {video_url}...")
    with requests.get(video_url, stream=True) as r:
        r.raise_for_status()
        with open(source_video_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)

    # Extract 6-second speaker reference for XTTS voice cloning
    subprocess.run([
        "ffmpeg", "-y", "-i", source_video_path,
        "-t", "6", "-vn", "-acodec", "pcm_s16le", "-ar", "22050", "-ac", "1",
        speaker_ref_path
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    pipeline_vol.commit()  # Makes source.mp4 + speaker_ref.wav visible to downstream containers

    # Step A: Transcription
    print("1. Transcribing audio...")
    whisper_func = modal.Function.from_name("redub-whisper", "transcribe_video")
    transcription_data = whisper_func.remote(job_id)

    # Step B: Translation
    print("2. Translating text...")
    translate_func = modal.Function.from_name("redub-translate", "translate_text")
    translated_segments = translate_func.remote(
        segments=transcription_data["segments"],
        target_language=target_language,
        glossary={"PolyGlot Dubs": "PolyGlot Dubs"}
    )

    # Step C: Voice Cloning (XTTS)
    print("3. Cloning voice and generating dubbed audio...")
    full_translated_text = " ".join([seg["translated_text"] for seg in translated_segments])

    xtts_func = modal.Function.from_name("redub-xtts", "generate_dubbed_audio")
    xtts_func.remote(
        job_id=job_id,
        text=full_translated_text,
        target_language=target_language[:2].lower()  # E.g., "Spanish" -> "sp" (needs proper mapping)
    )

    # Step D: Visual Lip Sync (LatentSync)
    print("4. Morphing video lips using Latent Diffusion...")
    latentsync_func = modal.Function.from_name("redub-latentsync", "sync_lip_movements")
    final_video_bytes = latentsync_func.remote(job_id)

    # Step E: Upload to Cloudflare R2
    print("5. Uploading to R2...")
    s3_client = boto3.client(
        's3',
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )

    bucket_name = os.environ["R2_BUCKET_NAME"]
    output_key = f"projects/{job_id}/dubbed_output.mp4"

    s3_client.put_object(
        Bucket=bucket_name,
        Key=output_key,
        Body=final_video_bytes,
        ContentType='video/mp4',
    )

    # Step F: Fire Webhook to FastAPI
    print("6. Notifying FastAPI backend...")
    webhook_url = os.environ["WEBHOOK_URL"]
    headers = {"Authorization": f"Bearer {os.environ['WEBHOOK_SECRET']}"}
    payload = {
        "job_id": job_id,
        "status": "COMPLETED",
        "output_key": output_key,
    }

    response = requests.post(webhook_url, json=payload, headers=headers)
    response.raise_for_status()

    print("--- Pipeline Complete ---")
    return {"status": "success", "output_key": output_key}

# 5. Local Testing Entrypoint
@app.local_entrypoint()
def main(job_id: str = "test-123"):
    """
    Run this locally using: modal run ml/orchestrator.py
    (Ensure the other 4 apps are deployed first using `modal deploy ml/app_*.py`)
    """
    test_video_url = "https://www.w3schools.com/html/mov_bbb.mp4"
    target_lang = "es"  # ISO code for Spanish

    print("Triggering the grand orchestrator...")
    result = process_video.remote(job_id, test_video_url, target_lang)
    print(f"Final Output URL: {result['url']}")
