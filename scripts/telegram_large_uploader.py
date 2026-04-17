#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

from telethon import TelegramClient
from telethon.tl.functions.channels import CreateChannelRequest

VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".mov", ".m4v", ".ts", ".webm"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "movie-folder"


def to_message_link(channel_id: int, message_id: int) -> str:
    internal = str(channel_id)
    if internal.startswith("-100"):
        internal = internal[4:]
    else:
        internal = internal.lstrip("-")
    return f"https://t.me/c/{internal}/{message_id}"


def pick_files(folder: Path):
    videos = []
    images = []
    for root, _, files in os.walk(folder):
        for name in files:
            p = Path(root) / name
            ext = p.suffix.lower()
            if ext in VIDEO_EXTS:
                videos.append(p)
            elif ext in IMAGE_EXTS:
                images.append(p)
    videos.sort(key=lambda p: p.name.lower())
    images.sort(key=lambda p: p.name.lower())
    return videos, images


def ffmpeg_exists() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, check=False)
        return True
    except Exception:
        return False


def generate_thumbnails(video: Path, out_dir: Path, count: int = 5):
    out_dir.mkdir(parents=True, exist_ok=True)
    created = []
    marks = [5, 20, 40, 70, 110][:count]
    for i, sec in enumerate(marks, start=1):
        out_file = out_dir / f"thumb_{i}.jpg"
        cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            str(sec),
            "-i",
            str(video),
            "-frames:v",
            "1",
            "-q:v",
            "2",
            str(out_file),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if res.returncode == 0 and out_file.exists():
            created.append(out_file)
    return created


