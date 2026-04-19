#!/usr/bin/env python3
import asyncio
import os
import re
import time
import uuid

import requests
from dotenv import load_dotenv
from telethon import Button, TelegramClient, events

load_dotenv()

API_ID = int(os.getenv("TELEGRAM_API_ID", "0") or 0)
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
SESSION_NAME = os.getenv("TELETHON_SESSION_PATH", "bot_manager_session")
BACKEND_URL = os.getenv("VITE_API_BASE_URL", "http://localhost:3000")
INTERNAL_SECRET = os.getenv("ADMIN_DEBUG_LOGIN_SECRET") or "internal-secret"

TOKEN_TTL_SECONDS = 60 * 30

client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
album_batches: dict[tuple[int, int], dict] = {}
pending_upload_tokens: dict[str, dict] = {}
awaiting_channel_name: dict[int, dict] = {}


def _to_telegram_chat_id_from_peer(peer) -> int | None:
    if peer is None:
        return None
    channel_id = getattr(peer, "channel_id", None)
    if isinstance(channel_id, int) and channel_id > 0:
        return int(f"-100{channel_id}")
    chat_id = getattr(peer, "chat_id", None)
    if isinstance(chat_id, int):
        return chat_id
    user_id = getattr(peer, "user_id", None)
    if isinstance(user_id, int):
        return user_id
    return None


def extract_forward_source(message) -> tuple[int, int] | None:
    fwd = getattr(message, "fwd_from", None)
    if not fwd:
        return None

    # Standard forwarded channel post
    source_message_id = getattr(fwd, "channel_post", None)
    source_chat_id = _to_telegram_chat_id_from_peer(getattr(fwd, "from_id", None))
    if isinstance(source_message_id, int) and source_message_id > 0 and isinstance(source_chat_id, int):
        return (source_chat_id, source_message_id)

    # Some forwards expose original source via saved_from_* fields
    saved_message_id = getattr(fwd, "saved_from_msg_id", None)
    saved_chat_id = _to_telegram_chat_id_from_peer(getattr(fwd, "saved_from_peer", None))
    if isinstance(saved_message_id, int) and saved_message_id > 0 and isinstance(saved_chat_id, int):
        return (saved_chat_id, saved_message_id)

    return None


def send_error_response(event, message, error):
    import traceback

    tb = traceback.format_exc()
    full_text = f"{message}: {str(error)}\n\nTraceback:\n{tb}"
    if len(full_text) > 4000:
        full_text = full_text[:3000] + "\n... (truncated) ...\n" + full_text[-500:]
    return event.respond(full_text)


def _actor_headers(actor_user_id: int):
    return {
        "x-internal-secret": INTERNAL_SECRET,
        "x-telegram-user-id": str(actor_user_id),
    }


def get_channels(actor_user_id: int):
    try:
        resp = requests.get(
            f"{BACKEND_URL}/api/admin/cinema/channels",
            headers=_actor_headers(actor_user_id),
            timeout=10,
        )
        if resp.ok:
            return [c for c in resp.json() if c["role"] == "FULL_SOURCE"]
        if resp.status_code == 403:
            return []
    except Exception as e:
        print(f"Error fetching channels: {e}")
    return []


def cleanup_expired_tokens():
    now = time.time()
    expired = [k for k, v in pending_upload_tokens.items() if (now - float(v.get("created_at", now))) > TOKEN_TTL_SECONDS]
    for key in expired:
        pending_upload_tokens.pop(key, None)


def create_upload_token(chat_id: int, actor_user_id: int, message_ids: list[int]) -> str:
    cleanup_expired_tokens()
    token = uuid.uuid4().hex[:10]
    pending_upload_tokens[token] = {
        "chat_id": int(chat_id),
        "actor_user_id": int(actor_user_id),
        "message_ids": [int(x) for x in message_ids if int(x) > 0],
        "created_at": time.time(),
    }
    return token


