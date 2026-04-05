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

    videos, images = pick_files(folder)
    if not videos:
        raise RuntimeError("No video files found in folder")

    base_title = args.channel_title.strip() if args.channel_title else folder.name
    unique_title = f"{base_title} | {time.strftime('%Y%m%d-%H%M%S')}"
    unique_title = slugify(unique_title).replace("-", " ")[:120]

    client = TelegramClient(session_name, api_id, api_hash)
    await client.start()

    created = await client(CreateChannelRequest(title=unique_title, about=f"Auto channel for {folder.name}", megagroup=True))
    channel = created.chats[0]
    channel_id = int(getattr(channel, "id", 0))
    if channel_id > 0:
        channel_id = int(f"-100{channel_id}")

    video_posts = []
    for video in videos:
        msg = await client.send_file(channel, str(video), caption=f"{args.post_title}\n{video.name}")
        video_posts.append(
            {
                "fileName": video.name,
                "path": str(video),
                "messageId": int(msg.id),
                "messageLink": to_message_link(channel_id, int(msg.id)),
                "sizeBytes": video.stat().st_size,
            }
        )

    chosen_images = images[:5]
    generated_paths = []
    if len(chosen_images) < 3 and ffmpeg_exists():
        thumb_dir = folder / ".auto_thumbs"
        generated_paths = generate_thumbnails(videos[0], thumb_dir, 5)
        chosen_images = (images + generated_paths)[:5]

    generated_set = {str(x) for x in generated_paths}
    thumb_posts = []
    for img in chosen_images[:5]:
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
    args = parser.parse_args()

    import asyncio

    try:
        asyncio.run(run(args))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
