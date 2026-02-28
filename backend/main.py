import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from r2 import upload_file, generate_upload_url, generate_download_url, delete_file, list_files

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

@app.post("/api/upload/presigned")
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