def build_channel_buttons(token: str, actor_user_id: int):
    channels = get_channels(actor_user_id)
    buttons = [[Button.inline(c["displayName"], data=f"upload_batch:{c['id']}:{token}")] for c in channels]
    buttons.append([Button.inline("🆕 Tao kenh moi va dua phim vao", data=f"create_auto_batch:{token}")])
    return buttons


async def send_batch_selector(chat_id: int, actor_user_id: int, message_ids: list[int]):
    channels = get_channels(actor_user_id)
    if not channels:
        await client.send_message(chat_id, "Ban khong co quyen upload/forward phim tren he thong.")
        return

    token = create_upload_token(chat_id, actor_user_id, message_ids)
    count = len(message_ids)
    text = f"Ban muon them {count} phim nay vao kenh nao?"
    await client.send_message(chat_id, text, buttons=build_channel_buttons(token, actor_user_id))


async def create_channel_and_upload_batch(event, actor_user_id: int, token: str, title: str):
    payload = pending_upload_tokens.get(token)
    if not payload:
        await event.respond("Yeu cau da het han, vui long gui lai phim (forward hoac upload truc tiep).")
        return
    if int(payload.get("actor_user_id", 0)) != int(actor_user_id):
        await event.respond("Yeu cau nay thuoc ve admin khac, ban khong the thao tac.")
        return
    message_ids = list(payload["message_ids"])
    title_clean = title.strip()
    if not title_clean:
        await event.respond("Ten kenh khong duoc de trong. Vui long nhap lai ten kenh.")
        return
    try:
        await event.respond("Dang tao kenh moi tren Telegram...")
        create_resp = requests.post(
            f"{BACKEND_URL}/api/admin/cinema/channels/create-auto",
            json={"title": title_clean},
            headers=_actor_headers(actor_user_id),
            timeout=60,
        )

        if not create_resp.ok:
            await event.respond(f"Loi khi tao kenh tu dong: {create_resp.text}")
            return

        new_channel = create_resp.json()
        await event.respond(f"Da tao kenh: {title_clean}. Dang dua phim vao kenh...")
        await perform_upload_batch(event, actor_user_id, new_channel["id"], message_ids)
        pending_upload_tokens.pop(token, None)
    except Exception as e:
        await send_error_response(event, "Loi khi tao kenh tu dong", e)


@client.on(events.NewMessage(pattern="/start"))
async def start(event):
    await event.respond("Chao mung Admin! Hay gui phim vao day (forward hoac upload truc tiep) de toi xu ly.")


@client.on(events.NewMessage)
async def handle_message(event):
    chat_id = int(event.chat_id)
    sender_id = int(getattr(event, "sender_id", 0) or 0)
    if sender_id <= 0:
        return
    text = (event.raw_text or "").strip()

    pending = awaiting_channel_name.get(chat_id)
    if pending and text and not text.startswith("/"):
        token = str(pending["token"])
        awaiting_channel_name.pop(chat_id, None)
        await create_channel_and_upload_batch(event, sender_id, token, text)
        return

    if not (event.message.video or event.message.document):
        return

    grouped_id = getattr(event.message, "grouped_id", None)
    if isinstance(grouped_id, int) and grouped_id > 0:
        key = (chat_id, int(grouped_id))
        batch = album_batches.get(key)
        if batch is None:
            batch = {"ids": set(), "task": None}
            album_batches[key] = batch
        batch["ids"].add(int(event.message.id))

        old_task = batch.get("task")
        if old_task:
            old_task.cancel()

        async def flush_album_batch():
            try:
                await asyncio.sleep(1.2)
                ids = sorted(list(batch["ids"]))
                if ids:
                    await send_batch_selector(chat_id, sender_id, ids)
            finally:
                album_batches.pop(key, None)

        batch["task"] = asyncio.create_task(flush_album_batch())
        return

    await send_batch_selector(chat_id, sender_id, [int(event.message.id)])


