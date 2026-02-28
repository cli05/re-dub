import modal
import subprocess
import os

# 1. Define the Modal App
app = modal.App("redub-whisper")

# 2. Define the Environment and Cache the Model Weights
def download_whisper_weights():
    """
    Downloads the Whisper v3 model weights during the image build step.
    This prevents the container from downloading several GBs every time it boots up.
    """
    import whisper
    # "large-v3" is the most accurate, but "base" is good for quick testing
    whisper.load_model("large-v3") 

# Build the custom Docker image
whisper_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg") # Required for audio processing
    .pip_install(
        "openai-whisper",
        "torch",
        "torchaudio",
        "requests"
    )
    .run_function(download_whisper_weights) # Bake weights into the image
)

# 3. Define the Serverless GPU Function
@app.function(image=whisper_image, gpu="A10G", timeout=600)
def transcribe_video(video_url: str):
    import whisper
    import requests
    import tempfile

    print(f"Downloading video from {video_url}...")
    
    # Create a temporary file to hold the downloaded video
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video:
        response = requests.get(video_url, stream=True)
        response.raise_for_status()
        for chunk in response.iter_content(chunk_size=8192):
            temp_video.write(chunk)
        temp_video_path = temp_video.name

    print("Loading Whisper model into VRAM...")
    # Load the model (this is fast because weights are already in the image)
    model = whisper.load_model("large-v3")

    print("Transcribing...")
    # The 'word_timestamps=True' flag is critical for precise lip-syncing later
    result = model.transcribe(temp_video_path, word_timestamps=True)

    # Clean up the temp file
    os.remove(temp_video_path)

    print("Transcription complete.")
    
    # We return the raw segments, which include start/end times and the text
    return {
        "text": result["text"],
        "segments": result["segments"]
    }

# 4. Local Testing Entrypoint
@app.local_entrypoint()
def main(test_url: str = "https://www.w3schools.com/html/mov_bbb.mp4"):
    """
    Run this locally using: modal run ml/app_whisper.py --test-url <YOUR_URL>
    """
    print("Triggering Modal transcription job...")
    transcription_data = transcribe_video.remote(test_url)
    
    print("\n--- Final Output ---")
    for segment in transcription_data["segments"]:
        print(f"[{segment['start']:.2f}s - {segment['end']:.2f}s]: {segment['text']}")