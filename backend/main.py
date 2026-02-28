import os
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from r2 import upload_file, generate_upload_url, generate_download_url, delete_file, list_files
from pipeline import start_dub_job, complete_job, fail_job, get_job

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to FastAPI"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


# --- R2 Storage Endpoints ---

@app.get("/api/upload/presigned")
async def get_presigned_upload_url(filename: str, content_type: str = "video/mp4"):
    """Generate a presigned URL for direct browser → R2 upload."""
    key = f"uploads/{uuid.uuid4()}/{filename}"
    url = generate_upload_url(key, content_type)
    return {"upload_url": url, "file_key": key}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    """Upload a file through the backend to R2."""
    key = f"uploads/{uuid.uuid4()}/{file.filename}"
    upload_file(file.file, key, file.content_type)
    return {"file_key": key, "filename": file.filename}


@app.get("/api/files/{file_key:path}/download")
async def download_url(file_key: str):
    """Generate a time-limited presigned download URL."""
    url = generate_download_url(file_key)
    return {"download_url": url}


@app.delete("/api/files/{file_key:path}")
async def remove_file(file_key: str):
    """Delete a file from R2."""
    delete_file(file_key)
    return {"deleted": file_key}


@app.get("/api/projects/{project_id}/files")
async def list_project_files(project_id: str):
    """List all files in R2 for a given project."""
    prefix = f"projects/{project_id}/"
    objects = list_files(prefix)
    files = [
        {"key": obj["Key"], "size": obj["Size"], "modified": obj["LastModified"].isoformat()}
        for obj in objects
    ]
    return {"files": files}


# --- Dubbing Pipeline Endpoints ---

class DubRequest(BaseModel):
    file_key: str        # R2 key of the uploaded source video
    project_id: str      # Used to namespace output files in R2
    target_language: str # e.g. "Spanish", "French"


@app.post("/api/dub")
async def start_dub(req: DubRequest):
    """Trigger the ML dubbing pipeline for a given video."""
    job_id = start_dub_job(req.file_key, req.project_id, req.target_language)
    return {"job_id": job_id, "status": "PENDING"}


@app.get("/api/dub/{job_id}")
async def get_dub_status(job_id: str):
    """Poll the status of a dubbing job."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    response = {"job_id": job_id, "status": job["status"]}
    if job["status"] == "COMPLETED":
        response["output_key"] = job["output_key"]
        response["download_url"] = generate_download_url(job["output_key"])
    elif job["status"] == "FAILED":
        response["error"] = job["error"]
    return response


class WebhookPayload(BaseModel):
    job_id: str
    status: str          # "COMPLETED" or "FAILED"
    output_key: str | None = None  # R2 key of the dubbed video
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
        complete_job(payload.job_id, payload.output_key)
    else:
        fail_job(payload.job_id, payload.error or "Unknown error")

    return {"received": True}
