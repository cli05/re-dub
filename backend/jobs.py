import json
import uuid
from datetime import datetime, timezone

import modal
from botocore.exceptions import ClientError
from r2 import s3, BUCKET, generate_download_url


# ---------------------------------------------------------------------------
# Key helpers
# ---------------------------------------------------------------------------

def _meta_key(user_id: str, job_id: str) -> str:
    return f"projects/{user_id}/{job_id}/meta.json"


def _index_key(job_id: str) -> str:
    """Global job-id → user-id index so the webhook can look up jobs without a user context."""
    return f"accounts/job-index/{job_id}.json"


# ---------------------------------------------------------------------------
# Internal R2 helpers
# ---------------------------------------------------------------------------

def _get_meta(user_id: str, job_id: str) -> dict | None:
    try:
        resp = s3.get_object(Bucket=BUCKET, Key=_meta_key(user_id, job_id))
        return json.loads(resp["Body"].read())
    except ClientError as e:
        if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return None
        raise


def _put_meta(meta: dict):
    s3.put_object(
        Bucket=BUCKET,
        Key=_meta_key(meta["user_id"], meta["job_id"]),
        Body=json.dumps(meta),
        ContentType="application/json",
    )


def _user_for_job(job_id: str) -> str | None:
    """Return user_id for a job_id using the global index, or None."""
    try:
        resp = s3.get_object(Bucket=BUCKET, Key=_index_key(job_id))
        return json.loads(resp["Body"].read())["user_id"]
    except ClientError as e:
        if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return None
        raise


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_job(user_id: str, file_key: str, project_id: str, target_language: str) -> str:
    """
    Persist a PENDING job record to R2 and spawn the Modal pipeline.
    Returns the job_id.
    """
    job_id = f"{project_id}-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    meta = {
        "job_id": job_id,
        "user_id": user_id,
        "status": "PENDING",
        "source_key": file_key,
        "output_key": None,
        "target_language": target_language,
        "created_at": now,
        "completed_at": None,
        "error": None,
    }

    # Write job metadata and global index atomically (best-effort)
    _put_meta(meta)
    s3.put_object(
        Bucket=BUCKET,
        Key=_index_key(job_id),
        Body=json.dumps({"user_id": user_id}),
        ContentType="application/json",
    )

    # Build a time-limited presigned URL so Modal can fetch the source video
    video_url = generate_download_url(file_key, expires=7200)

    # Spawn Modal orchestrator asynchronously — returns immediately
    orchestrator_func = modal.Function.from_name("redub-orchestrator", "process_video")
    orchestrator_func.spawn(
        job_id=job_id,
        video_url=video_url,
        target_language=target_language,
    )

    return job_id


def get_job(job_id: str, user_id: str) -> dict | None:
    """Return job metadata for the given user, or None if not found."""
    return _get_meta(user_id, job_id)


def list_jobs(user_id: str) -> list[dict]:
    """Return all jobs for a user sorted newest-first."""
    prefix = f"projects/{user_id}/"
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix)
    objects = resp.get("Contents", [])

    jobs = []
    for obj in objects:
        if obj["Key"].endswith("/meta.json"):
            try:
                r = s3.get_object(Bucket=BUCKET, Key=obj["Key"])
                jobs.append(json.loads(r["Body"].read()))
            except ClientError:
                continue

    jobs.sort(key=lambda j: j.get("created_at", ""), reverse=True)
    return jobs


def complete_job(job_id: str, output_key: str):
    """Mark a job COMPLETED. Looks up user_id via the global index."""
    user_id = _user_for_job(job_id)
    if user_id is None:
        return
    meta = _get_meta(user_id, job_id)
    if meta:
        meta["status"] = "COMPLETED"
        meta["output_key"] = output_key
        meta["completed_at"] = datetime.now(timezone.utc).isoformat()
        _put_meta(meta)


def fail_job(job_id: str, error: str):
    """Mark a job FAILED. Looks up user_id via the global index."""
    user_id = _user_for_job(job_id)
    if user_id is None:
        return
    meta = _get_meta(user_id, job_id)
    if meta:
        meta["status"] = "FAILED"
        meta["error"] = error
        meta["completed_at"] = datetime.now(timezone.utc).isoformat()
        _put_meta(meta)