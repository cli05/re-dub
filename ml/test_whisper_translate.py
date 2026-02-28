"""
Test script: chains Whisper transcription → Groq translation.

Usage:
    modal run ml/test_whisper_translate.py --job-id test-123 --target-language Spanish

Requires:
    - app_whisper and app_translate deployed via `modal deploy`
    - source.mp4 uploaded to the pipeline volume at /pipeline/{job_id}/source.mp4
    - groq-secret Modal secret to be set
"""
import modal

app = modal.App("redub-test-whisper-translate")

@app.local_entrypoint()
def main(job_id: str = "test-123", target_language: str = "Spanish"):
    whisper_func = modal.Function.from_name("redub-whisper", "transcribe_video")
    translate_func = modal.Function.from_name("redub-translate", "translate_text")

    print(f"=== Step 1: Transcribing (job_id={job_id}) ===")
    transcription = whisper_func.remote(job_id)

    print(f"\nFull transcript: {transcription['text'][:200]}...")
    print(f"Segments: {len(transcription['segments'])}")

    print(f"\n=== Step 2: Translating to {target_language} ===")
    translated_segments = translate_func.remote(
        segments=transcription["segments"],
        target_language=target_language,
        glossary={}
    )

    print("\n--- Results ---")
    for seg in translated_segments:
        print(f"[{seg['start']:.2f}s - {seg['end']:.2f}s]")
        print(f"  EN: {seg['original_text'].strip()}")
        print(f"  {target_language[:2].upper()}: {seg['translated_text'].strip()}")