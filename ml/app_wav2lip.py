import modal
import os

# 1. Define the Modal App
app = modal.App("redub-wav2lip")

# 2. Persistent volumes shared across all pipeline apps
model_vol = modal.Volume.from_name("redub-model-weights", create_if_missing=True)
pipeline_vol = modal.Volume.from_name("redub-pipeline", create_if_missing=True)

# 3. Build the custom Docker image
# Wav2Lip uses older deps, but we pin to versions that work on Python 3.10 + modern CUDA.
wav2lip_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("ffmpeg", "git", "libsm6", "libxext6", "libgl1")
    .pip_install(
        "torch==2.1.2",
        "torchvision==0.16.2",
        index_url="https://download.pytorch.org/whl/cu121",
    )
    .pip_install(
        "librosa==0.9.2",
        "numpy==1.23.5",
        "opencv-python==4.9.0.80",
        "scipy==1.11.4",
        "tqdm==4.66.1",
        "numba==0.58.1",
        "gdown>=5.1.0",
    )
)

# Google Drive checkpoint links
# The wav2lip_gan.pth (415.6 MB) has a known single-file ID that downloads reliably.
# The NOGAN variants are in a folder that Google Drive blocks from server downloads.
# We use wav2lip_gan.pth (file ID from the main Wav2Lip folder) and handle the
# TorchScript format via the inference.py patch below.
#
# To switch to NOGAN, manually upload Wav2Lip-SD-NOGAN.pt to the volume and
# update WAV2LIP_CKPT_FILENAME.
WAV2LIP_CKPT_GDRIVE_URL = "https://drive.google.com/uc?id=15G3U08c8xsCkOqQxE38Z2XXDnPcOptNk"
WAV2LIP_CKPT_FILENAME = "wav2lip_gan.pth"

# The s3fd face detection model is auto-downloaded by the repo code from:
# https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth
# but we also pre-download it to avoid cold-start issues.
S3FD_URL = "https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth"


