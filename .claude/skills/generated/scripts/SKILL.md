---
name: scripts
description: "Skill for the Scripts area of discordvip-cinema-web. 42 symbols across 6 files."
---

# Scripts

42 symbols | 6 files | Cohesion: 95%

## When to Use

- Working with code in `scripts/`
- Understanding how get_client, parse_range, check_channel work
- Modifying scripts-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `scripts/telegram_bot_manager.py` | _to_telegram_chat_id_from_peer, extract_forward_source, send_error_response, create_channel_and_upload_batch, perform_upload_single_message (+9) |
| `scripts/telethon_stream_server.py` | get_client, parse_range, check_channel, get_channel_stats, get_message_info (+8) |
| `scripts/telegram_large_uploader.py` | slugify, to_message_link, pick_files, ffmpeg_exists, generate_thumbnails (+2) |
| `scripts/export_telegram_history_telethon.py` | parse_args, require_env, serialize_message, run |
| `scripts/import-telefilm-list.mjs` | parseMovieLines, main |
| `scripts/import-telefilm-db-json.mjs` | toDisplayTitle, main |

## Entry Points

Start here when exploring this area:

- **`get_client`** (Function) — `scripts/telethon_stream_server.py:32`
- **`parse_range`** (Function) — `scripts/telethon_stream_server.py:44`
- **`check_channel`** (Function) — `scripts/telethon_stream_server.py:69`
- **`get_channel_stats`** (Function) — `scripts/telethon_stream_server.py:80`
- **`get_message_info`** (Function) — `scripts/telethon_stream_server.py:90`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `CreateChannelRequest` | Class | `scripts/telethon_stream_server.py` | 17 |
| `get_client` | Function | `scripts/telethon_stream_server.py` | 32 |
| `parse_range` | Function | `scripts/telethon_stream_server.py` | 44 |
| `check_channel` | Function | `scripts/telethon_stream_server.py` | 69 |
| `get_channel_stats` | Function | `scripts/telethon_stream_server.py` | 80 |
| `get_message_info` | Function | `scripts/telethon_stream_server.py` | 90 |
| `check_message` | Function | `scripts/telethon_stream_server.py` | 137 |
| `create_channel` | Function | `scripts/telethon_stream_server.py` | 146 |
| `setup_bot_admin` | Function | `scripts/telethon_stream_server.py` | 174 |
| `stream_by_message` | Function | `scripts/telethon_stream_server.py` | 226 |
| `iterator` | Function | `scripts/telethon_stream_server.py` | 244 |
| `get_me` | Function | `scripts/telethon_stream_server.py` | 267 |
| `copy_message` | Function | `scripts/telethon_stream_server.py` | 277 |
| `slugify` | Function | `scripts/telegram_large_uploader.py` | 17 |
| `to_message_link` | Function | `scripts/telegram_large_uploader.py` | 24 |
| `pick_files` | Function | `scripts/telegram_large_uploader.py` | 33 |
| `ffmpeg_exists` | Function | `scripts/telegram_large_uploader.py` | 49 |
| `generate_thumbnails` | Function | `scripts/telegram_large_uploader.py` | 57 |
| `run` | Function | `scripts/telegram_large_uploader.py` | 82 |
| `extract_forward_source` | Function | `scripts/telegram_bot_manager.py` | 43 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Handle_message → _to_telegram_chat_id_from_peer` | cross_community | 6 |
| `Handle_message → Cleanup_expired_tokens` | intra_community | 5 |
| `Handle_message → Get_channels` | intra_community | 5 |

## How to Explore

1. `gitnexus_context({name: "get_client"})` — see callers and callees
2. `gitnexus_query({query: "scripts"})` — find related execution flows
3. Read key files listed above for implementation details
