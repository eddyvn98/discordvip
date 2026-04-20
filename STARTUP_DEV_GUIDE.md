# Hướng dẫn khởi động nhanh dự án (Dành cho AI & Developer)

Dự án này là một monorepo bao gồm nhiều service khác nhau như:
- **Backend (App Server)**: Quản lý API, Server-side render giao diện Cinema, xử lý logic Telegram.
- **Admin Web**: Giao diện React quản trị phim.
- **Telethon Stream & Bot Manager**: Python service xử lý luồng stream video Telegram.
- **Nginx Gateway**: Proxy tổng hợp.

## 1. Khởi động môi trường Docker toàn diện (Khuyên dùng)

Hệ thống đã được thiết lập `docker-compose.yml` để chạy toàn bộ stack chỉ với Docker. Nếu bạn chỉ muốn chạy dự án lên để trải nghiệm mà không cần debug code nóng:

```bash
docker compose up -d --build
```
> **Lưu ý:** Lệnh `--build` giúp hệ thống đóng gói các code Node.js/React mới nhất vào Docker.

Toàn bộ dịch vụ sẽ chạy tại một cổng duy nhất là **8081**:
- **Trang chủ Cinema**: `http://localhost:8081/cinema/`
- **Trang Admin**: `http://localhost:8081/admin/`

## 2. Khởi động môi trường Hybrid Native (Dành riêng để code đổi trực tiếp)

Nhiều trường hợp bạn cần sửa code `apps/server` (Backend) thì không nên chạy nó trong Docker vì sẽ bị mất tính năng hot-reload. Thay vào đó, ta sẽ chạy Database + Telethon trong Docker và chạy Backend Server cục bộ.

**Bước 1**: Bật hạ tầng phụ trợ:
```bash
docker compose up -d postgres telethon-stream telethon-bot-manager
```
**Bước 2**: Chạy Backend và Web cục bộ:
- Mở Terminal 1 (Backend):
  ```bash
  npm run dev:server
  ```
- Mở Terminal 2 (Admin Web): 
  ```bash
  npm run dev:admin
  ```

**Lưu ý quan trọng cho môi trường Hybrid:**
- App cục bộ sẽ truy cập vào database qua `127.0.0.1:5434` và Telethon qua `127.0.0.1:8090`. (Đã được map port trong file cấu hình `.env` nội vi).
- Nếu gặp lỗi `ENOTFOUND telethon-stream`, do đang dùng nhầm environment của Docker. Hãy đảm bảo biến `TELETHON_BACKEND_URL=http://127.0.0.1:8090` nằm trong `.env`.
- Ảnh `local-media` và thumbnails được lưu tại mục `./storage/cinema-media`. Trong môi trường cục bộ, thư mục này được truy xuất tự động nhờ `CINEMA_MEDIA_ROOT`.

## Lịch sử xử lý lỗi cần nhớ cho AI (Root Causes)
1. **Lỗi Docker daemon crash (Internal Server Error):** Do `docker-desktop` trên Windows bị treo -> Cần Restart Docker Desktop hoàn toàn.
2. **Lỗi mất ảnh (404 / 500 Media API):** Đường dẫn `.env` cấu hình `CINEMA_MEDIA_ROOT` chỉ định `/app/storage` (sai do đây là đường dẫn lúc build Docker), phải trỏ về thư mục thật là `./storage/cinema-media`.
3. **Lỗi không kéo được phim (ENOTFOUND telethon-stream):** Code gọi thẳng domain nội bộ Docker. Đã được sửa để chuyển ra một biến môi trường cấu hình linh hoạt.
