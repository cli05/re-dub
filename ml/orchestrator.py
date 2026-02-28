import modal
import os
import json

# 1. Define the Modal App
app = modal.App("redub-orchestrator")

# 2. Define the Environment
# We need ffmpeg to extract a 6-second voice sample, boto3 for S3 uploads, 
# and requests for the webhook.
orchestrator_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("boto3", "requests")
)

# 3. Helper Function: Extract Voice Sample
def extract_speaker_reference(video_url: str) -> bytes:
    import subprocess
    import tempfile
    
    output_wav_path = tempfile.mktemp(suffix=".wav")
    
    # Use FFmpeg to grab the first 6 seconds of audio for the XTTS voice clone
    command = [
        "ffmpeg", "-y", 
        "-i", video_url, 
        "-t", "6", # 6 seconds duration
        "-vn", # Disable video
        "-acodec", "pcm_s16le", # Standard WAV encoding
        "-ar", "22050", # 22kHz sample rate
        "-ac", "1", # Mono channel
        output_wav_path
    ]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    with open(output_wav_path, "rb") as f:
        audio_bytes = f.read()
        
    os.remove(output_wav_path)
    return audio_bytes

# 4. The Main Pipeline Function
@app.function(
    image=orchestrator_image, 
    secrets=[
        modal.Secret.from_name("do-spaces-secret"), # Boto3 S3 credentials
        modal.Secret.from_name("backend-webhook-secret") # Webhook API key
    ],
    timeout=1800 # 30 minutes to account for the entire pipeline
)
def process_video(job_id: str, video_url: str, target_language: str):
    import boto3
    import requests

    print(f"--- Starting Pipeline for Job: {job_id} ---")

    # Step A: Transcription
    print("1. Transcribing audio...")
    whisper_func = modal.Function.from_name("redub-whisper", "transcribe_video")
    transcription_data = whisper_func.remote(video_url)
    
    # Step B: Translation
    print("2. Translating text...")
    translate_func = modal.Function.from_name("redub-translate", "translate_text")
    translated_segments = translate_func.remote(
        segments=transcription_data["segments"],
        target_language=target_language,
        glossary={"PolyGlot Dubs": "PolyGlot Dubs"} # Example glossary
    )

    # Step C: Voice Cloning (XTTS)
    print("3. Extracting voice reference and cloning...")
    # Extract the 6-second sample directly from the source URL
    speaker_ref_bytes = extract_speaker_reference(video_url)
    
    # Combine translated segments into a single string for XTTS
    full_translated_text = " ".join([seg["translated_text"] for seg in translated_segments])
    
    xtts_func = modal.Function.from_name("redub-xtts", "generate_dubbed_audio")
    dubbed_audio_bytes = xtts_func.remote(
        text=full_translated_text,
        target_language=target_language[:2].lower(), # E.g., "Spanish" -> "sp" (XTTS uses "es", adjust mapping as needed)
        speaker_reference_bytes=speaker_ref_bytes
    )

    # Step D: Visual Lip Sync (Wav2Lip)
    print("4. Morphing video lips...")
    wav2lip_func = modal.Function.from_name("redub-wav2lip", "sync_lip_movements")
    final_video_bytes = wav2lip_func.remote(video_url, dubbed_audio_bytes)

    # Step E: Upload to Digital Ocean Spaces / Cloudflare R2
    print("5. Uploading to Storage...")
    s3_client = boto3.client(
        's3',
        endpoint_url=os.environ["S3_ENDPOINT_URL"],
        aws_access_key_id=os.environ["S3_ACCESS_KEY"],
        aws_secret_access_key=os.environ["S3_SECRET_KEY"]
    )
    
    bucket_name = os.environ["S3_BUCKET_NAME"]
    file_key = f"dubbed_videos/{job_id}_{target_language}.mp4"
    
    s3_client.put_object(
        Bucket=bucket_name,
        Key=file_key,
        Body=final_video_bytes,
        ContentType='video/mp4',
        ACL='public-read' # Make it accessible to the React frontend
    )
    
    final_video_url = f"{os.environ['S3_ENDPOINT_URL'].replace('https://', f'https://{bucket_name}.')}/{file_key}"

    # Step F: Fire Webhook to FastAPI
    print("6. Notifying FastAPI backend...")
    webhook_url = os.environ["WEBHOOK_URL"]
    headers = {"Authorization": f"Bearer {os.environ['WEBHOOK_SECRET']}"}
    payload = {
        "job_id": job_id,
        "status": "COMPLETED",
        "result_url": final_video_url
    }
    
    response = requests.post(webhook_url, json=payload, headers=headers)
    response.raise_for_status()

    print("--- Pipeline Complete ---")
    return {"status": "success", "url": final_video_url}

# 5. Local Testing Entrypoint
@app.local_entrypoint()
def main(job_id: str = "test-123"):
    """
    Run this locally using: modal run ml/orchestrator.py
    (Ensure the other 4 apps are deployed first using `modal deploy ml/app_*.py`)
    """
    test_video_url = "https://www.w3schools.com/html/mov_bbb.mp4"
    target_lang = "es" # ISO code for Spanish
    
    print("Triggering the grand orchestrator...")
    result = process_video.remote(job_id, test_video_url, target_lang)
    print(f"Final Output URL: {result['url']}")