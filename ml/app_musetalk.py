import modal
import os

# 1. Define the Modal App
app = modal.App("redub-musetalk")

# 2. Persistent volumes shared across all pipeline apps
model_vol = modal.Volume.from_name("redub-model-weights", create_if_missing=True)
pipeline_vol = modal.Volume.from_name("redub-pipeline", create_if_missing=True)

# 3. Build the custom Docker image (no weight baking — lazy load at runtime)
musetalk_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(
        "ffmpeg", "git", "wget",
        "libgl1-mesa-glx", "libglib2.0-0",  # OpenCV
    )
    .run_commands(
        # PyTorch 2.0.1 + CUDA 11.8 (MuseTalk's tested env)
        "pip install torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 "
        "--index-url https://download.pytorch.org/whl/cu118",
        # MuseTalk's pinned dependencies
        "pip install diffusers==0.30.2 accelerate==0.28.0 numpy==1.23.5 "
        "tensorflow==2.12.0 tensorboard==2.12.0 opencv-python==4.9.0.80 "
        "soundfile==0.12.1 transformers==4.39.2 huggingface_hub==0.30.2 "
        "librosa==0.11.0 einops==0.8.1 omegaconf ffmpeg-python moviepy "
        "imageio[ffmpeg] gdown requests pyyaml",
        # mmpose stack (builds C extensions — must be in image, not cold start)
        "pip install -U openmim",
        "mim install mmengine",
        'mim install "mmcv==2.0.1"',
        'mim install "mmdet==3.1.0"',
        'mim install "mmpose==1.1.0"',
    )
)

MUSETALK_DIR = "/models/musetalk_repo"
MUSETALK_SENTINEL = f"{MUSETALK_DIR}/scripts/inference.py"


