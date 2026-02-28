import json
import uuid
from datetime import datetime, timezone

from d1 import fetch_one, fetch_all, execute


def _deserialize(row: dict) -> dict:
    """Parse preferences TEXT column back to a dict."""
    if row and "preferences" in row:
        try:
            row["preferences"] = json.loads(row["preferences"])
        except (json.JSONDecodeError, TypeError):
            row["preferences"] = {}
    return row


async def create_user(email: str, password_hash: str, display_name: str) -> dict:
    email = email.lower().strip()

    existing = await fetch_one("SELECT user_id FROM users WHERE email = ?", [email])
    if existing:
        raise ValueError("Email already registered")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    await execute(
        "INSERT INTO users (user_id, email, password_hash, display_name, preferences, created_at)"
        " VALUES (?, ?, ?, ?, '{}', ?)",
        [user_id, email, password_hash, display_name, now],
    )

    return {
        "user_id": user_id,
        "email": email,
        "password_hash": password_hash,
        "display_name": display_name,
        "preferences": {},
        "created_at": now,
    }


async def get_user_by_id(user_id: str) -> dict | None:
    row = await fetch_one("SELECT * FROM users WHERE user_id = ?", [user_id])
    return _deserialize(row) if row else None


async def get_user_by_email(email: str) -> dict | None:
    row = await fetch_one("SELECT * FROM users WHERE email = ?", [email.lower().strip()])
    return _deserialize(row) if row else None


async def update_user(user_id: str, **fields) -> dict:
    allowed = {"display_name", "preferences", "password_hash"}
    updates = {k: v for k, v in fields.items() if k in allowed}

    if not updates:
        return await get_user_by_id(user_id)

    if "preferences" in updates and isinstance(updates["preferences"], dict):
        updates["preferences"] = json.dumps(updates["preferences"])

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [user_id]
    await execute(f"UPDATE users SET {set_clause} WHERE user_id = ?", values)

    return await get_user_by_id(user_id)