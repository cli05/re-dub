import os

import httpx
from dotenv import load_dotenv

load_dotenv()

_ACCOUNT_ID = os.getenv("ACCOUNT_ID")
_DATABASE_ID = os.getenv("D1_DATABASE_ID")
_API_TOKEN = os.getenv("CF_API_TOKEN")
_URL = f"https://api.cloudflare.com/client/v4/accounts/{_ACCOUNT_ID}/d1/database/{_DATABASE_ID}/query"
_HEADERS = {
    "Authorization": f"Bearer {_API_TOKEN}",
    "Content-Type": "application/json",
}


async def _query(sql: str, params: list = None) -> list[dict]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(_URL, headers=_HEADERS, json={"sql": sql, "params": params or []})
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise RuntimeError(f"D1 error: {data.get('errors')}")
    return data["result"][0]["results"]


async def fetch_one(sql: str, params: list = None) -> dict | None:
    rows = await _query(sql, params)
    return rows[0] if rows else None


async def fetch_all(sql: str, params: list = None) -> list[dict]:
    return await _query(sql, params)


async def execute(sql: str, params: list = None) -> None:
    await _query(sql, params)