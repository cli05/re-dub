# re-dub (PolyGlot Dubs AI)

An AI-powered video dubbing platform. Upload a video, pick a target language, and get back a dubbed video with cloned voice and synced lips.

**Pipeline:** Source video → Whisper transcription → LLaMA translation → XTTS v2 voice cloning → LatentSync lip-sync → Final dubbed video

## Project Structure

```
re-dub/
├── backend/                # FastAPI backend (Cloudflare D1 + R2)
│   ├── main.py             # FastAPI app — all endpoints
│   ├── auth.py             # JWT authentication
│   ├── accounts.py         # User CRUD
│   ├── jobs.py             # Dubbing job CRUD + orchestrator spawning
│   ├── presets.py          # Voice preset CRUD + Modal fine-tune spawning
│   ├── d1.py               # Cloudflare D1 HTTP client
│   ├── r2.py               # Cloudflare R2 (S3-compatible) helpers
│   ├── schema.sql          # D1 schema (users, jobs, voice_presets)
│   └── requirements.txt
├── frontend/               # React 18 frontend
│   ├── src/
│   │   ├── App.js          # Routes
│   │   ├── auth.js         # Auth context + JWT helpers
│   │   └── components/
│   │       ├── Dashboard.jsx
│   │       ├── NewDub.jsx          # Upload + language + voice preset selector
│   │       ├── VideoPreview.jsx
│   │       ├── AccountSettings.jsx # Profile, password, voice presets management
│   │       ├── LandingPage.jsx
│   │       ├── Login.jsx
│   │       ├── SignUp.jsx
│   │       └── Header.jsx
│   ├── package.json
│   └── tailwind.config.js
└── ml/                     # Modal serverless GPU functions
    ├── app_whisper.py      # Whisper large-v3 transcription (A10G)
    ├── app_translate.py    # Groq/LLaMA translation (CPU)
    ├── app_xtts.py         # XTTS v2 voice cloning + fine-tuning (H100)
    ├── app_latentsync.py   # LatentSync lip-sync (A100)
    ├── orchestrator.py     # Chains the above 4 apps end-to-end
    ├── test_full_pipeline.py
    └── test_whisper_translate.py
```

## Setup & Running

### Backend

1. Navigate to the backend directory and create a virtual environment:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with the required environment variables:
   ```
   D1_DATABASE_ID=<your-cloudflare-d1-database-id>
   D1_API_TOKEN=<your-cloudflare-api-token>
   CF_ACCOUNT_ID=<your-cloudflare-account-id>
   R2_ACCESS_KEY_ID=<your-r2-access-key>
   R2_SECRET_ACCESS_KEY=<your-r2-secret-key>
   R2_BUCKET_NAME=<your-r2-bucket>
   JWT_SECRET=<your-jwt-secret>
   ```

4. Run the development server:
   ```bash
   uvicorn main:app --reload
   ```

The backend will be available at `http://localhost:8000`.

### Frontend

1. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`.

### ML (Modal)

The ML pipeline runs on [Modal](https://modal.com/) — serverless GPU infrastructure. Each app is deployed independently.

1. Install the Modal CLI and authenticate:
   ```bash
   pip install modal
   modal setup
   ```

2. Create the required Modal secrets:
   - `groq-secret` — contains `GROQ_API_KEY`
   - `redub-r2-secret` — contains `ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
   - `backend-webhook-secret` — contains `WEBHOOK_URL`, `WEBHOOK_SECRET`

3. Deploy all apps:
   ```bash
   modal deploy ml/app_whisper.py
   modal deploy ml/app_translate.py
   modal deploy ml/app_xtts.py
   modal deploy ml/app_musetalk.py
   modal deploy ml/orchestrator.py
   ```

4. To test individual apps locally (runs on Modal's cloud):
   ```bash
   modal run ml/app_whisper.py
   modal run ml/app_translate.py
   modal run ml/app_xtts.py
   modal run ml/test_full_pipeline.py
   ```

## Technologies Used

- **Frontend:** React 18, React Router, Tailwind CSS
- **Backend:** FastAPI, Uvicorn, Cloudflare D1 (database), Cloudflare R2 (object storage)
- **Auth:** JWT (python-jose), bcrypt
- **ML Pipeline:** Modal (serverless GPUs), OpenAI Whisper large-v3, Groq/LLaMA 3.3 70B, Coqui XTTS v2, LatentSync
- **Infrastructure:** Modal (A10G, H100, A100 GPUs), Cloudflare Workers ecosystem

## AI Tools Used

The following AI tools were used during the development of this project:

- **Google Gemini** — Used for research, brainstorming, and problem-solving during development
- **Claude Code (Anthropic)** — Used for code generation, debugging, and implementing features across the full stack
- **GitHub Copilot** — Used for inline code completion and pair programming assistance throughout development