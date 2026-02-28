import modal
import os

# 1. Define the Modal App
app = modal.App("redub-latentsync")

# 2. Persistent volumes shared across all pipeline apps
model_vol = modal.Volume.from_name("redub-model-weights", create_if_missing=True)
pipeline_vol = modal.Volume.from_name("redub-pipeline", create_if_missing=True)

# 3. Build the custom Docker image (no weight baking — lazy load at runtime)
latentsync_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("ffmpeg", "git", "libsm6", "libxext6", "libgl1")
    .pip_install(
        "torch==2.5.1",
        "torchvision==0.20.1",
        index_url="https://download.pytorch.org/whl/cu121",
    )
    .pip_install(
        "diffusers==0.32.2",
        "transformers==4.48.0",
        "decord==0.6.0",
        "accelerate==0.26.1",
        "einops==0.7.0",
        "omegaconf==2.3.0",
        "opencv-python==4.9.0.80",
        "mediapipe==0.10.11",
        "python_speech_features==0.6",
        "librosa==0.10.1",
        "scenedetect==0.6.1",
        "ffmpeg-python==0.2.0",
        "imageio==2.31.1",
        "imageio-ffmpeg==0.5.1",
        "lpips==0.1.4",
        "face-alignment==1.4.1",
        "huggingface-hub[hf_xet]>=0.30.0",
        "numpy==1.26.4",
        "kornia==0.8.0",
        "insightface==0.7.3",
        "onnxruntime-gpu==1.21.0",
        "DeepCache==0.1.1",
        "safetensors",
        "av",
    )
)

# 4. Define the Heavy GPU Function
# Must use H100 — LatentSync will OOM on T4 or A10G.
@app.function(
    image=latentsync_image,
    gpu="H200",
    timeout=1800,
    volumes={"/models": model_vol, "/pipeline": pipeline_vol}
)
def sync_lip_movements(job_id: str):
    import subprocess
    import tempfile

    # LATENTSYNC_DIR = "/models/latentsync"
    # LATENTSYNC_SENTINEL = f"{LATENTSYNC_DIR}/inference.py"
    # CHECKPOINTS_DIR = f"{LATENTSYNC_DIR}/checkpoints"

    # if not os.path.exists(LATENTSYNC_SENTINEL):
    #     print("Cold start: cloning LatentSync repo and downloading checkpoints to volume...")
    #     subprocess.run(
    #         ["git", "clone", "https://github.com/bytedance/LatentSync.git", LATENTSYNC_DIR],
    #         check=True
    #     )
    #     from huggingface_hub import snapshot_download
    #     snapshot_download(
    #         repo_id="ByteDance/LatentSync",
    #         local_dir=LATENTSYNC_SENTINEL,
    #         ignore_patterns=["*.md", ".git*"]
    #     )
    #     model_vol.commit()
    #     print("LatentSync weights cached to volume.")

    # source_video_path = f"/pipeline/{job_id}/source.mp4"
    # dubbed_audio_path = f"/pipeline/{job_id}/dubbed_audio.wav"
    # output_video_path = tempfile.mktemp(suffix=".mp4")

    # print("Running LatentSync diffusion inference...")

    LATENTSYNC_DIR = "/models/latentsync"
    LATENTSYNC_SCRIPT = f"{LATENTSYNC_DIR}/scripts/inference.py"

    if not os.path.exists(LATENTSYNC_SCRIPT):
        print("Cold start: cloning LatentSync repo and downloading checkpoints to volume...")
        # Clean up any partial clone
        if os.path.exists(LATENTSYNC_DIR):
            import shutil
            shutil.rmtree(LATENTSYNC_DIR)

        subprocess.run(
            ["git", "clone", "https://github.com/bytedance/LatentSync.git", LATENTSYNC_DIR],
            check=True
        )
        from huggingface_hub import snapshot_download
        snapshot_download(
            repo_id="ByteDance/LatentSync-1.6",
            local_dir=f"{LATENTSYNC_DIR}/checkpoints",
            ignore_patterns=["*.md", ".git*"]
        )
        model_vol.commit()
        print("LatentSync weights cached to volume.")
    else:
        print("LatentSync repo and weights found on volume.")

    source_video_path = f"/pipeline/{job_id}/source.mp4"
    dubbed_audio_path = f"/pipeline/{job_id}/dubbed_audio.wav"
    output_video_path = tempfile.mktemp(suffix=".mp4")

    # Verify inputs exist
    for path, label in [(source_video_path, "source video"), (dubbed_audio_path, "dubbed audio")]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"{label} not found at {path}")

    print("Running LatentSync diffusion inference...")

    command = [
        "python", f"{LATENTSYNC_SCRIPT}",
        "--unet_config_path", f"{LATENTSYNC_DIR}/configs/unet/stage2.yaml",
        "--inference_ckpt_path", f"{LATENTSYNC_DIR}/checkpoints/latentsync_unet.pt",
        "--video_path", source_video_path,
        "--audio_path", dubbed_audio_path,
        "--video_out_path", output_video_path,
        "--inference_steps", "50",
        "--guidance_scale", "1.5",
        "--seed", "42"
    ]

    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = LATENTSYNC_DIR + (":" + env["PYTHONPATH"] if "PYTHONPATH" in env else "")
        # cwd must be the repo root so LatentSync's relative imports resolve correctly
        subprocess.run(command, cwd=LATENTSYNC_DIR, check=True, capture_output=True, text=True, env=env)
    except subprocess.CalledProcessError as e:
        print(f"LatentSync Error: {e.stderr}")
        raise e

    with open(output_video_path, "rb") as out_file:
        final_video_bytes = out_file.read()

    os.remove(output_video_path)

    print("Diffusion lip-syncing complete.")
    return final_video_bytes