async def run(args):
    api_id = int(os.environ.get("TELEGRAM_API_ID", "0") or "0")
    api_hash = os.environ.get("TELEGRAM_API_HASH", "").strip()
    session_name = os.environ.get("TELEGRAM_USER_SESSION", "user_session")

    if not api_id or not api_hash:
        raise RuntimeError("Missing TELEGRAM_API_ID or TELEGRAM_API_HASH")

    folder = Path(args.folder).resolve()
    if not folder.exists() or not folder.is_dir():
        raise RuntimeError(f"Folder not found: {folder}")

    print(f"[*] Quét thư mục: {folder}", file=sys.stderr, flush=True)
    videos, images = pick_files(folder)
    print(f"[*] Tìm thấy {len(videos)} video và {len(images)} ảnh.", file=sys.stderr, flush=True)
    if not videos:
        raise RuntimeError("No video files found in folder")

    base_title = args.channel_title.strip() if args.channel_title else folder.name
    # Sử dụng tên folder trực tiếp làm tên kênh theo yêu cầu của user
    unique_title = base_title[:120]

    print(f"[*] Đang kết nối Telegram (Session: {session_name})...", file=sys.stderr, flush=True)
    client = TelegramClient(session_name, api_id, api_hash)
    await client.start()
    print("[*] Đăng nhập Telegram thành công.", file=sys.stderr, flush=True)

    # Channel selection: use provided ID or create new
    channel_id_input = args.channel_id.strip() if args.channel_id else ""
    channel = None
    
    if channel_id_input:
        print(f"[*] Sử dụng channel có sẵn ID: {channel_id_input}", file=sys.stderr, flush=True)
        try:
            # Try to get entity by ID. Needs to be int for Telethon if it's a numeric ID
            try:
                target = int(channel_id_input)
            except ValueError:
                target = channel_id_input
            channel = await client.get_entity(target)
            channel_id = int(getattr(channel, "id", 0))
            if channel_id > 0:
                channel_id = int(f"-100{channel_id}")
            print(f"[*] Đã nhận diện channel: {getattr(channel, 'title', 'Unknown')}", file=sys.stderr, flush=True)
        except Exception as e:
            print(f"[!] Không tìm thấy channel ID {channel_id_input}: {e}", file=sys.stderr, flush=True)
            raise RuntimeError(f"Channel not found or inaccessible: {channel_id_input}")
    else:
        print(f"[*] Đang tạo channel mới: {unique_title}", file=sys.stderr, flush=True)
        # Tạo kênh Private (không set username). megagroup=True tạo group lớn (Suppergroup/Channel).
        created = await client(CreateChannelRequest(title=unique_title, about=f"Cinema Channel: {unique_title}", megagroup=True))
        channel = created.chats[0]
        channel_id = int(getattr(channel, "id", 0))
        if channel_id > 0:
            channel_id = int(f"-100{channel_id}")


    # Deduplication logic: scan existing messages to find already uploaded files
    existing_videos = {}
    existing_thumbs = set()
    
    print(f"[*] Đang quét tin nhắn cũ trên channel để tránh upload trùng...", file=sys.stderr, flush=True)
    async for msg in client.iter_messages(channel, limit=500):
        if not msg.message:
            continue
        
        # Video captions: "{title}\n{filename}"
        # Thumb captions: "thumb:{filename}"
        text = msg.message.strip()
        if text.startswith("thumb:"):
            existing_thumbs.add(text[6:])
        else:
            lines = text.split("\n")
            if len(lines) >= 2:
                fname = lines[-1].strip()
                existing_videos[fname] = {
                    "messageId": int(msg.id),
                    "messageLink": to_message_link(channel_id, int(msg.id))
                }

    video_posts = []
    for video in videos:
        if video.name in existing_videos:
            print(f"[-] Bỏ qua video đã có: {video.name}", file=sys.stderr, flush=True)
            info = existing_videos[video.name]
            video_posts.append({
                "fileName": video.name,
                "path": str(video),
                "messageId": info["messageId"],
                "messageLink": info["messageLink"],
                "sizeBytes": video.stat().st_size,
            })
        else:
            print(f"[+] Đang upload video: {video.name}", file=sys.stderr, flush=True)
            msg = await client.send_file(channel, str(video), caption=f"{args.post_title}\n{video.name}")
            video_posts.append({
                "fileName": video.name,
                "path": str(video),
                "messageId": int(msg.id),
                "messageLink": to_message_link(channel_id, int(msg.id)),
                "sizeBytes": video.stat().st_size,
            })

    chosen_images = images[:5]
    generated_paths = []
    if len(chosen_images) < 3 and ffmpeg_exists():
        import tempfile
        tmp_root = Path(tempfile.gettempdir()) / "cinema_thumbs"
        thumb_dir = tmp_root / slugify(folder.name)
        generated_paths = generate_thumbnails(videos[0], thumb_dir, 5)
        chosen_images = (images + generated_paths)[:5]

    generated_set = {str(x) for x in generated_paths}
    thumb_posts = []
    for img in chosen_images[:5]:
        if img.name in existing_thumbs:
            print(f"[-] Bỏ qua ảnh đã có: {img.name}", file=sys.stderr, flush=True)
            # For thumbs, we don't strictly need the message link in our DB for now 
            # as they are usually just for preview, but we can't easily get the link 
            # unless we stored it in the scan above. Let's just skip upload.
            continue
            
        print(f"[+] Đang upload ảnh: {img.name}", file=sys.stderr, flush=True)
        msg = await client.send_file(channel, str(img), caption=f"thumb:{img.name}")
        thumb_posts.append(
            {
                "fileName": img.name,
                "path": str(img),
                "messageId": int(msg.id),
                "messageLink": to_message_link(channel_id, int(msg.id)),
                "generated": str(img) in generated_set,
            }
        )


    await client.disconnect()

    result = {
        "channelTitle": unique_title,
        "channelId": str(channel_id),
        "folder": str(folder),
        "postTitle": args.post_title,
        "postDescription": args.post_description,
        "videoCount": len(video_posts),
        "videos": video_posts,
        "videoLinks": [v["messageLink"] for v in video_posts],
        "primaryVideoLink": video_posts[0]["messageLink"],
        "thumbnails": thumb_posts,
    }
    print(json.dumps(result, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Upload local movie folder to Telegram with large-file user session")
    parser.add_argument("--folder", required=True, help="Absolute folder path")
    parser.add_argument("--post-title", required=True, help="Post title")
    parser.add_argument("--post-description", default="", help="Post description")
    parser.add_argument("--channel-title", default="", help="Override channel title")
    parser.add_argument("--channel-id", default="", help="Existing Telegram channel ID to reuse")
    args = parser.parse_args()

    import asyncio

    try:
        asyncio.run(run(args))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