# 4. Define the GPU Function
# A10G is sufficient — MuseTalk is lighter than LatentSync's diffusion pipeline.
@app.function(
    image=musetalk_image,
    gpu="H200",
    timeout=1800,
    volumes={"/models": model_vol, "/pipeline": pipeline_vol}
)
def sync_lip_movements(job_id: str) -> bytes:
    import subprocess
    import tempfile
    import glob
    import shutil

    if not os.path.exists(MUSETALK_SENTINEL):
        print("Cold start: cloning MuseTalk repo and downloading weights to volume...")

        # Clean up any partial clone
        if os.path.exists(MUSETALK_DIR):
            shutil.rmtree(MUSETALK_DIR)

        subprocess.run(
            ["git", "clone", "https://github.com/TMElyralab/MuseTalk.git", MUSETALK_DIR],
            check=True
        )

        from huggingface_hub import hf_hub_download, snapshot_download
        import requests

        models_dir = f"{MUSETALK_DIR}/models"
        os.makedirs(models_dir, exist_ok=True)

        # MuseTalk V1.5 UNet
        musetalk_dir = f"{models_dir}/musetalkV15"
        os.makedirs(musetalk_dir, exist_ok=True)
        hf_hub_download(
            repo_id="TMElyralab/MuseTalk",
            filename="musetalkV15/unet.pth",
            local_dir=models_dir,
        )
        hf_hub_download(
            repo_id="TMElyralab/MuseTalk",
            filename="musetalkV15/musetalk.json",
            local_dir=models_dir,
        )

        # Stable Diffusion VAE
        sd_vae_dir = f"{models_dir}/sd-vae"
        snapshot_download(
            repo_id="stabilityai/sd-vae-ft-mse",
            local_dir=sd_vae_dir,
            ignore_patterns=["*.md", ".git*"],
        )

        # Whisper tiny
        whisper_dir = f"{models_dir}/whisper"
        snapshot_download(
            repo_id="openai/whisper-tiny",
            local_dir=whisper_dir,
            ignore_patterns=["*.md", ".git*", "flax_model*", "tf_model*", "rust_model*"],
        )

        # DWPose
        dwpose_dir = f"{models_dir}/dwpose"
        os.makedirs(dwpose_dir, exist_ok=True)
        hf_hub_download(
            repo_id="yzd-v/DWPose",
            filename="dw-ll_ucoco_384.pth",
            local_dir=dwpose_dir,
        )

        # SyncNet (from LatentSync repo, reused by MuseTalk for audio-visual sync scoring)
        syncnet_dir = f"{models_dir}/syncnet"
        os.makedirs(syncnet_dir, exist_ok=True)
        hf_hub_download(
            repo_id="ByteDance/LatentSync",
            filename="latentsync_syncnet.pt",
            local_dir=syncnet_dir,
        )

        # face-parse-bisent (Google Drive)
        face_parse_dir = f"{models_dir}/face-parse-bisent"
        os.makedirs(face_parse_dir, exist_ok=True)
        import gdown
        gdown.download(
            id="154JgKpzCPW82qINcVieuPH3fZ2e0P812",
            output=f"{face_parse_dir}/79999_iter.pth",
            quiet=False,
        )

        # resnet18 backbone (required by face-parse-bisent)
        resnet_path = f"{face_parse_dir}/resnet18-5c106cde.pth"
        r = requests.get(
            "https://download.pytorch.org/models/resnet18-5c106cde.pth",
            stream=True,
            timeout=120,
        )
        r.raise_for_status()
        with open(resnet_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)

        model_vol.commit()
        print("MuseTalk weights cached to volume.")
    else:
        print("MuseTalk repo and weights found on volume.")

    source_video_path = f"/pipeline/{job_id}/source.mp4"
    dubbed_audio_path = f"/pipeline/{job_id}/dubbed_audio.wav"

    # Verify inputs exist
    for path, label in [(source_video_path, "source video"), (dubbed_audio_path, "dubbed audio")]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"{label} not found at {path}")

    # MuseTalk's whisper feature extractor runs at an effective ~50 fps equivalent,
    # so high-fps inputs (e.g. 60fps) cause the audio window index to exceed the
    # whisper feature length on the last frames, producing a shape mismatch inside
    # the script.  Re-encode to 25fps (MuseTalk's expected frame rate) before
    # inference; the dubbed_audio.wav is passed separately so no audio re-encode needed.
    reencoded_video_path = tempfile.mktemp(suffix=".mp4")
    reencode_cmd = [
        "ffmpeg", "-y",
        "-i", source_video_path,
        "-vf", "fps=25",
        "-c:v", "libx264", "-crf", "18", "-preset", "fast",
        "-an",  # strip audio — we supply dubbed_audio.wav separately
        reencoded_video_path,
    ]
    subprocess.run(reencode_cmd, check=True)
    print(f"Re-encoded source video to 25fps: {reencoded_video_path}")

    print("Running MuseTalk lip-sync inference...")

    # MuseTalk uses a YAML inference config rather than direct CLI args
    import yaml

    config = {
        "task_0": {
            "video_path": reencoded_video_path,
            "audio_path": dubbed_audio_path,
        }
    }
    config_path = tempfile.mktemp(suffix=".yaml")
    with open(config_path, "w") as f:
        yaml.dump(config, f)

    result_dir = tempfile.mkdtemp()

    command = [
        "python", "-m", "scripts.inference",
        "--inference_config", config_path,
        "--result_dir", result_dir,
        "--unet_model_path", "models/musetalkV15/unet.pth",
        "--unet_config", "models/musetalkV15/musetalk.json",
        "--version", "v15",
    ]

    # Capture stderr so the full MuseTalk traceback is visible when it exits 0
    # despite an internal error (its exception handler swallows the exit code).
    result = subprocess.run(command, cwd=MUSETALK_DIR, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    if result.returncode != 0:
        raise RuntimeError(f"MuseTalk exited with code {result.returncode}")

    output_files = glob.glob(f"{result_dir}/**/*.mp4", recursive=True)
    if not output_files:
        raise RuntimeError(
            "MuseTalk produced no output video. Check the STDERR above for the internal error."
        )
    output_video_path = output_files[0]

    with open(output_video_path, "rb") as out_file:
        final_video_bytes = out_file.read()

    # Cleanup temp files
    os.remove(config_path)
    os.remove(reencoded_video_path)

    print("MuseTalk lip-syncing complete.")
    return final_video_bytes


# 5. Local Entrypoint
@app.local_entrypoint()
def main(job_id: str = "test-123"):
    """
    Usage:

      # Run with real pipeline inputs:
      modal run ml/app_musetalk.py --job-id <JOB_ID>

    Prerequisites — upload inputs to the volume first:
      modal volume put redub-pipeline /path/to/video.mp4 {job_id}/source.mp4
      modal volume put redub-pipeline /path/to/audio.wav {job_id}/dubbed_audio.wav
    """
    print(f"Triggering MuseTalk lip-sync for job_id={job_id}...")
    final_video_bytes = sync_lip_movements.remote(job_id)

    output_dir = os.path.join(os.path.dirname(__file__), "tmp")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{job_id}_musetalk_output.mp4")
    with open(output_path, "wb") as f:
        f.write(final_video_bytes)

    print(f"Success! Output saved to {output_path} ({len(final_video_bytes) / (1024 * 1024):.2f} MB)")
