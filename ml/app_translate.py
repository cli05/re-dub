import modal
import json
import os

# 1. Define the Modal App
app = modal.App("redub-translate")

# 2. Define the Environment
# No GPU needed here, just the OpenAI SDK.
translate_image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("openai")
)

# 3. Define the Serverless CPU Function
# Notice we are attaching a Modal Secret to securely inject the OpenAI API key.
@app.function(
    image=translate_image, 
    secrets=[modal.Secret.from_name("openai-api-secret")] 
)
def translate_text(segments: list, target_language: str, glossary: dict = None):
    from openai import OpenAI
    
    # Initialize the OpenAI client (it automatically picks up the OPENAI_API_KEY environment variable)
    client = OpenAI()

    # Prepare the glossary context if provided
    glossary_text = ""
    if glossary:
        glossary_text = "Here is a glossary of terms to translate strictly as defined or leave in English:\n"
        for key, value in glossary.items():
            glossary_text += f"- {key}: {value}\n"

    # We construct a prompt that forces the LLM to return a perfectly mapped JSON array
    system_prompt = f"""
    You are an expert video localization translator.
    Your target language is {target_language}.
    
    CRITICAL CONSTRAINTS:
    1. You will receive a JSON array of spoken text segments.
    2. You must translate the text for each segment.
    3. You MUST maintain the exact same number of segments.
    4. PACING: Try to keep the syllable count of the translation as close to the original as possible so it fits within the same audio duration.
    5. Return ONLY a JSON object with a 'translated_segments' key containing an array of strings.
    
    {glossary_text}
    """

    print(f"Translating {len(segments)} segments to {target_language} using GPT-4o...")

    # Extract just the text from the Whisper segments to send to the LLM
    original_texts = [seg["text"] for seg in segments]

    response = client.chat.completions.create(
        model="gpt-4o",
        response_format={ "type": "json_object" },
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps({"segments": original_texts})}
        ],
        temperature=0.3 # Low temperature for more literal, predictable translations
    )

    # Parse the JSON response
    result_json = json.loads(response.choices[0].message.content)
    translated_texts = result_json.get("translated_segments", [])

    # Re-map the translated text back to the original timestamps
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
    # Mock data formatted exactly like our Whisper output from Step 1
    mock_whisper_segments = [
        {"start": 0.0, "end": 2.5, "text": " Welcome back to the tutorial."},
        {"start": 2.5, "end": 5.0, "text": " Today we are learning about React Components."},
        {"start": 5.0, "end": 8.0, "text": " Let's dive right into the code."}
    ]
    
    # Example glossary (crucial for EdTech/Programming videos)
    tech_glossary = {
        "React Components": "React Components" # Keep the technical term in English
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