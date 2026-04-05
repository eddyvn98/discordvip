# Discord VIP Bot + SePay

Monorepo gồm:

- `apps/server`: Discord bot, webhook SePay, API admin, scheduler gỡ role hết hạn.
- `apps/admin`: Admin panel React cho dashboard, lịch sử giao dịch và xử lý pending.
- `docker-compose.yml`: Chạy `postgres`, `app-server`, `admin-web`.

## Chức năng chính

- Slash commands: `/buyvip`, `/trialvip`, `/vipstatus`
- Gửi QR thanh toán với nội dung `VIP <order_code>`
- Nhận webhook SePay và đối soát giao dịch theo `order_code`
- Tự động cấp/gỡ role VIP theo thời hạn
- Trial 24h, 1 lần mỗi Discord account
- Admin panel với Discord OAuth

## Chạy local

1. Copy `.env.example` thành `.env` và điền token/secrets.
   Admin panel luôn đăng nhập qua Discord OAuth.
   Nếu muốn bảo trì UI nhanh ở `dev/staging`, có thể bật debug login riêng:

   ```bash
   APP_ENV=development
   ADMIN_DEBUG_LOGIN_ENABLED=true
   ADMIN_DEBUG_LOGIN_SECRET=your-strong-debug-secret
   VITE_ENABLE_DEBUG_LOGIN=true
   ```
   Có thể bắt đầu từ mẫu [`.env.staging.example`](/D:/discordvip/.env.staging.example) cho staging.
2. Cài dependency:

   ```bash
   npm install
   ```

3. Chạy server:

   ```bash
   npm run dev:server
   ```

4. Chạy admin:

   ```bash
   npm run dev:admin
   ```

   Có thể đổi cổng/admin API bằng `apps/admin/.env`:

   ```bash
   VITE_API_BASE_URL=http://localhost:4510
   VITE_PORT=4511
   ```

## Docker

```bash
docker compose up --build
```

Production / VPS:

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Tai lieu van hanh:
- `docs/vps-khuyen-nghi-va-database.md`: Cau hinh VPS khuyen nghi va noi luu/backup database.
- `docs/database-access.md`: Cach truy cap PostgreSQL sau khi da khoa port public va cach dung SSH tunnel / docker exec.
- `docs/deploy-vps-docker.md`: Cach dung `docker-compose.prod.yml` va `.env.production` khi len VPS.
- `docs/go-live-checklist-vps.md`: Checklist ngan de di tu luc mua VPS den luc go-live.
- `docs/n8n-workflow-telegram-snote-discord.md`: Huong dan setup workflow tu dong Telegram -> Snote -> rut gon link -> Telegram/Discord.
- `docs/n8n-movie-folder-automation.md`: Workflow web form nhap folder path, upload phim lon Telegram, day Snote, rut gon link, dang Discord/Telegram.

### Sao luu database tu dong

Stack Docker da co san service `db-backup`:
- Tu dong backup ngay khi khoi dong stack
- Chay dinh ky theo cron (mac dinh: `03:00` moi ngay)
- Luu file tai thu muc host `./backups` (dinh dang `.sql.gz`)
- Tu dong xoa ban backup cu qua so ngay giu (mac dinh: 14 ngay)

Co the tuy chinh trong file `.env`:

```bash
POSTGRES_DB=discordvip
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
BACKUP_CRON=0 3 * * *
BACKUP_RETENTION_DAYS=14
```

Khoi phuc tu file backup:

```bash
gzip -dc ./backups/<file>.sql.gz | docker exec -i discordvip-postgres-1 psql -U postgres -d discordvip
```

### Migration 1-click (may cu -> may moi)

Export tren may cu:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\migration-export.ps1 -Mode local
```

Hoac production:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\migration-export.ps1 -Mode production
```

Script se tao file zip trong thu muc `.\migration-artifacts`.

Import tren may moi:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\migration-import.ps1 -ArchivePath .\migration-artifacts\<ten-file>.zip -DestinationPath D:\discordvip
```

Neu muon chay production tren may moi:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\migration-import.ps1 -ArchivePath .\migration-artifacts\<ten-file>.zip -DestinationPath D:\discordvip -Mode production
```

### Chế độ xác nhận thủ công

- Đặt `PAYMENT_MODE=manual` để bỏ qua SePay trước mắt.
- User vẫn tạo order bằng `/buyvip`.
- Admin vào màn `Pending` để xác nhận order thủ công và cấp VIP.

### Cloudflare Tunnel với Docker

1. Dùng file demo:

   ```bash
   Copy-Item .env.demo .env.demo.local
   ```

2. Sửa `.env.demo.local`:
   - `PUBLIC_BASE_URL=https://demo.your-domain.com`
   - `ADMIN_APP_URL=https://demo.your-domain.com`
   - `DISCORD_REDIRECT_URI=https://demo.your-domain.com/api/auth/discord/callback`
   - `SESSION_SECRET=...`
   - `CLOUDFLARE_TUNNEL_TOKEN=...`

3. Tạo tunnel trong Cloudflare Zero Trust Dashboard.
4. Thêm public hostname duy nhất:
   - `demo.your-domain.com` trỏ tới `http://web-gateway:8080`
5. Build và chạy demo:

   ```bash
   docker compose --env-file .env.demo.local up --build -d
   ```

6. Chạy thêm tunnel:

   ```bash
   docker compose --env-file .env.demo.local --profile tunnel up -d cloudflared
   ```

Container `app-server` tự chạy:

- `prisma generate`
- `prisma db push`
- `prisma db seed`
- start app production

## Cấu hình Discord

- Tạo bot và bật quyền `Guilds`, `GuildMembers`.
- Invite bot vào server với quyền quản lý role phù hợp.
- Đặt role của bot cao hơn role VIP.
- Cập nhật `DISCORD_GUILD_ID`, `DISCORD_VIP_ROLE_ID`, `DISCORD_CLIENT_ID`.

## Cấu hình SePay cá nhân

- Trỏ webhook SePay tới `POST /api/webhooks/sepay`
- Nội dung chuyển khoản bắt buộc đúng mẫu `VIP <order_code>`
- Nếu SePay hỗ trợ secret/signature, điền `SEPAY_WEBHOOK_SECRET`

## Admin panel

- Đăng nhập qua Discord OAuth
- Chỉ user có trong `ADMIN_DISCORD_IDS` hoặc giữ `DISCORD_ADMIN_ROLE_ID` mới truy cập được
- Màn hình: dashboard, transactions, memberships, pending
- Cách vào sau khi cấu hình:
  - Mở `ADMIN_APP_URL`
  - Bấm `Đăng nhập với Discord`
  - Discord sẽ gọi về `DISCORD_REDIRECT_URI`
  - Sau khi xác thực xong, hệ thống chỉ redirect về cùng origin của `ADMIN_APP_URL`
- Với `dev/staging`, có thể bật debug login riêng bằng secret; không dùng trên production
