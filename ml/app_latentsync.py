import modal
import os

# 1. Define the Modal App
app = modal.App("redub-latentsync")

# 2. Define the Modern Environment and Cache the Diffusion Weights
def setup_latentsync():
    import subprocess
    from huggingface_hub import snapshot_download
    
    # Clone the official ByteDance LatentSync repository
    subprocess.run(["git", "clone", "https://github.com/bytedance/LatentSync.git", "/LatentSync"], check=True)
    
    print("Downloading LatentSync Diffusion Weights from HuggingFace...")
    # This downloads the U-Net, Whisper, and SyncNet checkpoints needed for inference
    snapshot_download(
        repo_id="ByteDance/LatentSync", 
        local_dir="/LatentSync/checkpoints",
        ignore_patterns=["*.md", ".git*"]
    )

latentsync_image = (
    # We upgrade to Python 3.10 to support modern diffusers
    modal.Image.debian_slim(python_version="3.10") 
    .apt_install("ffmpeg", "git", "libsm6", "libxext6") 
    .pip_install(
        "torch>=2.0.0", # Upgrading from 1.13 to modern PyTorch
        "torchvision",
        "diffusers",
        "transformers",
        "accelerate",
        "huggingface_hub",
        "opencv-python",
        "omegaconf",
        "librosa"
    )
    .run_function(setup_latentsync)
)

# 3. Define the Heavy GPU Function
# We must use an A100 (or equivalent high-VRAM GPU). LatentSync will crash a standard T4 or A10G.
@app.function(image=latentsync_image, gpu="A100", timeout=1800) 
def sync_lip_movements(video_url: str, new_audio_bytes: bytes):
    import tempfile
    import requests
    import subprocess
    import os

    print(f"Downloading source video from {video_url}...")
    
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_video:
        response = requests.get(video_url, stream=True)
        response.raise_for_status()
        for chunk in response.iter_content(chunk_size=8192):
            temp_video.write(chunk)
        temp_video_path = temp_video.name

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
        temp_audio.write(new_audio_bytes)
        temp_audio_path = temp_audio.name

    output_video_path = tempfile.mktemp(suffix=".mp4")

    print("Running LatentSync Diffusion inference...")
    
    # We call the LatentSync inference script. 
    # Diffusion models take 'steps' and a 'guidance scale'. 
    # More steps = better quality but slower rendering.
    command = [
        "python", "/LatentSync/inference.py",
        "--video_path", temp_video_path,
        "--audio_path", temp_audio_path,
        "--video_out_path", output_video_path,
        "--inference_steps", "20",   # 20 is a good balance for speed/quality
        "--guidance_scale", "1.5",   # How strictly the lips follow the audio
        "--seed", "42"               # Lock the seed to prevent random flickering
    ]
    
    # Change working directory so LatentSync can find its internal relative paths
    try:
        subprocess.run(command, cwd="/LatentSync", check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        print(f"LatentSync Error: {e.stderr}")
        raise e

    with open(output_video_path, "rb") as out_file:
        final_video_bytes = out_file.read()

    os.remove(temp_video_path)
    os.remove(temp_audio_path)
    os.remove(output_video_path)

    print("Diffusion Lip-syncing complete.")
    return final_video_bytes