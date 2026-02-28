import modal
import json

# 1. Define the Modal App
app = modal.App("redub-translate")

# 2. Define the Environment — CPU only, no GPU needed
translate_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("groq")
)

# 3. Define the Serverless CPU Function
@app.function(
    image=translate_image,
    secrets=[modal.Secret.from_name("groq-secret")]  # Needs GROQ_API_KEY
)
def translate_text(segments: list, target_language: str, glossary: dict = None):
    from groq import Groq

    client = Groq()  # Picks up GROQ_API_KEY from environment

    glossary_text = ""
    if glossary:
        glossary_text = "Glossary (translate strictly as shown or keep in English):\n"
        for key, value in glossary.items():
            glossary_text += f"- {key}: {value}\n"

    system_prompt = f"""You are an expert video localization translator.
Your target language is {target_language}.

CRITICAL CONSTRAINTS:
1. You will receive a JSON array of spoken text segments.
2. You must translate the text for each segment.
3. You MUST maintain the exact same number of segments.
4. PACING: Try to keep the syllable count of the translation as close to the original as possible so it fits within the same audio duration.
5. Return ONLY a JSON object with a 'translated_segments' key containing an array of strings.

{glossary_text}"""

    original_texts = [seg["text"] for seg in segments]

    print(f"Translating {len(segments)} segments to {target_language} via Groq (llama-3.3-70b-versatile)...")

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps({"segments": original_texts})}
        ],
        temperature=0.3
    )

    result_json = json.loads(response.choices[0].message.content)
    translated_texts = result_json.get("translated_segments", [])

    # Re-map translated text back to original timestamps
    translated_segments = []
    for i, original_seg in enumerate(segments):
        translated_segments.append({
            "start": original_seg["start"],
            "end": original_seg["end"],
            "original_text": original_seg["text"],
            "translated_text": translated_texts[i] if i < len(translated_texts) else ""
        })

    print("Translation complete.")
    return translated_segments

# 4. Local Testing Entrypoint
@app.local_entrypoint()
def main():
    """
    Run this locally using: modal run ml/app_translate.py
    """
    mock_whisper_segments = [
        {"start": 0.0, "end": 2.5, "text": " Welcome back to the tutorial."},
        {"start": 2.5, "end": 5.0, "text": " Today we are learning about React Components."},
        {"start": 5.0, "end": 8.0, "text": " Let's dive right into the code."}
    ]

    tech_glossary = {
        "React Components": "React Components"  # Keep technical term in English
    }

    print("Triggering Modal translation job...")
    result = translate_text.remote(
        segments=mock_whisper_segments,
        target_language="Spanish",
        glossary=tech_glossary
    )

    print("\n--- Final Output ---")
    for seg in result:
        print(f"[{seg['start']}s - {seg['end']}s]")
        print(f"  EN: {seg['original_text']}")
        print(f"  ES: {seg['translated_text']}\n")