# re-dub — Claude Code Project Guide

> **Note:** This plan is a living document and will evolve as the project progresses.

---

## Project Overview

**re-dub** is a serverless, end-to-end AI video dubbing platform. It takes a source video of a person talking, translates their speech into one of 17 supported languages, clones the user's original voice from a short reference clip, and re-syncs the video's lip movements to match the new translated audio.

---

## Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Infrastructure | Modal (Serverless GPU compute) |
| Orchestration | Python + `modal.Volume` for model weight persistence |
| Backend API | FastAPI |
| Frontend | React 18 + Tailwind CSS |

### GPU Allocation

| GPU | Task |
|---|---|
| A100 (80GB/40GB) | LatentSync (diffusion-based lip-sync) |
| T4 / A10G | Whisper v3-large (transcription), XTTS v2 (voice cloning) |

---

## Project Structure

```
re-dub/
├── CLAUDE.md
├── backend/
│   ├── main.py              # FastAPI app (local dev server)
│   ├── requirements.txt
│   └── translator/          # (virtual env — do not commit)
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── components/      # React UI components
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Login.jsx / SignUp.jsx / AccountSettings.jsx
│   │   │   ├── StepOne.jsx – StepFour.jsx  # dubbing wizard flow
│   │   │   ├── Editor.jsx
│   │   │   ├── VideoPreview.jsx
│   │   │   └── Header.jsx / StepProgress.jsx
│   │   └── index.js / index.css
│   ├── package.json
│   └── tailwind.config.js
└── modal/                   # (to be created) Modal pipeline code
    └── app.py
```

---

## The Model Pipeline

### Step 1 — Audio Extraction & Diarization
- **Tools:** FFmpeg + Whisper v3-large
- Extract audio, denoise, and generate a transcript with precise timestamps
- Extract a clean 10-second segment of the speaker's voice for use as the voice cloning reference

### Step 2 — Translation (NLP)
- **Tools:** OpenAI GPT-4o or Llama-3-70B
- Translate transcript into target language
- Instruct the LLM to match original syllable count/rhythm as closely as possible to minimize time-stretching

### Step 3 — Zero-Shot Voice Cloning (TTS)
- **Model:** Coqui XTTS v2
- Clones voice from a 6–10 second reference clip
- **Supported Languages (17):** English, Spanish, French, German, Italian, Portuguese, Polish, Turkish, Russian, Dutch, Czech, Arabic, Chinese, Hungarian, Korean, Japanese, Hindi
- Output: high-fidelity `.wav` in the target language

### Step 4 — Time Alignment (DSP)
- **Tools:** FFmpeg (`atempo`) or Pedalboard
- Compare original vs. generated audio duration
- Apply time-stretching so new audio matches original video duration exactly

### Step 5 — High-Fidelity Lip-Sync (Generative)
- **Model:** LatentSync (diffusion-based) or MuseTalk
- **Hardware:** A100 GPU on Modal
- Inpaints the mouth/jaw area of the original video to match phonemes of new audio
- Uses Stable Diffusion to ensure natural integration with skin texture/lighting

---

## Modal Infrastructure

### Container Images
A `modal.Image` must install:
- `torch`, `torchaudio`, `diffusers`, `opencv-python`
- `TTS` (Coqui), `openai-whisper`
- `ffmpeg`

### Storage (Volumes)
`modal.Volume` stores model weights to avoid re-downloading on cold start:

| Model | Approx Size |
|---|---|
| Whisper v3-large | ~3 GB |
| XTTS v2 | ~2 GB |
| LatentSync checkpoints | ~15 GB+ |

### Function GPU Assignments
```python
@app.function(gpu="T4")    # transcription + TTS
@app.function(gpu="A100")  # LatentSync lip-sync only
```

---

## Known Challenges

| Challenge | Mitigation |
|---|---|
| Cold starts | Mount `modal.Volume` so weights persist across invocations |
| Audio/video muxing | Use FFmpeg carefully to merge audio + synced video without sync drift |
| VRAM limits on high-res video | Implement frame-chunking for 720p+ in LatentSync |
| A100 credit drain | Set `container_idle_timeout=60` to scale to zero quickly |

---

## Development Phases

- **Phase 1:** XTTS v2 voice cloning as a standalone Modal function
- **Phase 2:** Integrate Whisper transcription + LLM translation
- **Phase 3:** Integrate LatentSync on A100
- **Phase 4:** `modal.web_endpoint` — accept `POST {video_url}`, return processed video URL

---

## Local Dev

### Backend
```bash
cd backend
source translator/bin/activate
uvicorn main:app --reload
# → http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

### CORS
Backend is configured to allow `http://localhost:3000` during local development.

---

## Conventions

- Keep Modal pipeline code in `modal/app.py` (and sub-modules as needed)
- Do not commit the `backend/translator/` virtual environment
- Frontend routing uses React Router v6 — routes are defined in `App.js`
- Tailwind CSS for all styling; no external component libraries unless explicitly chosen