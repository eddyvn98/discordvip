import os
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from telethon import TelegramClient, functions, types
from pydantic import BaseModel

API_ID = int(os.getenv("TELEGRAM_API_ID", "0") or 0)
API_HASH = os.getenv("TELEGRAM_API_HASH", "").strip()
SESSION_PATH = os.getenv("TELETHON_SESSION_PATH", "/data/user_session")
PORT = int(os.getenv("TELETHON_STREAM_PORT", "8090") or 8090)
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()

app = FastAPI(title="telethon-stream")
client: Optional[TelegramClient] = None

class CreateChannelRequest(BaseModel):
    title: str
    about: str = "Cinema Storage Channel"

class SetupBotAdminRequest(BaseModel):
    channel_id: int
    bot_id: str

class CopyMessageRequest(BaseModel):
    from_chat_id: int
    message_id: int
    to_chat_id: int
    caption: str = ""


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


@app.get("/check_channel/{channel_id}")
async def check_channel(channel_id: int):
    tg = await get_client()
    try:
        entity = await tg.get_entity(channel_id)
        if entity:
            return {"ok": True}
        raise HTTPException(status_code=404, detail="Channel not found")
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/channel_stats/{channel_id}")
async def get_channel_stats(channel_id: int):
    tg = await get_client()
    try:
        # Get total number of messages in the channel efficiently
        result = await tg.get_messages(channel_id, limit=0)
        return {"ok": True, "total": result.total}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/message_info/{channel_id}/{message_id}")
async def get_message_info(channel_id: int, message_id: int):
    tg = await get_client()
    try:
        message = await tg.get_messages(channel_id, ids=message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        photo_file_ids = []
        if message.photo:
            photo_file_ids = [message.photo.id] # Simple ID for now
            
        video = None
        if message.video:
            duration = 0
            if hasattr(message.video, 'attributes'):
                for attr in message.video.attributes:
                    if hasattr(attr, 'duration'):
                        duration = attr.duration
                        break
            
            video = {
                "file_id": str(message.video.id),
                "mime_type": getattr(message.video, 'mime_type', 'video/mp4'),
                "duration": duration,
            }
        
        document = None
        if message.document:
            document = {
                "file_id": str(message.document.id),
                "mime_type": message.document.mime_type,
            }

        return {
            "ok": True,
            "id": message.id,
            "date": int(message.date.timestamp()),
            "message": message.message,
            "caption": message.message, # Telethon uses .message for caption too
            "video": video,
            "document": document,
            "photo_ids": photo_file_ids,
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/check_message/{channel_id}/{message_id}")
async def check_message(channel_id: int, message_id: int):
    tg = await get_client()
    try:
        message = await tg.get_messages(channel_id, ids=message_id)
        return {"ok": True, "exists": message is not None}
    except Exception:
        return {"ok": True, "exists": False}

@app.post("/create_channel")
async def create_channel(req: CreateChannelRequest):
    tg = await get_client()
    try:
        # Create the channel
        result = await tg(functions.channels.CreateChannelRequest(
            title=req.title,
            about=req.about,
            megagroup=False
        ))
        # Find the channel to get the ID
        channel_id = None
        for chat in result.chats:
            # Channel objects in Telethon have an .id attribute
            if hasattr(chat, 'id'):
                channel_id = chat.id
                break
        
        if not channel_id:
            raise RuntimeError("Could not find channel ID in Telegram response")
            
        # Channel IDs in Bot API need -100 prefix
        full_id = int(f"-100{channel_id}")
        
        return {"ok": True, "channel_id": full_id, "id": channel_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/setup_bot_admin")
async def setup_bot_admin(req: SetupBotAdminRequest):
    tg = await get_client()
    try:
        # 1. Resolve bot entity
        bot_entity = await tg.get_entity(req.bot_id)
        
        # 2. Invite bot to the channel (Bot can be added as admin directly)
        # Note: If it's a channel, we use InviteToChannel
        await tg(functions.channels.InviteToChannelRequest(
            channel=req.channel_id,
            users=[bot_entity]
        ))
        
        # 3. Promote bot to Admin
        await tg(functions.channels.EditAdminRequest(
            channel=req.channel_id,
            user_id=bot_entity,
            admin_rights=types.ChatAdminRights(
                post_messages=True,
                edit_messages=True,
                delete_messages=True,
                invite_users=True,
                manage_call=True
            ),
            rank='Bot'
        ))
        
        return {"ok": True}
    except Exception as e:
        # If bot is already admin or in channel, some parts might fail but it's okay
        if "USER_ALREADY_PARTICIPANT" in str(e):
             # Try promoting anyway
             try:
                 bot_entity = await tg.get_entity(req.bot_id)
                 await tg(functions.channels.EditAdminRequest(
                    channel=req.channel_id,
                    user_id=bot_entity,
                    admin_rights=types.ChatAdminRights(
                        post_messages=True,
                        edit_messages=True,
                        delete_messages=True,
                        invite_users=True,
                        manage_call=True
                    ),
                    rank='Bot'
                ))
                 return {"ok": True}
             except Exception as e2:
                 raise HTTPException(status_code=500, detail=f"Invite failed ({e}), then promote failed ({e2})")
        raise HTTPException(status_code=500, detail=str(e))

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


@app.get("/me")
async def get_me():
    tg = await get_client()
    me = await tg.get_me()
    return {
        "id": me.id,
        "username": me.username,
        "first_name": me.first_name
    }

@app.post("/copy_message")
async def copy_message(req: CopyMessageRequest):
    tg = await get_client()
    try:
        # To "copy" a message in Telethon, we first get the original message object
        # then send it using send_message.
        message = await tg.get_messages(req.from_chat_id, ids=req.message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Source message not found")
            
        # Sending the message object itself acts as a copy (no forward tag)
        new_msg = await tg.send_message(
            entity=req.to_chat_id,
            message=message
        )
        
        return {
            "ok": True,
            "message_id": new_msg.id,
            "channel_id": req.to_chat_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("telethon_stream_server:app", host="0.0.0.0", port=PORT, log_level="info")
