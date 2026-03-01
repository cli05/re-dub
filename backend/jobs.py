import uuid
from datetime import datetime, timezone

import modal

from d1 import fetch_one, fetch_all, execute
from r2 import generate_download_url


async def create_job(user_id: str, file_key: str, project_id: str, target_language: str, voice_preset_id: str = None) -> str:
    job_id = f"{project_id}-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    await execute(
        "INSERT INTO jobs (job_id, user_id, status, source_key, output_key, target_language, created_at)"
        " VALUES (?, ?, 'PENDING', ?, NULL, ?, ?)",
        [job_id, user_id, file_key, target_language, now],
    )

    video_url = generate_download_url(file_key, expires=7200)

    # Look up checkpoint path for the voice preset (if any)
    checkpoint_volume_path = None
    if voice_preset_id:
        from presets import get_preset
        preset = await get_preset(voice_preset_id, user_id)
        if preset and preset.get("status") == "READY":
            checkpoint_volume_path = preset.get("checkpoint_volume_path")

    try:
        orchestrator_func = modal.Function.from_name("redub-orchestrator", "process_video")
        await orchestrator_func.spawn.aio(
            job_id=job_id,
            video_url=video_url,
            target_language=target_language,
            voice_preset_id=voice_preset_id,
            checkpoint_volume_path=checkpoint_volume_path,
        )
    except Exception as e:
        # Modal app not deployed yet — job is created in DB but pipeline won't run.
        print(f"[warn] Could not spawn orchestrator for job {job_id}: {e}")

    return job_id


async def get_job(job_id: str, user_id: str) -> dict | None:
    return await fetch_one(
        "SELECT * FROM jobs WHERE job_id = ? AND user_id = ?",
        [job_id, user_id],
    )


async def list_jobs(user_id: str) -> list[dict]:
    return await fetch_all(
        "SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC",
        [user_id],
    )


async def update_job_step(job_id: str, step: int):
    await execute(
        "UPDATE jobs SET step = ?, status = 'PROCESSING' WHERE job_id = ?",
        [step, job_id],
    )


async def complete_job(job_id: str, output_key: str):
    now = datetime.now(timezone.utc).isoformat()
    await execute(
        "UPDATE jobs SET status = 'COMPLETED', output_key = ?, completed_at = ? WHERE job_id = ?",
        [output_key, now, job_id],
    )


async def fail_job(job_id: str, error: str):
    now = datetime.now(timezone.utc).isoformat()
    await execute(
        "UPDATE jobs SET status = 'FAILED', error = ?, completed_at = ? WHERE job_id = ?",
        [error, now, job_id],
    )