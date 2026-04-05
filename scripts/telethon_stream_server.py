import os
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from telethon import TelegramClient


API_ID = int(os.getenv("TELEGRAM_API_ID", "0") or 0)
API_HASH = os.getenv("TELEGRAM_API_HASH", "").strip()
SESSION_PATH = os.getenv("TELETHON_SESSION_PATH", "/data/user_session")
PORT = int(os.getenv("TELETHON_STREAM_PORT", "8090") or 8090)

app = FastAPI(title="telethon-stream")
client: Optional[TelegramClient] = None


async def get_client() -> TelegramClient:
    global client
    if client is None:
        if not API_ID or not API_HASH:
            raise RuntimeError("Missing TELEGRAM_API_ID/TELEGRAM_API_HASH")
        client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
        await client.connect()
    if not await client.is_user_authorized():
        raise RuntimeError("Telethon user session is not authorized")
    return client


def parse_range(value: str, total_size: int) -> tuple[int, int, int]:
    start = 0
    end = total_size - 1
    try:
        unit, raw = value.split("=", 1)
        if unit.strip().lower() != "bytes":
            return start, end, 200
        s, e = raw.split("-", 1)
        if s.strip():
            start = max(0, int(s))
        if e.strip():
            end = min(total_size - 1, int(e))
        if end < start:
            end = total_size - 1
        return start, end, 206
    except Exception:
        return start, end, 200


@app.get("/health")
async def health():
    return {"ok": True}


@app.get("/stream/{channel_id}/{message_id}")
async def stream_by_message(
    channel_id: int,
    message_id: int,
    range_header: Optional[str] = Header(default=None, alias="Range"),
):
    tg = await get_client()
    message = await tg.get_messages(channel_id, ids=message_id)
    if not message or not message.file:
        raise HTTPException(status_code=404, detail="Media not found")
    size = int(getattr(message.file, "size", 0) or 0)
    if size <= 0:
        raise HTTPException(status_code=404, detail="Unknown media size")

    start, end, status_code = (0, size - 1, 200)
    if range_header:
        start, end, status_code = parse_range(range_header, size)
    length = end - start + 1

    async def iterator() -> AsyncGenerator[bytes, None]:
        remain = length
        async for chunk in tg.iter_download(message.media, offset=start, chunk_size=512 * 1024):
            if remain <= 0:
                break
            if len(chunk) > remain:
                chunk = chunk[:remain]
            remain -= len(chunk)
            yield chunk
            if remain <= 0:
                break

    content_type = str(getattr(message.file, "mime_type", "") or "application/octet-stream")
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(length),
    }
    if status_code == 206:
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    return StreamingResponse(iterator(), status_code=status_code, headers=headers, media_type=content_type)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("telethon_stream_server:app", host="0.0.0.0", port=PORT, log_level="info")
