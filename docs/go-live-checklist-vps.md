# Go-Live Checklist VPS

Checklist nay dung cho luc ban da san sang thue VPS va muon dua stack Docker hien tai len production voi it thao tac nhat.

## 1. Truoc khi mua VPS

- Xac nhan se dung `docker-compose.prod.yml`
- Xac nhan da co file mau [.env.production.example](/D:/discordvip/.env.production.example)
- Chot domain se dung cho he thong
- Chot cach public web:
  - Nginx/SSL tren VPS
  - Hoac Cloudflare Tunnel
- Chot cau hinh VPS toi thieu:
  - Nen dung `2 vCPU / 4 GB RAM / 50 GB SSD`

## 2. Ngay sau khi mua VPS

- Cai Docker Engine
- Cai Docker Compose plugin
- Clone repo ve VPS
- Tao thu muc du lieu:
  - `/opt/discordvip/postgres-data`
  - `/opt/discordvip/backups`
- Bat firewall:
  - Mo `22`
  - Mo `80`
  - Mo `443` neu dung HTTPS tren VPS
  - Khong mo `5432`

## 3. Chuan bi env production

- Copy:

```bash
cp .env.production.example .env.production
```

- Dien cac bien bat buoc:
  - `POSTGRES_PASSWORD`
  - `SESSION_SECRET`
  - `DATABASE_URL`
  - `PUBLIC_BASE_URL`
  - `ADMIN_APP_URL`
  - `DISCORD_REDIRECT_URI`
  - `DISCORD_BOT_TOKEN`
  - `DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_SECRET`
  - `DISCORD_GUILD_ID`
  - `DISCORD_VIP_ROLE_ID`
  - `DISCORD_ADMIN_ROLE_ID` hoac `ADMIN_DISCORD_IDS`

- Kiem tra cac bien production phai dung:
  - `APP_ENV=production`
  - `TRUST_PROXY=true`
  - `RUN_DB_PUSH_ON_START=false`
  - `RUN_DB_SEED_ON_START=false`
  - `ADMIN_DEBUG_LOGIN_ENABLED=false`
  - `DEV_BYPASS_ADMIN_AUTH=false`

## 4. Chuan bi dich vu ngoai he thong

- Discord Developer Portal:
  - Cap nhat OAuth redirect URL dung voi domain production
- Discord server:
  - Bot da vao dung guild
  - Role bot cao hon role VIP
- SePay:
  - Webhook tro dung ve `/api/webhooks/sepay`

## 5. Deploy lan dau

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Kiem tra:

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml ps
curl http://127.0.0.1/health
docker logs discordvip-app-server-1 --tail 100
docker logs discordvip-db-backup-1 --tail 50
```

## 6. Truoc khi public domain

- Xac nhan admin web mo duoc
- Xac nhan login Discord thanh cong
- Xac nhan session giu duoc sau redirect
- Xac nhan bot online trong Discord
- Xac nhan tao order duoc
- Xac nhan webhook SePay vao dung
- Xac nhan cap VIP / go VIP chay dung
- Xac nhan backup DB sinh file trong thu muc backup

## 7. Sau khi go-live

- Luu an toan file `.env.production`
- Luu thong tin SSH/VPS
- Thu restore 1 file backup de chac backup dung duoc
- Theo doi:
  - CPU
  - RAM
  - Disk
  - Log app
  - Backup hang ngay

## 8. Lenh can nho

Deploy:

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Xem trang thai:

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml ps
```

Xem log app:

```bash
docker logs discordvip-app-server-1 --tail 100
```

Xem log backup:

```bash
docker logs discordvip-db-backup-1 --tail 50
```
