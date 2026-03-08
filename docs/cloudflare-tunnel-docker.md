# Docker + Cloudflare Tunnel

Tài liệu này dùng cho trường hợp chạy `app-server` và `admin-web` bằng Docker, đặt thêm `web-gateway` reverse proxy, sau đó public toàn bộ web ra internet bằng một hostname Cloudflare Tunnel duy nhất.

## Yêu cầu

- Đã có tài khoản Cloudflare
- Domain đã quản lý trên Cloudflare
- Đã tạo Tunnel trong Zero Trust Dashboard
- Đã lấy `TUNNEL_TOKEN`

## Chế độ demo hiện tại

File `.env.demo` được cấu hình để demo web/admin trước:

- `DISCORD_BOT_ENABLED=false`
- `DEV_BYPASS_ADMIN_AUTH=true`
- `PAYMENT_MODE=manual`

Lý do: token bot hiện tại chưa login thành công (`TokenInvalid`), nên chưa thể demo bot Discord thật cho đến khi có token đúng hoặc token mới.

## Biến môi trường cần có

```env
CLOUDFLARE_TUNNEL_TOKEN=
VITE_API_BASE_URL=
PUBLIC_BASE_URL=https://demo.your-domain.com
ADMIN_APP_URL=https://demo.your-domain.com
DISCORD_REDIRECT_URI=https://demo.your-domain.com/api/auth/discord/callback
```

## Route gợi ý trong Cloudflare Tunnel

Tạo 1 public hostname trong tunnel:

- `demo.your-domain.com` -> `http://web-gateway:8080`

`web-gateway` sẽ tự route:

- `/` -> `admin-web:4173`
- `/api/*` -> `app-server:3000`
- `/health` -> `app-server:3000/health`

## Chạy Docker

Chạy ứng dụng:

```bash
docker compose --env-file .env.demo.local up --build -d postgres app-server admin-web web-gateway
```

Chạy tunnel:

```bash
docker compose --env-file .env.demo.local --profile tunnel up -d cloudflared
```

## Lưu ý build admin

Ở mode demo một hostname, để `VITE_API_BASE_URL=` rỗng để frontend gọi cùng origin.

## Chạy tạm trước khi có domain

Nếu chỉ muốn dựng Docker trước:

```env
VITE_API_BASE_URL=
PUBLIC_BASE_URL=http://localhost:8080
ADMIN_APP_URL=http://localhost:8080
DISCORD_REDIRECT_URI=http://localhost:8080/api/auth/discord/callback
```

Sau khi có domain/tunnel, cập nhật lại các biến trên rồi build lại stack.
