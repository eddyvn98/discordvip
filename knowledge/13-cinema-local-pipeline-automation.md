# Local Cinema Pipeline Automation & Multi-Codebase Isolation

**Tags:** `docker` `automation` `telegram` `cinema` `port-mapping` `python-spawning`

## Problem
Deploying a secondary instance of the Cinema Web project on the same host while automating local movie uploads from external drives (e.g., `E:\`) to Telegram.

## Solutions & Best Practices

### 1. Multi-Codebase Isolation (Port Remapping)
To run a cloned project alongside the original without conflicts:
- **PostgreSQL:** Map `5434:5432` and update `DATABASE_URL` in `.env`.
- **Nginx/Web Gateway:** Map `8081:8080`.
- **Admin UI:** Map `13002:4173`.
- **CORS:** Ensure `app.ts` includes the new Admin port (`localhost:13002`) in allowed origins.

### 2. External Drive Access in Docker
Mounting Windows drives to Linux containers:
- **Mapping:** Use `- E:\:/mnt/e:ro` in `docker-compose.yml` for stability (read-only prevents accidental data loss).
- **Processing Workaround:** If a script needs to generate temporary files (like thumbnails), use the container's `/tmp` directory instead of the source directory to avoid `Errno 30: Read-only file system`.

### 3. Headless Telegram Authentication
Telethon's `client.start()` may prompt for a phone/OTP in the terminal, causing background jobs to hang:
- **Interactive Login:** Run an interactive shell command once to authenticate: `docker compose exec -it app-server python3 /app/scripts/your_script.py`.
- **Session Persistence:** Ensure the `.session` file is mounted/persisted so the login remains valid across container restarts.

### 4. Robust Child Process Spawning (Node.js -> Python)
- **Binary Check:** Always use `python3` instead of `python` in Linux/Alpine environments.
- **Crash Protection:** Attach an `.on('error', ...)` listener to the `spawn` instance to prevent `ENOENT` (executable not found) from crashing the main Node.js process.
- **Log Isolation:** Print debug info/status logs to `sys.stderr` and only the final result (JSON) to `sys.stdout`. This allows the Node.js backend to cleanly parse `stdout` without filtering out "noise" logs.

### 5. Docker Volume & Build Sync
- When using volumes (`.:/app`), local builds on the host (`dist/` folder) will immediately reflect inside the container. 
- If changes aren't appearing, explicitly run `npm run build` on the host and `docker compose restart`.

## Implementation Reference
- Related Script: `scripts/telegram_large_uploader.py`
- Related Service: `apps/server/src/services/cinema/cinema-scan-job-service.ts`
