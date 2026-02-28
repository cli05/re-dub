import os
import uuid
import modal
from r2 import generate_download_url

# In-memory job store — replace with a DB (e.g. Redis, SQLite) for production
# Structure: { job_id: { "status": "PENDING"|"COMPLETED"|"FAILED", "output_key": str, "error": str } }
jobs: dict[str, dict] = {}


def start_dub_job(file_key: str, project_id: str, target_language: str) -> str:
    """
    Kick off the Modal pipeline for a dubbing job.

    1. Generates a presigned download URL for the source video in R2.
    2. Fires the Modal orchestrator with the video URL, project/job IDs, and target language.
    3. Returns a job_id that the frontend can poll via GET /api/dub/{job_id}.
    """
    job_id = f"{project_id}-{uuid.uuid4().hex[:8]}"

    # Build a time-limited URL so Modal can download the source video from R2
    video_url = generate_download_url(file_key, expires=7200)

    # Register the job as pending before spawning so the webhook can always find it
    jobs[job_id] = {"status": "PENDING", "output_key": None, "error": None}

    # Spawn the Modal function asynchronously — returns immediately
    orchestrator_func = modal.Function.from_name("redub-orchestrator", "process_video")
    orchestrator_func.spawn(
        job_id=job_id,
        video_url=video_url,
        target_language=target_language,
    )

    return job_id


def complete_job(job_id: str, output_key: str):
    """Mark a job as completed with the R2 output key."""
    if job_id in jobs:
        jobs[job_id]["status"] = "COMPLETED"
        jobs[job_id]["output_key"] = output_key


def fail_job(job_id: str, error: str):
    """Mark a job as failed."""
    if job_id in jobs:
        jobs[job_id]["status"] = "FAILED"
        jobs[job_id]["error"] = error


def get_job(job_id: str) -> dict | None:
    """Return current job state, or None if not found."""
    return jobs.get(job_id)
