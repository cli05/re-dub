import uuid
from datetime import datetime, timezone

import modal

from d1 import fetch_one, fetch_all, execute
from r2 import generate_download_url


async def create_preset(user_id: str, name: str, audio_key: str, duration_sec: float) -> dict:
    """Create a new voice preset row and kick off the Modal fine-tuning job."""
    preset_id = f"vp-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    await execute(
        "INSERT INTO voice_presets "
        "(voice_preset_id, user_id, name, status, audio_key, duration_sec, created_at) "
        "VALUES (?, ?, ?, 'PENDING', ?, ?, ?)",
        [preset_id, user_id, name, audio_key, duration_sec, now],
    )

    # Build a presigned URL so Modal can download the reference audio from R2
    audio_url = generate_download_url(audio_key, expires=7200)

    try:
        fine_tune_func = modal.Function.from_name("redub-xtts", "fine_tune_speaker")
        await fine_tune_func.spawn.aio(
            preset_id=preset_id,
            audio_url=audio_url,
        )
    except Exception as e:
        print(f"[warn] Could not spawn fine-tune for preset {preset_id}: {e}")

    return {
        "voice_preset_id": preset_id,
        "name": name,
        "status": "PENDING",
        "duration_sec": duration_sec,
        "created_at": now,
    }


async def get_preset(preset_id: str, user_id: str) -> dict | None:
    return await fetch_one(
        "SELECT * FROM voice_presets WHERE voice_preset_id = ? AND user_id = ?",
        [preset_id, user_id],
    )


async def list_presets(user_id: str) -> list[dict]:
    return await fetch_all(
        "SELECT * FROM voice_presets WHERE user_id = ? ORDER BY created_at DESC",
        [user_id],
    )


async def complete_preset(preset_id: str, checkpoint_volume_path: str):
    now = datetime.now(timezone.utc).isoformat()
    await execute(
        "UPDATE voice_presets SET status = 'READY', checkpoint_volume_path = ?, completed_at = ? "
        "WHERE voice_preset_id = ?",
        [checkpoint_volume_path, now, preset_id],
    )


async def fail_preset(preset_id: str, error: str):
    now = datetime.now(timezone.utc).isoformat()
    await execute(
        "UPDATE voice_presets SET status = 'FAILED', error = ?, completed_at = ? "
        "WHERE voice_preset_id = ?",
        [error, now, preset_id],
    )


async def delete_preset(preset_id: str, user_id: str) -> bool:
    """Delete a preset. Returns True if a row was found."""
    preset = await get_preset(preset_id, user_id)
    if preset is None:
        return False
    await execute(
        "DELETE FROM voice_presets WHERE voice_preset_id = ? AND user_id = ?",
        [preset_id, user_id],
    )
    return True
