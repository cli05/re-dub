import modal
import os

# 1. Define the Modal App
app = modal.App("redub-wav2lip")

# 2. Define the Environment and Cache Weights
def setup_wav2lip():
    """
    Clones the original repository and downloads both the GAN weights 
    and the required face detection weights during the build step.
    """
    import subprocess
    import urllib.request
    import os

    # Clone the official Wav2Lip repository
    subprocess.run(["git", "clone", "https://github.com/Rudrabha/Wav2Lip.git", "/Wav2Lip"], check=True)
    
    # Create necessary directories
    os.makedirs("/Wav2Lip/checkpoints", exist_ok=True)
    os.makedirs("/Wav2Lip/face_detection/detection/sfd", exist_ok=True)

    print("Downloading Wav2Lip GAN weights...")
    # Using a Hugging Face mirror to bypass Google Drive quota limits
    gan_url = "https://huggingface.co/camenduru/Wav2Lip/resolve/main/checkpoints/wav2lip_gan.pth"
    urllib.request.urlretrieve(gan_url, "/Wav2Lip/checkpoints/wav2lip_gan.pth")

    print("Downloading Face Detection (s3fd) weights...")
    s3fd_url = "https://huggingface.co/camenduru/Wav2Lip/resolve/main/checkpoints/s3fd.pth"
    urllib.request.urlretrieve(s3fd_url, "/Wav2Lip/face_detection/detection/sfd/s3fd.pth")

wav2lip_image = (
    # Using an older Python version (3.9) to maintain compatibility with older libraries
    modal.Image.debian_slim(python_version="3.9") 
    .apt_install("ffmpeg", "git", "libsm6", "libxext6") # cv2 OS dependencies
    .pip_install(
        "torch==1.13.1", # Pinning older PyTorch
        "torchvision==0.14.1",
        "librosa==0.9.2", # Crucial: Wav2Lip breaks on librosa >= 0.10
        "numpy==1.23.5",
        "opencv-python",
        "tqdm",
        "scipy"
    )
    .run_function(setup_wav2lip)
)

# 3. Define the Serverless GPU Function
@app.function(image=wav2lip_image, gpu="A10G", timeout=1200) # Increased timeout for video rendering
def sync_lip_movements(video_url: str, new_audio_bytes: bytes):
    import tempfile
    import requests
    import subprocess
    import os

    print(f"Downloading source video from {video_url}...")
    
    # 1. Save original video to disk
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video:
        response = requests.get(video_url, stream=True)
        response.raise_for_status()
        for chunk in response.iter_content(chunk_size=8192):
            temp_video.write(chunk)
        temp_video_path = temp_video.name

    # 2. Save the new generated audio to disk
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
        temp_audio.write(new_audio_bytes)
        temp_audio_path = temp_audio.name

    output_video_path = tempfile.mktemp(suffix=".mp4")

    print("Running Wav2Lip GAN inference...")
    
    # 3. Execute the Wav2Lip inference script via subprocess
    # We use a subprocess here because importing Wav2Lip directly into a modern 
    # Python script often causes namespace and pathing issues.
    command = [
        "python", "/Wav2Lip/inference.py",
        "--checkpoint_path", "/Wav2Lip/checkpoints/wav2lip_gan.pth",
        "--face", temp_video_path,
        "--audio", temp_audio_path,
        "--outfile", output_video_path,
        "--pads", "0", "20", "0", "0" # Padding [top, bottom, left, right] helps with chin morphing
    ]
    
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        print(f"Wav2Lip Error: {e.stderr}")
        raise e

    # 4. Read the final dubbed video into memory
    with open(output_video_path, "rb") as out_file:
        final_video_bytes = out_file.read()

    # Clean up temp files
    os.remove(temp_video_path)
    os.remove(temp_audio_path)
    os.remove(output_video_path)

    print("Lip-syncing complete.")
    return final_video_bytes

# 4. Local Testing Entrypoint
@app.local_entrypoint()
def main():
    """
    Run this locally using: modal run ml/app_wav2lip.py
    """
    # Note: To fully test this, you need a matching audio and video pair.
    # We will use dummy URLs here just to show the structure.
    test_video_url = "https://www.w3schools.com/html/mov_bbb.mp4"
    
    # In a real test, you would load the bytes from your XTTS output here.
    # For now, we will create a dummy bytes object just to fail gracefully at the audio step
    # or you can load a local .wav file: with open("test_dubbed_output.wav", "rb") as f: dummy_audio = f.read()
    dummy_audio_bytes = b"..." 

    print("Triggering Modal Wav2Lip job...")
    try:
        result_bytes = sync_lip_movements.remote(test_video_url, dummy_audio_bytes)
        
        output_filename = "final_dubbed_video.mp4"
        with open(output_filename, "wb") as f:
            f.write(result_bytes)
        
        print(f"\nSuccess! Check out your fully dubbed video: {output_filename}")
    except Exception as e:
        print(f"Test failed (likely due to dummy audio not being valid): {e}")