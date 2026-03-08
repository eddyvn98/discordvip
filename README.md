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

## Docker

```bash
docker compose up --build
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
