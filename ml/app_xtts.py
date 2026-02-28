import modal
import os

# 1. Define the Modal App
app = modal.App("redub-xtts")

# 2. Define the Environment and Cache Weights
def download_xtts_weights():
    """
    Downloads the XTTS v2 model weights into the Docker image.
    This model is roughly 2.5GB. Caching it saves massive boot time.
    """
    import os
    # Suppress TTS telemetry prompt during build
    os.environ["COQUI_TOS_AGREED"] = "1" 
    from TTS.api import TTS
    
    # Downloading the specific multilingual model
    TTS("tts_models/multilingual/multi-dataset/xtts_v2")

xtts_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "TTS==0.22.0", # Pinning the version for stability
        "torch",
        "torchaudio"
    )
    .run_function(download_xtts_weights)
)

# 3. Define the Serverless GPU Function
@app.function(image=xtts_image, gpu="A10G", timeout=600)
def generate_dubbed_audio(text: str, target_language: str, speaker_reference_bytes: bytes):
    import tempfile
    import os
    from TTS.api import TTS

    print(f"Loading XTTS v2 for language '{target_language}'...")
    os.environ["COQUI_TOS_AGREED"] = "1"
    
    # Load model (Fast because of our build step)
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")

    # We need to temporarily save the speaker reference bytes to disk 
    # because the TTS library expects a file path.
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as ref_file:
        ref_file.write(speaker_reference_bytes)
        ref_path = ref_file.name

    output_wav_path = tempfile.mktemp(suffix=".wav")

    print(f"Cloning voice and generating audio for text: '{text[:30]}...'")
    
    # Run the zero-shot inference
    # Language codes for XTTS are usually 2 letters (e.g., 'es' for Spanish, 'fr' for French)
    tts.tts_to_file(
        text=text,
        speaker_wav=ref_path,
        language=target_language.lower(), 
        file_path=output_wav_path
    )

    # Read the generated audio back into memory to return it
    with open(output_wav_path, "rb") as out_file:
        generated_audio_bytes = out_file.read()

    # Clean up temp files
    os.remove(ref_path)
    os.remove(output_wav_path)

    print("Audio generation complete.")
    return generated_audio_bytes

# 4. Local Testing Entrypoint
@app.local_entrypoint()
def main():
    """
    Run this locally using: modal run ml/app_xtts.py
    """
    import urllib.request
    
    # 1. Download a quick sample voice (e.g., a random public domain voice clip)
    sample_audio_url = "https://www.w3schools.com/html/horse.ogg" # Just for testing execution
    print("Fetching sample speaker reference...")
    req = urllib.request.Request(sample_audio_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        speaker_bytes = response.read()

    # 2. Define the text to translate
    test_text = "Bienvenidos a este tutorial. Hoy vamos a aprender sobre componentes de React."
    target_lang = "es" # XTTS expects standard ISO codes

    # 3. Trigger Modal
    print("Triggering Modal voice cloning job...")
    result_bytes = generate_dubbed_audio.remote(
        text=test_text, 
        target_language=target_lang, 
        speaker_reference_bytes=speaker_bytes
    )

    # 4. Save the result locally to verify
    output_filename = "test_dubbed_output.wav"
    with open(output_filename, "wb") as f:
        f.write(result_bytes)
    
    print(f"\nSuccess! Listen to your cloned audio: {output_filename}")