# Thông Tin Khách Hàng Cần Cung Cấp Để Chạy Production

Tài liệu này dùng để khách hàng điền các thông tin cần thiết để triển khai hệ thống Discord VIP Bot + Admin Panel trên môi trường thật.

## 1. Thông Tin Hệ Thống

- Tên dự án / tên server Discord:
- Môi trường triển khai:
  - Production / Staging
- Múi giờ cần sử dụng:
  - Ví dụ: `Asia/Ho_Chi_Minh`
- Domain public cho API:
  - Ví dụ: `https://api.example.com`
- Domain public cho Admin Panel:
  - Ví dụ: `https://admin.example.com`

## 2. Biến Môi Trường Cần Khách Hàng Cung Cấp

### 2.1 Discord Bot và OAuth

Khách hàng cần cung cấp:

- `DISCORD_BOT_TOKEN`
  - Token bot Discord production
- `DISCORD_CLIENT_ID`
  - Application ID của Discord app
  - Đã xác minh hiện tại: `1480144047598469201`
- `DISCORD_CLIENT_SECRET`
  - Client secret của Discord app
- `DISCORD_GUILD_ID`
  - ID server Discord cần triển khai bot
  - Đã xác minh hiện tại: `1178598004924612628`
- `DISCORD_VIP_ROLE_ID`
  - ID role VIP mà bot sẽ cấp / gỡ
  - Đã xác minh hiện tại: `1178678366514192444`
- `DISCORD_ADMIN_ROLE_ID`
  - ID role admin được phép truy cập admin panel
  - Nếu không dùng role admin, có thể để trống và dùng `ADMIN_DISCORD_IDS`
  - Đã xác minh hiện tại: `1178678339683225610`
- `ADMIN_DISCORD_IDS`
  - Danh sách Discord user ID được phép vào admin panel
  - Nếu có nhiều user, ngăn cách bằng dấu phẩy
  - Ví dụ: `123456789012345678,987654321098765432`
- `DISCORD_REDIRECT_URI`
  - URL callback OAuth của Discord
  - Ví dụ: `https://api.example.com/api/auth/discord/callback`

Yêu cầu phía khách hàng cần xác nhận:

- Bot đã được invite vào đúng server Discord
- Bot có quyền `Guilds` và `GuildMembers`
- Bot có quyền quản lý role phù hợp
- Role của bot nằm cao hơn role VIP trong Discord

### 2.2 Database

Khách hàng cần cung cấp:

- `DATABASE_URL`
  - Chuỗi kết nối PostgreSQL production
  - Ví dụ:
  - `postgresql://username:password@host:5432/dbname?schema=public`

Yêu cầu phía khách hàng cần xác nhận:

- Database PostgreSQL đã được tạo
- User database có quyền tạo / sửa bảng
- Server ứng dụng có thể kết nối tới database

### 2.3 Session và URL hệ thống

Khách hàng cần cung cấp:

- `SESSION_SECRET`
  - Chuỗi bí mật mạnh, dùng để ký session
  - Nên là chuỗi ngẫu nhiên dài tối thiểu 32 ký tự
- `PUBLIC_BASE_URL`
  - Base URL public của backend/API
  - Ví dụ: `https://api.example.com`
- `ADMIN_APP_URL`
  - URL public của admin panel
  - Ví dụ: `https://admin.example.com`
- `SERVER_PORT`
  - Port chạy ứng dụng backend trên server
  - Ví dụ: `3000`
- `TIMEZONE`
  - Múi giờ hệ thống
  - Ví dụ: `Asia/Ho_Chi_Minh`

### 2.4 SePay

Khách hàng cần cung cấp:

- `SEPAY_ACCOUNT_NO`
  - Số tài khoản nhận tiền
- `SEPAY_BANK_BIN`
  - Mã BIN ngân hàng
- `SEPAY_ACCOUNT_NAME`
  - Tên chủ tài khoản nhận tiền
- `SEPAY_WEBHOOK_SECRET`
  - Secret webhook của SePay nếu tài khoản SePay có hỗ trợ
  - Nếu không có thì có thể để trống

Yêu cầu phía khách hàng cần xác nhận:

- SePay đã cấu hình webhook trỏ về:
  - `POST https://api.example.com/api/webhooks/sepay`
- Nội dung chuyển khoản phải đúng định dạng:
  - `VIP <order_code>`

## 3. Biến Môi Trường Không Dùng Trong Production

Các biến dưới đây phải để đúng giá trị production:

- `DISCORD_BOT_ENABLED=true`
- `DEV_BYPASS_ADMIN_AUTH=false`

Không dùng cấu hình local/dev khi triển khai thật.

## 4. Mẫu File `.env` Production

Khách hàng có thể điền theo mẫu sau:

```env
DISCORD_BOT_ENABLED=true
DEV_BYPASS_ADMIN_AUTH=false

DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=1480144047598469201
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=1178598004924612628
DISCORD_VIP_ROLE_ID=1178678366514192444
DISCORD_ADMIN_ROLE_ID=1178678339683225610
ADMIN_DISCORD_IDS=
DISCORD_REDIRECT_URI=https://api.example.com/api/auth/discord/callback

SERVER_PORT=3000
ADMIN_APP_URL=https://admin.example.com
SESSION_SECRET=
DATABASE_URL=postgresql://username:password@host:5432/dbname?schema=public

SEPAY_WEBHOOK_SECRET=
SEPAY_ACCOUNT_NO=
SEPAY_BANK_BIN=
SEPAY_ACCOUNT_NAME=

PUBLIC_BASE_URL=https://api.example.com
TIMEZONE=Asia/Ho_Chi_Minh
```

## 5. Checklist Xác Nhận Trước Khi Go-Live

Khách hàng vui lòng xác nhận các mục sau:

- Đã cung cấp đầy đủ toàn bộ biến môi trường ở trên
- Discord bot đã được mời vào đúng server
- Bot có quyền quản lý role
- Role bot cao hơn role VIP
- Discord OAuth redirect URL đã khai báo đúng trên Discord Developer Portal
- Database PostgreSQL production đã sẵn sàng
- SePay webhook đã cấu hình đúng URL production
- Đã có ít nhất 1 tài khoản admin để đăng nhập admin panel

## 6. Thông Tin Nên Gửi Kèm

Ngoài file `.env`, khách hàng nên gửi thêm:

- Link invite bot Discord đang sử dụng
- Ảnh cấu hình OAuth redirect trong Discord Developer Portal
- Ảnh hoặc mô tả cấu hình webhook SePay
- Danh sách admin Discord được phép truy cập hệ thống
- Thông tin người phụ trách kỹ thuật để phối hợp test production

## 7. Giá Trị Đã Xác Minh Sẵn

Các giá trị dưới đây đã được xác minh trực tiếp từ server Discord hiện tại và có thể dùng ngay:

```env
DISCORD_CLIENT_ID=1480144047598469201
DISCORD_GUILD_ID=1178598004924612628
DISCORD_VIP_ROLE_ID=1178678366514192444
DISCORD_ADMIN_ROLE_ID=1178678339683225610
```

Thông tin tham chiếu thêm:

- Tên server Discord: `CLB DÚ ĐÍCH 18+ 🤡NSFW`
- Verify channel hiện tại: `1178678102814113864`
