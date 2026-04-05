#!/usr/bin/env python3
import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from telethon.tl.types import MessageMediaDocument, MessageMediaPhoto


def parse_args():
    parser = argparse.ArgumentParser(description="Export Telegram channel history (user session / Telethon)")
    parser.add_argument("--channel-id", required=True, help="Telegram channel id, ex: -1003749586011")
    parser.add_argument("--output", required=True, help="Output JSON file path")
    parser.add_argument("--limit", type=int, default=0, help="0 = full history")
    parser.add_argument("--session", default=os.environ.get("TELEGRAM_USER_SESSION", "user_session"))
    return parser.parse_args()


def require_env(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing env: {name}")
    return value


def serialize_message(message):
    record = {
        "message_id": int(message.id),
        "date": int(message.date.timestamp()) if message.date else None,
        "text": message.message or "",
        "caption": message.message or "",
        "video": None,
        "photo_file_ids": [],
        "document": None,
    }

    media = message.media
    if isinstance(media, MessageMediaPhoto) and getattr(media, "photo", None):
        record["photo_file_ids"] = [str(media.photo.id)]
    elif isinstance(media, MessageMediaDocument) and getattr(media, "document", None):
        doc = media.document
        mime = str(getattr(doc, "mime_type", "") or "")
        file_id = str(doc.id)
        if mime.startswith("video/"):
            duration = None
            thumb_file_id = None
            for attr in getattr(doc, "attributes", []) or []:
                if hasattr(attr, "duration") and getattr(attr, "duration", None) is not None:
                    duration = int(attr.duration)
            thumbs = getattr(doc, "thumbs", None) or []
            if thumbs:
                thumb_file_id = f"{doc.id}-thumb"
            record["video"] = {
                "file_id": file_id,
                "mime_type": mime or "video/mp4",
                "duration": duration,
                "thumbnail_file_id": thumb_file_id,
            }
        else:
            record["document"] = {
                "file_id": file_id,
                "mime_type": mime,
            }
    return record


async def run():
    args = parse_args()
    api_id = int(require_env("TELEGRAM_API_ID"))
    api_hash = require_env("TELEGRAM_API_HASH")
    out_path = Path(args.output).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    client = TelegramClient(args.session, api_id, api_hash)
    await client.connect()
    if not await client.is_user_authorized():
        phone = (os.environ.get("TELEGRAM_PHONE") or "").strip()
        if not phone:
            raise RuntimeError("Missing TELEGRAM_PHONE for first-time login")
        sent = await client.send_code_request(phone)
        code = (os.environ.get("TELEGRAM_LOGIN_CODE") or "").strip()
        if not code:
            print(json.dumps({"ok": False, "need_code": True, "message": "OTP sent. Re-run with TELEGRAM_LOGIN_CODE."}))
            await client.disconnect()
            return
        try:
            await client.sign_in(phone=phone, code=code, phone_code_hash=sent.phone_code_hash)
        except SessionPasswordNeededError:
            password = (os.environ.get("TELEGRAM_2FA_PASSWORD") or "").strip()
            if not password:
                raise RuntimeError("Account has 2FA. Set TELEGRAM_2FA_PASSWORD and re-run.")
            await client.sign_in(password=password)

    entity = await client.get_entity(int(args.channel_id))

    exported = []
    async for msg in client.iter_messages(entity, limit=args.limit or None):
        if msg is None:
            continue
        if not msg.media and not msg.message:
            continue
        rec = serialize_message(msg)
        has_payload = bool(rec["video"] or rec["photo_file_ids"] or rec["document"])
        if not has_payload:
            continue
        exported.append(rec)

    exported.sort(key=lambda x: x["message_id"])
    payload = {
        "channel_id": str(args.channel_id),
        "count": len(exported),
        "items": exported,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "output": str(out_path), "count": len(exported)}))
    await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        sys.exit(1)
