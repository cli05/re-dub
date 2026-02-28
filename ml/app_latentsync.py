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
    .apt_install("ffmpeg", "git", "libsm6", "libxext6")
    .pip_install(
        "torch>=2.0.0",
        "torchvision",
        "diffusers",
        "transformers",
        "accelerate",
        "huggingface_hub",
        "opencv-python",
        "omegaconf",
        "librosa"
    )
)

# 4. Define the Heavy GPU Function
# Must use A100 — LatentSync will OOM on T4 or A10G.
@app.function(
    image=latentsync_image,
    gpu="A100",
    timeout=1800,
    volumes={"/models": model_vol, "/pipeline": pipeline_vol}
)
def sync_lip_movements(job_id: str):
    import subprocess
    import tempfile

    LATENTSYNC_DIR = "/models/latentsync"
    LATENTSYNC_SENTINEL = f"{LATENTSYNC_DIR}/checkpoints"

    if not os.path.exists(LATENTSYNC_SENTINEL):
        print("Cold start: cloning LatentSync repo and downloading checkpoints to volume...")
        subprocess.run(
            ["git", "clone", "https://github.com/bytedance/LatentSync.git", LATENTSYNC_DIR],
            check=True
        )
        from huggingface_hub import snapshot_download
        snapshot_download(
            repo_id="ByteDance/LatentSync",
            local_dir=LATENTSYNC_SENTINEL,
            ignore_patterns=["*.md", ".git*"]
        )
        model_vol.commit()
        print("LatentSync weights cached to volume.")

    source_video_path = f"/pipeline/{job_id}/source.mp4"
    dubbed_audio_path = f"/pipeline/{job_id}/dubbed_audio.wav"
    output_video_path = tempfile.mktemp(suffix=".mp4")

    print("Running LatentSync diffusion inference...")

    command = [
        "python", f"{LATENTSYNC_DIR}/inference.py",
        "--video_path", source_video_path,
        "--audio_path", dubbed_audio_path,
        "--video_out_path", output_video_path,
        "--inference_steps", "20",
        "--guidance_scale", "1.5",
        "--seed", "42"
    ]

    try:
        # cwd must be the repo root so LatentSync's relative imports resolve correctly
        subprocess.run(command, cwd=LATENTSYNC_DIR, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        print(f"LatentSync Error: {e.stderr}")
        raise e

    with open(output_video_path, "rb") as out_file:
        final_video_bytes = out_file.read()

    os.remove(output_video_path)

    print("Diffusion lip-syncing complete.")
    return final_video_bytes
