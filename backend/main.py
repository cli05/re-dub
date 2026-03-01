import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Header, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

load_dotenv()

from r2 import upload_file, generate_upload_url, generate_download_url, delete_file, list_files
from accounts import create_user, get_user_by_email, update_user
from jobs import create_job, get_job, list_jobs, complete_job, fail_job, update_job_step
from auth import hash_password, verify_password, create_access_token, get_current_user

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _safe_user(user: dict) -> dict:
    """Strip password_hash before sending a user object to the client."""
    return {k: v for k, v in user.items() if k != "password_hash"}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    preferences: dict | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.post("/api/auth/register", status_code=201)
async def register(req: RegisterRequest):
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    try:
        user = await create_user(
            email=req.email,
            password_hash=hash_password(req.password),
            display_name=req.display_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    token = create_access_token(user["user_id"])
    return {"token": token, "user": _safe_user(user)}


@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = await get_user_by_email(req.email)
    if user is None or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["user_id"])
    return {"token": token, "user": _safe_user(user)}


@app.get("/api/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return _safe_user(current_user)


@app.patch("/api/auth/me")
async def update_me(
    req: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    updates = {}
    if req.display_name is not None:
        updates["display_name"] = req.display_name
    if req.preferences is not None:
        updates["preferences"] = req.preferences
    updated = await update_user(current_user["user_id"], **updates)
    return _safe_user(updated)


@app.post("/api/auth/me/password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    if not verify_password(req.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
    await update_user(current_user["user_id"], password_hash=hash_password(req.new_password))
    return {"updated": True}


# ---------------------------------------------------------------------------
# R2 storage endpoints (all require auth)
# ---------------------------------------------------------------------------

@app.get("/api/upload/presigned")
async def get_presigned_upload_url(
    filename: str,
    content_type: str = "video/mp4",
    current_user: dict = Depends(get_current_user),
):
    """Generate a presigned URL for direct browser → R2 upload."""
    key = f"uploads/{current_user['user_id']}/{uuid.uuid4()}/{filename}"
    url = generate_upload_url(key, content_type)
    return {"upload_url": url, "file_key": key}


@app.post("/api/upload")
async def upload(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a file through the backend to R2."""
    key = f"uploads/{current_user['user_id']}/{uuid.uuid4()}/{file.filename}"
    upload_file(file.file, key, file.content_type)
    return {"file_key": key, "filename": file.filename}


@app.get("/api/files/{file_key:path}/download")
async def download_url(
    file_key: str,
    current_user: dict = Depends(get_current_user),
):
    """Generate a time-limited presigned download URL."""
    url = generate_download_url(file_key)
    return {"download_url": url}


@app.delete("/api/files/{file_key:path}")
async def remove_file(
    file_key: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a file from R2."""
    delete_file(file_key)
    return {"deleted": file_key}


# ---------------------------------------------------------------------------
# Dubbing pipeline endpoints
# ---------------------------------------------------------------------------

class DubRequest(BaseModel):
    file_key: str        # R2 key of the uploaded source video
    project_id: str      # Used to namespace the job_id
    target_language: str # e.g. "Spanish", "French"


@app.post("/api/dub")
async def start_dub(
    req: DubRequest,
    current_user: dict = Depends(get_current_user),
):
    """Trigger the ML dubbing pipeline for a given video."""
    job_id = await create_job(
        user_id=current_user["user_id"],
        file_key=req.file_key,
        project_id=req.project_id,
        target_language=req.target_language,
    )
    return {"job_id": job_id, "status": "PENDING"}


@app.get("/api/dub/{job_id}")
async def get_dub_status(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Poll the status of a dubbing job."""
    job = await get_job(job_id, current_user["user_id"])
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    response = {"job_id": job_id, "status": job["status"], "step": job.get("step", 0)}
    if job["status"] == "COMPLETED":
        response["output_key"] = job["output_key"]
        response["download_url"] = generate_download_url(job["output_key"])
    elif job["status"] == "FAILED":
        response["error"] = job["error"]
    return response


@app.get("/api/projects")
async def list_projects(current_user: dict = Depends(get_current_user)):
    """Return all dubbing jobs for the current user (used by the Dashboard)."""
    jobs = await list_jobs(current_user["user_id"])
    return {"projects": jobs}


# ---------------------------------------------------------------------------
# Webhook — called by the Modal orchestrator, not by the frontend
# ---------------------------------------------------------------------------

class StepPayload(BaseModel):
    job_id: str
    step: int            # 1=Preparing, 2=Transcribing, 3=Translating, 4=Cloning Voice, 5=Lip Syncing


@app.post("/api/webhook/job-step")
async def job_step_webhook(
    payload: StepPayload,
    authorization: str = Header(None),
):
    """Receive per-step progress from the Modal orchestrator."""
    secret = os.getenv("WEBHOOK_SECRET")
    if secret and authorization != f"Bearer {secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    await update_job_step(payload.job_id, payload.step)
    return {"received": True}


class WebhookPayload(BaseModel):
    job_id: str
    status: str          # "COMPLETED" or "FAILED"
    output_key: str | None = None
    error: str | None = None


@app.post("/api/webhook/job-complete")
async def job_complete_webhook(
    payload: WebhookPayload,
    authorization: str = Header(None),
):
    """Receive completion callback from the Modal orchestrator."""
    secret = os.getenv("WEBHOOK_SECRET")
    if secret and authorization != f"Bearer {secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    if payload.status == "COMPLETED" and payload.output_key:
        await complete_job(payload.job_id, payload.output_key)
    else:
        await fail_job(payload.job_id, payload.error or "Unknown error")

    return {"received": True}