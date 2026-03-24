# Deploy len VPS bang Docker

Tai lieu nay dung de chuan bi san truoc khi co VPS. Stack local hien tai van tiep tuc chay bang `docker-compose.yml`, con khi len VPS thi dung them `docker-compose.prod.yml`.

## File dung cho production

- Base stack: `docker-compose.yml`
- Production override: `docker-compose.prod.yml`
- Env mau: `.env.production.example`
- Nginx production: `nginx/prod.conf`

## Cach dung tren VPS

1. Copy file env:

```bash
cp .env.production.example .env.production
```

2. Dien day du bien production trong `.env.production`.

3. Build va chay stack:

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

4. Kiem tra health:

```bash
curl http://127.0.0.1/health
```

Neu VPS dung reverse proxy/TLS ben ngoai Docker, co the doi `WEB_HTTP_PORT` trong `.env.production` va map vao cong noi bo phu hop.

## Hanh vi production da duoc chuan bi san

- `APP_ENV=production`
- `TRUST_PROXY=true`
- `RUN_DB_PUSH_ON_START=false`
- `RUN_DB_SEED_ON_START=false`
- `admin-web` khong mo cong debug rieng ra host
- `web-gateway` dung `nginx/prod.conf` trung tinh hon file demo
- Postgres va backups co the chuyen sang bind mount de de backup tren host
- Cac cong debug trong file base chi bind vao `127.0.0.1`, tranh mo them cong phu ra internet

## Nhung viec can nho truoc khi go-live

- Dien `POSTGRES_PASSWORD` manh va khop voi `DATABASE_URL`
- Dien `SESSION_SECRET` dai va ngau nhien
- Dien dung `PUBLIC_BASE_URL`, `ADMIN_APP_URL`, `DISCORD_REDIRECT_URI`
- Build lai stack neu thay doi `VITE_API_BASE_URL`
- Khong bat `RUN_DB_PUSH_ON_START` tren production that tru khi ban chap nhan rui ro schema drift
- Khong expose cong `5432` ra internet

## Ghi chu cho giai doan chay tam trong Docker

Ban co the tiep tuc chay nhu cu:

```bash
docker compose up --build -d
```

Luc nay stack van dung `docker-compose.yml`, nen workflow hien tai khong bi anh huong.
