# n8n Movie Folder Automation (upload phim lon)

Workflow nay dung cho quy trinh:

1. Nhap `folder path` + `ten bai` tren web form n8n.
2. Tu dong tao kenh Telegram rieng cho thu muc.
3. Upload phim dung luong lon len Telegram bang Telethon user session.
4. Lay link de day len Snote.
5. Tao 3 link rut gon.
6. Dang bai qua Telegram + Discord.

## 1) Yeu cau

- Python 3.10+
- `ffmpeg` trong PATH (de sinh thumbnail khi thu muc khong du anh)
- Cac package Python:

```powershell
pip install telethon
```

## 2) Bien moi truong

Them vao `.env`:

- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`
- `TELEGRAM_USER_SESSION` (mac dinh `user_session`)
- `SNOTE_API_URL`
- `SNOTE_API_KEY`
- `SHORTENER_API_URL`
- `SHORTENER_API_KEY`
- `DISCORD_WEBHOOK_URL`
- `TELEGRAM_TARGET_CHAT_ID`

## 3) User session de upload file lon

Script uploader dung user session Telethon (khong dung bot token cho upload file lon).

Lan dau tien, chay test script de login:

```powershell
python scripts/telegram_large_uploader.py --folder "D:\movies\sample" --post-title "test"
```

Telethon se yeu cau xac thuc va tao file session (`user_session.session`).

## 4) Import workflow

Import file:

- [movie-folder-automation.json](/D:/discordvip-cinema/n8n/workflows/movie-folder-automation.json)

Sau khi import:

1. Gan Telegram credential cho node `Telegram Publish`.
2. Kiem tra node `Execute Large Uploader` co command Python dung voi may.
3. Active workflow.

## 5) Dung web form

Form path:

- `/form/movie-folder-upload`

Truong nhap:

- `Folder Path` (bat buoc)
- `Post Title` (bat buoc)
- `Post Description` (tuy chon)
- `Channel Title (Optional)` (tuy chon)

## 6) Thumbnail

- Neu thu muc co anh (`jpg/jpeg/png/webp`), workflow lay toi da 5 anh dau.
- Neu < 3 anh, script tu dong cat anh tu video bang `ffmpeg` vao `.<auto_thumbs>`.

## 7) Luu y van hanh

- Moi lan submit form, script tao 1 kenh Telegram moi theo ten folder + timestamp.
- Link dang `https://t.me/c/...` la link noi bo (nguoi xem can co quyen trong kenh).
- Neu can link public, can channel public + username, hoac mot gateway trung gian tren Snote.
