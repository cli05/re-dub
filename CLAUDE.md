# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

re-dub is a serverless AI video dubbing platform (branded "PolyGlot Dubs AI" / "Redub" in the UI). Pipeline: source video → Whisper transcription → Groq/LLaMA translation → XTTS v2 voice cloning (per-segment with duration matching) → MuseTalk lip-sync re-render. Supports optional XTTS speaker-adaptive fine-tuning via "voice presets" for higher-quality dubbing.

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
| `app_translate.py` | `redub-translate` | CPU | Calls Groq (llama-3.3-70b-versatile) to translate segments; preserves start/end timestamps |
| `app_xtts.py` | `redub-xtts` | H100 | XTTS v2 voice cloning; generates **per-segment** audio, time-stretches each clip to match original segment duration, stitches with silence gaps into `dubbed_audio.wav`. Supports fine-tuned voice presets via `checkpoint_volume_path`. Also exposes `fine_tune_speaker()` for XTTS speaker-adaptive fine-tuning. |
| `app_latentsync.py` | `redub-latentsync` | **A100 required** | LatentSync diffusion lip-sync; takes video URL + dubbed audio bytes → returns final MP4 bytes |
| `orchestrator.py` | `redub-orchestrator` | CPU | Calls the 4 apps above via `modal.Function.from_name()`, uploads result to S3-compatible storage, fires a webhook to FastAPI |

**Model weights are baked into each Docker image** via `run_function()` during build — this prevents multi-GB downloads at cold start.

**Modal Secrets required:**
- `groq-secret` — `GROQ_API_KEY` for Groq/LLaMA translation
- `redub-r2-secret` — `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME`
- `backend-webhook-secret` — `WEBHOOK_URL`, `WEBHOOK_SECRET`

### Backend (`backend/`)
FastAPI app at `backend/main.py`. Uses Cloudflare D1 (SQL database via HTTP API through `d1.py`) and Cloudflare R2 (S3-compatible object storage via `r2.py`). Auth uses JWT tokens.

**Key modules:**
- `main.py` — FastAPI app with all endpoints (auth, upload, dub, presets, webhooks)
- `auth.py` — JWT token creation/verification, password hashing
- `accounts.py` — User CRUD
- `jobs.py` — Dubbing job CRUD + orchestrator spawning (passes `voice_preset_id`/`checkpoint_volume_path` when applicable)
- `presets.py` — Voice preset CRUD + Modal fine-tune spawning
- `d1.py` — Cloudflare D1 HTTP client (`fetch_one`, `fetch_all`, `execute`)
- `r2.py` — Cloudflare R2 helpers (`upload_file`, `generate_download_url`, `delete_file`, etc.)
- `schema.sql` — D1 schema: `users`, `jobs`, `voice_presets` tables

**API Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create user account |
| `POST` | `/api/auth/login` | Get JWT token |
| `POST` | `/api/upload` | Upload file to R2 (FormData) |
| `POST` | `/api/dub` | Start dubbing job (accepts optional `voice_preset_id`) |
| `GET` | `/api/dub/:job_id` | Poll job status |
| `GET` | `/api/projects` | List user's dubbing jobs |
| `POST` | `/api/presets` | Create voice preset + trigger fine-tuning |
| `GET` | `/api/presets` | List user's voice presets |
| `GET` | `/api/presets/:id` | Get single preset |
| `DELETE` | `/api/presets/:id` | Delete preset |
| `POST` | `/api/webhook/job-step` | Per-step progress callback (from Modal) |
| `POST` | `/api/webhook/job-complete` | Job completion callback (from Modal) |
| `POST` | `/api/webhook/preset-complete` | Fine-tuning completion callback (from Modal) |

### Frontend (`frontend/src/`)
React 18 + React Router v6. Routing in `App.js`.

**Key routes:**
- `/` → `LandingPage`
- `/dashboard` → `Dashboard`
- `/new-dub` → `NewDub` (video upload + language selection + optional voice preset)
- `/loading` → Loading/progress screen
- `/preview` → `VideoPreview`
- `/account-settings` → `AccountSettings` (profile, password, preferences, voice presets management)
- `/login` → `Login`
- `/signup` → `SignUp`

All components use **inline `styles` objects** (not Tailwind classes) despite Tailwind being installed. The design system uses `#0a1a18` dark background and `#00e5a0` accent green. Shared layout: `Header`.

## Key Implementation Notes

- **LatentSync requires A100** — it will OOM on T4/A10G. Do not change the GPU spec.
- The XTTS language code must be a 2-letter ISO code (e.g., `"es"`, `"fr"`), not a full language name. The `generate_dubbed_audio` function does `target_language[:2].lower()` internally — this needs a proper mapping.
- **Per-segment TTS with duration matching**: `app_xtts.py` generates audio for each translated segment individually, then uses ffmpeg `atempo` to time-stretch each clip to match the original segment's duration (`end - start`). Silence is inserted between segments to preserve the original pacing. Tempo is clamped to `[0.5, 1.8]` to avoid unnatural audio. The function signature is `generate_dubbed_audio(job_id, segments, target_language, checkpoint_volume_path=None)` where `segments` is a list of dicts with `translated_text`, `start`, and `end` keys.
- **Voice Presets (XTTS speaker-adaptive fine-tuning)**: Users upload ≥30s of reference audio in Account Settings. The backend creates a DB row and spawns `fine_tune_speaker()` on Modal (H100, 30 min timeout). Fine-tuning freezes all layers except speaker-related components and trains for 3 epochs. The checkpoint is saved to `/models/xtts_presets/{preset_id}/xtts_ft.pth` on the model volume. When creating a dub, users can select a READY preset — the checkpoint path is passed through `jobs.py` → `orchestrator.py` → `app_xtts.py` → `_load_tts()` which loads the fine-tuned weights on top of the base XTTS v2 model.
- **Voice Preset flow**: AccountSettings upload → `POST /api/presets` → `presets.py:create_preset()` → `modal.Function.spawn("fine_tune_speaker")` → downloads audio from R2, splits into chunks, fine-tunes, saves checkpoint → `POST /api/webhook/preset-complete` → status becomes `READY`. In NewDub, user selects a READY preset → `POST /api/dub` with `voice_preset_id` → `jobs.py` looks up `checkpoint_volume_path` → passes to orchestrator → XTTS loads fine-tuned model.
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
- ML pipeline apps written (`app_whisper.py`, `app_translate.py`, `app_xtts.py`, `app_latentsync.py`/`app_musetalk.py`, `orchestrator.py`)
- Per-segment TTS with duration matching in `app_xtts.py`
- XTTS speaker-adaptive fine-tuning (`fine_tune_speaker` in `app_xtts.py`)
- Voice presets full-stack feature (DB schema, backend CRUD + endpoints + webhook, ML fine-tuning, frontend UI in AccountSettings + preset selector in NewDub)
- Backend: FastAPI with auth, file upload, dubbing jobs, voice presets, webhooks
- Frontend: Full React app with dashboard, new dub flow, loading screen, video preview, account settings
- Standalone test scripts: `ml/test_full_pipeline.py`, `ml/test_whisper_translate.py`
- Dependency pins fixed in `app_xtts.py` (transformers + torch version conflicts)

### Still To Do
- **Run and verify** full pipeline end-to-end with fine-tuned voice presets
- **Fix language code mapping** in orchestrator — replace `target_language[:2].lower()` with a proper ISO 639-1 lookup table
- **Benchmarking metrics** for fine-tuned vs zero-shot: Speaker Similarity (SIM), MOS, SyncNet, WER Round-Trip, Speaker Verification EER, Duration Accuracy MAE