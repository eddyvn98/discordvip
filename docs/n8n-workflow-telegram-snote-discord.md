# n8n workflow: Telegram -> Snote -> Shorten -> Telegram + Discord

## 1) Dien bien moi truong (.env)

Cap nhat `.env` tu cac key trong `.env.example`:

- `TELEGRAM_SOURCE_CHANNEL_USERNAME`: username kenh nguon Telegram (khong co @)
- `TELEGRAM_TARGET_CHAT_ID`: chat id kenh dang bai Telegram dich
- `DISCORD_WEBHOOK_URL`: webhook kenh Discord dich
- `SNOTE_API_URL`: endpoint POST tao bai viet Snote
- `SNOTE_API_KEY`: API key cho Snote
- `SHORTENER_API_URL`: endpoint POST rut gon link
- `SHORTENER_API_KEY`: API key dich vu rut gon
- `N8N_ENCRYPTION_KEY`: chuoi bi mat dai, ngau nhien

## 2) Chay n8n trong stack

```powershell
docker compose up -d n8n
```

Mo editor:

- `http://localhost:5678`

## 3) Import workflow mau

File workflow da co san:

- `/workflows/telegram-snote-discord.json` (trong container)
- `D:\discordvip-cinema\n8n\workflows\telegram-snote-discord.json` (tren host)

Trong n8n:

1. Import file JSON.
2. Gan credential Telegram cho 2 node:
   - `Telegram Trigger`
   - `Telegram Publish`
3. Test tay bang cach gui 1 message co file + caption vao kenh nguon.
4. Activate workflow.

## 4) Dinh dang caption dau vao

Dong 1: ten phim  
Dong 2 tro di: mo ta (tuy chon)

Workflow se:

1. Lay thong tin tu Telegram message.
2. Goi Snote API de tao bai viet.
3. Tao 3 link rut gon (delay 1.2s giua moi lan goi).
4. Dang noi dung sang Telegram + Discord.

## 5) Contract API de map nhanh

Snote API can tra ve mot trong cac truong link:

- `url`
- `link`
- `data.url`
- `data.link`
- `postUrl`

Shortener API can tra ve mot trong cac truong:

- `shortUrl`
- `short_url`
- `link`
- `url`

Neu shortener loi, workflow tu dong fallback ve link Snote goc.
