# Startup and Verification Guide (AI Maintenance)

**Tags:** `maintenance` `startup-procedure` `verification-checklist` `docker` `troubleshooting`

This document serves as the primary instructions for any AI assistant tasked with starting or maintaining this project to ensure the "Stable Deployment" state is preserved.

## 🏗️ Pre-Flight Check
Before running any Docker commands, ensure:
1. **Ports are Available:** Check for 5434 (Postgres), 8081 (Web Gateway), and 13002 (Admin).
2. **Environment File:** `.env` must exist with correct `DATABASE_URL` (pointing to `postgres:5432` for internal or `localhost:5434` for external).
3. **External Drive:** If local upload is needed, ensure the mapped drive (e.g., `E:\`) is connected to the host.

## 🚀 Startup Procedure (The "Clean" Way)
To ensure code changes on the host are properly reflected in the container:
1. **Build on Host:**
   ```bash
   npm run build -w @discordvip/server
   ```
2. **Start Docker:**
   ```bash
   docker compose up -d
   ```
3. **Force Refresh (If needed):**
   If logic seems old, run `docker compose build app-server --no-cache` followed by `docker compose up -d`.

## 🛠️ Telegram Authentication (Critical)
If the Cinema Upload job stays in `RUNNING` with no progress:
1. **Check Logs:** `docker compose logs -f app-server`.
2. **Look for:** `Please enter your phone (or bot token):`.
3. **Manual Login:** Run interactive shell:
   ```bash
   docker compose exec -it app-server python3 /app/scripts/telegram_large_uploader.py --folder "/mnt/e/your_test_folder" --post-title "LoginTest"
   ```
4. **Action:** Enter Phone/OTP in that shell. Once done, the `.session` file is valid.

## ✅ Verification Checklist
After startup, always perform these checks:
1. **Admin UI:** Access [http://localhost:13002/cinema](http://localhost:13002/cinema). If 502, wait 10s for `admin-web` container.
2. **Web Phim:** Access [http://localhost:8081](http://localhost:8081). Root `/` should show the movie list, not the admin login.
3. **Database:** Run a simple query to ensure `CinemaScanJob` can be read.
4. **Local Scan Test:** 
   - Enter a valid path (e.g., `/mnt/e/linh tinh`).
   - Click "Bắt đầu tải & đồng bộ".
   - Confirm it transitions to `SUCCEEDED` and prints log from Python to the server console.
5. **Playback:** Open a movie on the web and click Play.

## ⚠️ Common Pitfalls to Avoid
- **DO NOT** use `python` command; always use `python3`.
- **DO NOT** commit `.session` files or `.env` files.
- **DO NOT** change the `E:\` mount to read-write unless absolutely necessary; use `/tmp` for scratch work.
- **DO NOT** remove the `.on('error')` listener in `CinemaScanJobService` or the server will crash on missing binaries.
