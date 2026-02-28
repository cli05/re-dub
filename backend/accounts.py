import json
import uuid
from datetime import datetime, timezone

from botocore.exceptions import ClientError
from r2 import s3, BUCKET


def _user_key(user_id: str) -> str:
    return f"accounts/users/{user_id}.json"


def _email_key(email: str) -> str:
    # Email is lowercased; @ and . are valid S3/R2 key characters
    return f"accounts/email-index/{email.lower()}.json"


def _get_object(key: str) -> dict | None:
    """Return parsed JSON for a key, or None if the object does not exist."""
    try:
        resp = s3.get_object(Bucket=BUCKET, Key=key)
        return json.loads(resp["Body"].read())
    except ClientError as e:
        if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
            return None
        raise


def _put_object(key: str, data: dict):
    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=json.dumps(data),
        ContentType="application/json",
    )


def create_user(email: str, password_hash: str, display_name: str) -> dict:
    """
    Create a new user profile and email index entry in R2.
    Raises ValueError if the email is already registered.

    Note: the email uniqueness check (read → write) is not atomic.
    Under very high concurrency a duplicate could slip through, which
    is acceptable for this scale.
    """
    email = email.lower().strip()

    if _get_object(_email_key(email)) is not None:
        raise ValueError("Email already registered")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user = {
        "user_id": user_id,
        "email": email,
        "password_hash": password_hash,
        "display_name": display_name,
        "created_at": now,
        "preferences": {},
    }

    _put_object(_user_key(user_id), user)
    _put_object(_email_key(email), {"user_id": user_id})
    return user


def get_user_by_id(user_id: str) -> dict | None:
    """Fetch a user profile by ID, or None if not found."""
    return _get_object(_user_key(user_id))


def get_user_by_email(email: str) -> dict | None:
    """Fetch a user profile by email, or None if not found."""
    index = _get_object(_email_key(email.lower().strip()))
    if index is None:
        return None
    return get_user_by_id(index["user_id"])


def update_user(user_id: str, **fields) -> dict:
    """
    Patch allowed fields on a user profile and persist to R2.
    Returns the updated profile.
    """
    user = get_user_by_id(user_id)
    if user is None:
        raise ValueError("User not found")

    allowed = {"display_name", "preferences", "password_hash"}
    for key, value in fields.items():
        if key in allowed:
            user[key] = value

    _put_object(_user_key(user_id), user)
    return user