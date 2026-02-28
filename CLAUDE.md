# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

re-dub is a serverless AI video dubbing platform (branded "PolyGlot Dubs AI" in the UI). Pipeline: source video → Whisper transcription → GPT-4o translation → XTTS v2 voice cloning → LatentSync lip-sync re-render.

## Development Commands

### Backend (FastAPI)
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload   # runs at http://localhost:8000
```

### Frontend (React)
```bash
cd frontend
npm install
npm start        # dev server at http://localhost:3000
npm run build    # production build
npm test         # run tests
```

### ML (Modal)
Each Modal app is deployed independently. The orchestrator calls into the deployed apps by name.

```bash
# Test a single app locally (runs on Modal's cloud):
modal run ml/app_whisper.py
modal run ml/app_translate.py
modal run ml/app_xtts.py

# Deploy all individual apps first, then run the orchestrator:
modal deploy ml/app_whisper.py
modal deploy ml/app_translate.py
modal deploy ml/app_xtts.py
modal deploy ml/app_latentsync.py
modal run ml/orchestrator.py
```

## Architecture

### ML Pipeline (`ml/`)
Five Modal apps, each an independent serverless deployment:

| File | Modal App Name | GPU | Role |
|---|---|---|---|
| `app_whisper.py` | `redub-whisper` | A10G | Transcribes video with Whisper large-v3; returns segments with timestamps |
| `app_translate.py` | `redub-translate` | CPU | Calls GPT-4o to translate segments; preserves start/end timestamps |
| `app_xtts.py` | `redub-xtts` | A10G | XTTS v2 zero-shot voice cloning; takes text + 6-sec WAV reference → returns WAV bytes |
| `app_latentsync.py` | `redub-latentsync` | **A100 required** | LatentSync diffusion lip-sync; takes video URL + dubbed audio bytes → returns final MP4 bytes |
| `orchestrator.py` | `redub-orchestrator` | CPU | Calls the 4 apps above via `modal.Function.from_name()`, uploads result to S3-compatible storage, fires a webhook to FastAPI |

**Model weights are baked into each Docker image** via `run_function()` during build — this prevents multi-GB downloads at cold start.

**Modal Secrets required:**
- `openai-api-secret` — `OPENAI_API_KEY` for GPT-4o
- `do-spaces-secret` — `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME`
- `backend-webhook-secret` — `WEBHOOK_URL`, `WEBHOOK_SECRET`

### Backend (`backend/`)
FastAPI app at `backend/main.py`. Currently has only a health-check endpoint (`GET /api/health`). CORS is configured for `http://localhost:3000` only. This will receive the post-processing webhook from the orchestrator and serve job status to the frontend.

### Frontend (`frontend/src/`)
React 18 + React Router v6. All routing is defined in `App.js` but currently **commented out** — the app renders `<SignUp/>` directly for UI development.

**Planned routes:**
- `/` → Dashboard
- `/new-dub` → StepOne (video upload)
- `/new-dub/step-2` → StepTwo (language selection)
- `/new-dub/step-3` → StepThree
- `/new-dub/step-4` → StepFour

All components use **inline `styles` objects** (not Tailwind classes) despite Tailwind being installed. The design system uses `#0a1a18` dark background and `#00e5a0` accent green. Shared layout components: `Header` and `StepProgress`.

## Key Implementation Notes

- **LatentSync requires A100** — it will OOM on T4/A10G. Do not change the GPU spec.
- The XTTS language code must be a 2-letter ISO code (e.g., `"es"`, `"fr"`), not a full language name. The orchestrator currently does a naive `target_language[:2].lower()` conversion — this needs a proper mapping.
- `word_timestamps=True` in Whisper is critical; downstream steps depend on per-segment timing.
- The `backend/translator/` directory is a local Python virtualenv — do not commit it.
- **Modal secret name discrepancy:** `app_translate.py` references `openai-secret` but CLAUDE.md documents it as `openai-api-secret`. The actual secret in Modal must match what the code uses (`openai-secret`).
- **`speaker_ref.wav`**: 6-second mono WAV extracted from the source video's first 6 seconds (22050 Hz). Used by XTTS as the voice cloning reference — it captures the original speaker's vocal characteristics so the dubbed audio sounds like the same person.

## Dependency Pins (app_xtts.py) — Do Not Remove

These pins exist to fix real incompatibilities with `TTS==0.22.0`:
- `transformers>=4.33.0,<4.40.0` — `BeamSearchScorer` was removed from `transformers.__init__` in 4.40, breaking TTS import
- `torch<2.6.0` / `torchaudio<2.6.0` — PyTorch 2.6 changed `torch.load()` default to `weights_only=True`, breaking XTTS checkpoint loading

## ML Testing

Standalone test scripts exist for individual pipeline steps. They handle volume seeding and do not require a prior `modal deploy` (they import functions directly instead of using `modal.Function.from_name`).

```bash
modal run ml/test_xtts.py                          # saves test_xtts_test-xtts.wav locally
modal run ml/test_xtts.py --job-id my-run --lang fr

modal run ml/test_latentsync.py                    # self-contained, extracts audio from test video
modal run ml/test_latentsync.py --audio-file test_xtts_test-xtts.wav  # use real XTTS output
```

## Status

### Done
- ML pipeline apps written (`app_whisper.py`, `app_translate.py`, `app_xtts.py`, `app_latentsync.py`, `orchestrator.py`)
- Standalone test scripts: `ml/test_xtts.py`, `ml/test_latentsync.py`
- Dependency pins fixed in `app_xtts.py` (transformers + torch version conflicts)

### Still To Do
- **Run and verify** XTTS and LatentSync tests end-to-end successfully
- **Fix language code mapping** in orchestrator — replace `target_language[:2].lower()` with a proper ISO 639-1 lookup table
- **Cloudflare R2 integration** — configure `do-spaces-secret` in Modal with R2 credentials (`S3_ENDPOINT_URL` = `https://<account_id>.r2.cloudflarestorage.com`)
- **Backend webhook endpoint** — `backend/main.py` only has `GET /api/health`; needs a `POST /api/webhook` endpoint to receive job completion events from the orchestrator
- **Frontend routing** — routes in `App.js` are commented out; app renders `<SignUp/>` directly