async def perform_upload_single_message(event, actor_user_id: int, channel_db_id: str, original_msg_id: int):
    try:
        source_chat_id: int | None = None
        source_message_id: int | None = None
        original_msg = await client.get_messages(int(event.chat_id), ids=int(original_msg_id))
        if original_msg:
            extracted = extract_forward_source(original_msg)
            if extracted:
                source_chat_id, source_message_id = extracted

        if source_chat_id is None or source_message_id is None:
            return (
                "Khong xac dinh duoc nguon forward goc. "
                "Hay forward truc tiep tu kenh nguon khong an danh nguon (khong protect content)."
            )

        copy_resp = requests.post(
            f"{BACKEND_URL}/api/admin/cinema/admin-copy",
            json={
                "fromChatId": str(source_chat_id),
                "messageId": str(source_message_id),
                "targetChannelId": channel_db_id,
            },
            headers=_actor_headers(actor_user_id),
            timeout=60,
        )

        if copy_resp.ok:
            return None
        return f"Admin copy failed: {copy_resp.text}"
    except Exception as e:
        return str(e)


async def perform_upload_batch(event, actor_user_id: int, channel_db_id: str, message_ids: list[int]):
    total = len(message_ids)
    if total == 0:
        await event.respond("Khong tim thay phim hop le trong batch.")
        return

    progress_msg = await event.respond(f"Dang xu ly {total} phim boi tai khoan Admin...")
    failed = 0
    first_error = ""
    for idx, msg_id in enumerate(message_ids, start=1):
        await progress_msg.edit(f"Dang sao chep phim {idx}/{total} vao kho luu tru...")
        err = await perform_upload_single_message(event, actor_user_id, channel_db_id, int(msg_id))
        if err:
            failed += 1
            if not first_error:
                first_error = err

    if failed == 0:
        await progress_msg.edit(f"Hoan tat: {total}/{total} phim da dua vao kho.")
        await event.respond(f"Thanh cong! Da dua {total}/{total} phim vao kho va cap nhat he thong.")
    else:
        ok = total - failed
        await progress_msg.edit(f"Hoan tat mot phan: {ok}/{total} phim thanh cong, {failed} loi.")
        await event.respond(f"Hoan tat mot phan: {ok}/{total} phim thanh cong, {failed} loi. Loi dau tien: {first_error}")


@client.on(events.CallbackQuery(data=re.compile(b"upload_batch:.*")))
async def callback_upload_batch(event):
    actor_user_id = int(getattr(event, "sender_id", 0) or 0)
    if actor_user_id <= 0:
        await event.edit("Khong xac dinh duoc admin thuc hien thao tac.")
        return
    data = event.data.decode().split(":")
    channel_db_id = data[1]
    token = data[2]
    payload = pending_upload_tokens.get(token)
    if not payload:
        await event.edit("Yeu cau da het han, vui long gui lai phim (forward hoac upload truc tiep).")
        return
    if int(payload.get("actor_user_id", 0)) != actor_user_id:
        await event.edit("Yeu cau nay thuoc ve admin khac, ban khong the thao tac.")
        return

    message_ids = list(payload["message_ids"])
    await perform_upload_batch(event, actor_user_id, channel_db_id, message_ids)
    pending_upload_tokens.pop(token, None)


@client.on(events.CallbackQuery(data=re.compile(b"create_auto_batch:.*")))
async def callback_create_auto_batch(event):
    actor_user_id = int(getattr(event, "sender_id", 0) or 0)
    if actor_user_id <= 0:
        await event.edit("Khong xac dinh duoc admin thuc hien thao tac.")
        return
    data = event.data.decode().split(":")
    token = data[1]
    payload = pending_upload_tokens.get(token)
    if not payload:
        await event.edit("Yeu cau da het han, vui long gui lai phim (forward hoac upload truc tiep).")
        return
    if int(payload.get("actor_user_id", 0)) != actor_user_id:
        await event.edit("Yeu cau nay thuoc ve admin khac, ban khong the thao tac.")
        return

    chat_id = int(payload["chat_id"])
    awaiting_channel_name[chat_id] = {"token": token, "created_at": time.time()}
    await event.edit("Vui long nhap ten kenh moi (gui 1 tin nhan text de xac nhan).")


if __name__ == "__main__":
    print("Bot is starting...")
    client.start(bot_token=BOT_TOKEN)
    client.run_until_disconnected()
