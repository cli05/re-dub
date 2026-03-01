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

    webhook_url = os.environ["WEBHOOK_URL"]
    webhook_headers = {"Authorization": f"Bearer {os.environ['WEBHOOK_SECRET']}"}

    def notify_step(step: int):
        """Tell the backend which pipeline step is now active. Fire-and-forget."""
        try:
            step_url = webhook_url.replace("/job-complete", "/job-step")
            requests.post(step_url, json={"job_id": job_id, "step": step}, headers=webhook_headers, timeout=5)
        except Exception as e:
            print(f"[warn] Step webhook failed (step={step}): {e}")

    # Step 1: Preparing — download video + extract speaker reference
    notify_step(1)
    print("1. Preparing — downloading source video and extracting voice sample...")
    job_dir = f"/pipeline/{job_id}"
    os.makedirs(job_dir, exist_ok=True)
    source_video_path = f"{job_dir}/source.mp4"
    speaker_ref_path  = f"{job_dir}/speaker_ref.wav"

    with requests.get(video_url, stream=True) as r:
        r.raise_for_status()
        with open(source_video_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)

    subprocess.run([
        "ffmpeg", "-y", "-i", source_video_path,
        "-t", "6", "-vn", "-acodec", "pcm_s16le", "-ar", "22050", "-ac", "1",
        speaker_ref_path
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    pipeline_vol.commit()  # Makes source.mp4 + speaker_ref.wav visible to downstream containers

    # Step 2: Transcription
    notify_step(2)
    print("2. Transcribing audio with Whisper...")
    whisper_func = modal.Function.from_name("redub-whisper", "transcribe_video")
    transcription_data = whisper_func.remote(job_id)

    # Step 3: Translation
    notify_step(3)
    print("3. Translating text with Llama 3.3-70B...")
    translate_func = modal.Function.from_name("redub-translate", "translate_text")
    translated_segments = translate_func.remote(
        segments=transcription_data["segments"],
        target_language=target_language,
        glossary={"Redub": "Redub"}
    )

    # Step 4: Voice Cloning (XTTS) — per-segment with duration matching
    notify_step(4)
    print("4. Cloning voice and generating per-segment dubbed audio with XTTS v2...")

    xtts_func = modal.Function.from_name("redub-xtts", "generate_dubbed_audio")
    xtts_result = xtts_func.remote(
        job_id=job_id,
        segments=translated_segments,
        target_language=target_language,
    )
    print(f"   XTTS result: {xtts_result}")

    # Step 5: Visual Lip Sync (MuseTalk)
    notify_step(5)
    print("5. Syncing lip movements with MuseTalk...")
    musetalk_func = modal.Function.from_name("redub-musetalk", "sync_lip_movements")
    final_video_bytes = musetalk_func.remote(job_id)

    # Upload to Cloudflare R2
    print("6. Uploading to R2...")
    s3_client = boto3.client(
        's3',
        endpoint_url=f"https://{os.environ['ACCOUNT_ID']}.r2.cloudflarestorage.com",
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

    # Fire completion webhook to FastAPI
    print("7. Notifying FastAPI backend — pipeline complete...")
    payload = {"job_id": job_id, "status": "COMPLETED", "output_key": output_key}
    response = requests.post(webhook_url, json=payload, headers=webhook_headers)
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
    test_video_url = "tmp/test.mp4"
    target_lang = "es"  # ISO code for Spanish

    print("Triggering the grand orchestrator...")
    result = process_video.remote(job_id, test_video_url, target_lang)
    print(f"Final Output URL: {result['url']}")
