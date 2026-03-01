import os
import boto3
from dotenv import load_dotenv

load_dotenv()

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{os.getenv('ACCOUNT_ID')}.r2.cloudflarestorage.com",
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
    region_name="auto",
)

BUCKET = os.getenv("R2_BUCKET_NAME")


def upload_file(file_obj, key, content_type="video/mp4"):
    """Upload a file object to R2."""
    s3.upload_fileobj(file_obj, BUCKET, key, ExtraArgs={"ContentType": content_type})


def generate_upload_url(key, content_type="video/mp4", expires=3600):
    """Generate a presigned URL for direct browser-to-R2 upload."""
    return s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=expires,
    )


def generate_download_url(key, expires=3600):
    """Generate a presigned URL for downloading a file from R2."""
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": key},
        ExpiresIn=expires,
    )


def delete_file(key):
    """Delete a file from R2."""
    s3.delete_object(Bucket=BUCKET, Key=key)


def list_files(prefix):
    """List all files in R2 under a given prefix."""
    resp = s3.list_objects_v2(Bucket=BUCKET, Prefix=prefix)
    return resp.get("Contents", [])


def object_exists(key):
    """Return True if the object exists in R2."""
    try:
        s3.head_object(Bucket=BUCKET, Key=key)
        return True
    except Exception:
        return False


def get_object_json(key):
    """Read a JSON object from R2. Returns parsed dict or None on failure."""
    import json
    try:
        resp = s3.get_object(Bucket=BUCKET, Key=key)
        return json.loads(resp["Body"].read().decode())
    except Exception:
        return None