# 4. Define the GPU Function
# Wav2Lip is much lighter than LatentSync — A10G or even T4 is sufficient.
@app.function(
    image=wav2lip_image,
    gpu="H100",
    timeout=1800,
    volumes={"/models": model_vol, "/pipeline": pipeline_vol},
)
def sync_lip_movements(job_id: str):
    import subprocess
    import tempfile
    import gdown

    WAV2LIP_DIR = "/models/wav2lip"
    WAV2LIP_SCRIPT = f"{WAV2LIP_DIR}/inference.py"
    CHECKPOINTS_DIR = f"{WAV2LIP_DIR}/checkpoints"
    S3FD_PATH = f"{WAV2LIP_DIR}/face_detection/detection/sfd/s3fd.pth"

    # ── Cold start: clone repo + download weights ─────────────────
    if not os.path.exists(WAV2LIP_SCRIPT):
        print("Cold start: cloning Wav2Lip repo and downloading checkpoints to volume...")

        # Clean up any partial clone
        if os.path.exists(WAV2LIP_DIR):
            import shutil
            shutil.rmtree(WAV2LIP_DIR)

        subprocess.run(
            ["git", "clone", "https://github.com/Rudrabha/Wav2Lip.git", WAV2LIP_DIR],
            check=True,
        )

        # Download Wav2Lip checkpoint from Google Drive
        os.makedirs(CHECKPOINTS_DIR, exist_ok=True)
        wav2lip_ckpt_path = f"{CHECKPOINTS_DIR}/{WAV2LIP_CKPT_FILENAME}"

        print(f"Downloading {WAV2LIP_CKPT_FILENAME} from Google Drive...")
        gdown.download(
            url=WAV2LIP_CKPT_GDRIVE_URL,
            output=wav2lip_ckpt_path,
            quiet=False,
            fuzzy=True,
        )

        if not os.path.exists(wav2lip_ckpt_path) or os.path.getsize(wav2lip_ckpt_path) < 1_000_000:
            raise RuntimeError(
                f"Failed to download {WAV2LIP_CKPT_FILENAME} "
                f"(size={os.path.getsize(wav2lip_ckpt_path) if os.path.exists(wav2lip_ckpt_path) else 0}). "
                "Google Drive may be rate-limiting. Try again or download manually."
            )

        # Download s3fd face detection model
        print("Downloading s3fd face detection model...")
        s3fd_dir = os.path.dirname(S3FD_PATH)
        os.makedirs(s3fd_dir, exist_ok=True)
        import urllib.request
        urllib.request.urlretrieve(S3FD_URL, S3FD_PATH)

        # Patch inference.py: modern PyTorch + the GAN checkpoint may load as
        # a TorchScript ScriptModule instead of a plain state_dict.  We replace
        # the _load / load_model functions so they handle both cases.
        print("Patching inference.py for PyTorch 2.x compatibility...")
        inference_path = f"{WAV2LIP_DIR}/inference.py"
        with open(inference_path, "r") as f:
            src = f.read()

        old_load = '''def _load(checkpoint_path):
\tif device == 'cuda':
\t\tcheckpoint = torch.load(checkpoint_path)
\telse:
\t\tcheckpoint = torch.load(checkpoint_path,
\t\t\t\t\t\t\t\tmap_location=lambda storage, loc: storage)
\treturn checkpoint

def load_model(path):
\tmodel = Wav2Lip()
\tprint("Load checkpoint from: {}".format(path))
\tcheckpoint = _load(path)
\ts = checkpoint["state_dict"]
\tnew_s = {}
\tfor k, v in s.items():
\t\tnew_s[k.replace('module.', '')] = v
\tmodel.load_state_dict(new_s)

\tmodel = model.to(device)
\treturn model.eval()'''

        new_load = '''def _load(checkpoint_path):
\tmap_loc = device if device == 'cuda' else 'cpu'
\treturn torch.load(checkpoint_path, map_location=map_loc, weights_only=False)

def load_model(path):
\tprint("Load checkpoint from: {}".format(path))
\tcheckpoint = _load(path)
\t# Handle TorchScript (JIT) models — returned as ScriptModule, not dict
\tif isinstance(checkpoint, torch.jit.ScriptModule):
\t\tprint("Detected TorchScript checkpoint — using directly.")
\t\treturn checkpoint.to(device).eval()
\tmodel = Wav2Lip()
\ts = checkpoint["state_dict"]
\tnew_s = {}
\tfor k, v in s.items():
\t\tnew_s[k.replace('module.', '')] = v
\tmodel.load_state_dict(new_s)
\tmodel = model.to(device)
\treturn model.eval()'''

        if old_load in src:
            src = src.replace(old_load, new_load)
            with open(inference_path, "w") as f:
                f.write(src)
            print("  ✓ inference.py patched successfully.")
        else:
            print("  ⚠ Could not find expected code block to patch — skipping.")

        model_vol.commit()
        print("Wav2Lip weights cached to volume.")
    else:
        print("Wav2Lip repo and weights found on volume.")

    # Debug: verify checkpoint files
    for f in os.listdir(CHECKPOINTS_DIR):
        filepath = os.path.join(CHECKPOINTS_DIR, f)
        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        print(f"  Checkpoint: {f} ({size_mb:.1f} MB)")

    # ── Prepare inputs ────────────────────────────────────────────
    source_video_path = f"/pipeline/{job_id}/source.mp4"
    dubbed_audio_path = f"/pipeline/{job_id}/dubbed_audio.wav"
    output_video_path = tempfile.mktemp(suffix=".mp4")

    # Verify inputs exist
    for path, label in [(source_video_path, "source video"), (dubbed_audio_path, "dubbed audio")]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"{label} not found at {path}")

    # ── Run Wav2Lip inference ─────────────────────────────────────
    print("Running Wav2Lip inference...")

    # Wav2Lip CLI:
    #   python inference.py --checkpoint_path <ckpt> --face <video> --audio <audio> --outfile <out>
    #
    # Additional flags for better results:
    #   --pads 0 20 0 0       → include chin region
    #   --resize_factor 1     → keep original resolution
    #   --wav2lip_batch_size  → batching for speed
    command = [
        "python", WAV2LIP_SCRIPT,
        "--checkpoint_path", f"{CHECKPOINTS_DIR}/{WAV2LIP_CKPT_FILENAME}",
        "--face", source_video_path,
        "--audio", dubbed_audio_path,
        "--outfile", output_video_path,
        "--pads", "0", "20", "0", "0",
        "--resize_factor", "1",
        "--wav2lip_batch_size", "128",
        "--nosmooth",
    ]

    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = WAV2LIP_DIR + (":" + env.get("PYTHONPATH", ""))
        result = subprocess.run(
            command,
            cwd=WAV2LIP_DIR,
            check=True,
            capture_output=True,
            text=True,
            env=env,
        )
        print(f"Wav2Lip stdout:\n{result.stdout}")
        if result.stderr:
            print(f"Wav2Lip stderr:\n{result.stderr}")
    except subprocess.CalledProcessError as e:
        print(f"Wav2Lip stdout: {e.stdout}")
        print(f"Wav2Lip stderr: {e.stderr}")
        raise e

    # ── Read and return result ────────────────────────────────────
    if not os.path.exists(output_video_path):
        raise FileNotFoundError(
            f"Wav2Lip did not produce output at {output_video_path}. "
            "Check stdout/stderr above for errors."
        )

    with open(output_video_path, "rb") as out_file:
        final_video_bytes = out_file.read()

    os.remove(output_video_path)

    print(f"Wav2Lip lip-syncing complete. Output size: {len(final_video_bytes) / (1024 * 1024):.2f} MB")
    return final_video_bytes
