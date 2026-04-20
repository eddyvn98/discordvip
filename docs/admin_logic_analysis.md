# Admin and Superadmin Logic & Content Storage Analysis

Hệ thống xác định quyền Admin và Superadmin dựa trên sự kết hợp giữa biến môi trường (Environment Variables), vai trò trên Discord (Discord Roles) và cơ sở dữ liệu (Database). Ngoài ra, các hoạt động lưu trữ và xử lý phim được thực hiện bởi một tài khoản Telegram tập trung.

## 1. Superadmin (Quyền cao nhất)

Superadmin được xác định cứng thông qua các ID người dùng trong file cấu hình [.env](file:///d:/discordvip-cinema-web/.env).

*   **Cách xác định:** Hệ thống kiểm tra xem ID người dùng (Discord hoặc Telegram) có nằm trong danh sách sau không:
    *   `ADMIN_DISCORD_IDS`: Danh sách ID Discord (ngăn cách bằng dấu phẩy).
    *   `TELEGRAM_ADMIN_IDS`: Danh sách ID Telegram (ngăn cách bằng dấu phẩy).
*   **Vị trí Code:** [apps/server/src/services/cinema/cinema-admin-access-service.ts](file:///d:/discordvip-cinema-web/apps/server/src/services/cinema/cinema-admin-access-service.ts), hàm [isSuperAdmin](file:///d:/discordvip-cinema-web/apps/server/src/services/cinema/cinema-admin-access-service.ts#80-86).
*   **Đặc quyền:** Superadmin có toàn quyền truy cập vào tất cả các tính năng quản lý, bao gồm cả việc quản lý các Admin khác và cài đặt hệ thống.

## 2. Admin (Quyền quản trị)

Admin có thể được xác định qua hai con đường:

### A. Qua Vai trò Discord (Role-based)
*   **Cách xác định:** Người dùng có vai trò (Role) tương ứng với ID được cấu hình trong `DISCORD_ADMIN_ROLE_ID` tại server Discord của dự án.
*   **Vị trí Code:** [apps/server/src/services/discord-service.ts](file:///d:/discordvip-cinema-web/apps/server/src/services/discord-service.ts), hàm [memberHasAdminAccess](file:///d:/discordvip-cinema-web/apps/server/src/services/discord-service.ts#340-352).

### B. Qua Cơ sở dữ liệu (Database-based)
*   **Cách xác định:** Thông tin người dùng được lưu trong bảng [AdminPrincipal](file:///d:/discordvip-cinema-web/apps/server/src/services/cinema/cinema-admin-access-service.ts#172-202) trong cơ sở dữ liệu và thuộc tính `isActive` được đặt là `true`.
*   **Vị trí Code:** [apps/server/src/services/auth-service.ts](file:///d:/discordvip-cinema-web/apps/server/src/services/auth-service.ts), hàm [handleCallback](file:///d:/discordvip-cinema-web/apps/server/src/services/auth-service.ts#82-216).

## 3. Phân quyền trong Cinema (Cinema Permissions)

Riêng đối với module Cinema, hệ thống sử dụng một cơ chế phân quyền chi tiết hơn (Access Profile):

*   **Mode `super_admin`:** Dành cho các ID nằm trong biến môi trường. Có toàn quyền.
*   **Mode `mapped`:** Dành cho Admin được đăng ký trong Database. Quyền hạn cụ thể được định nghĩa trong bảng `CinemaAdminPermission` (xem, upload, forward, manage, delete) cho từng channel hoặc global.
*   **Mode `legacy_admin`:** Chế độ tương thích ngược. Nếu một người dùng Discord có quyền Admin (qua Role) nhưng chưa được ánh xạ (map) vào Database, họ vẫn được coi là Admin và có toàn quyền Cinema (để đảm bảo hệ thống cũ không bị gián đoạn).

## 4. Tài khoản thực hiện Upload/Forward (Content Storage)

Khi phim được upload hoặc forward (copy) giữa các channel, hành động này không sử dụng tài khoản cá nhân của Admin đang thao tác, mà sử dụng một tài khoản "chủ" hệ thống.

*   **Cơ chế:** Hệ thống sử dụng một service riêng tên là [telethon-stream](file:///d:/discordvip-cinema-web/scripts/Dockerfile.telethon-stream).
*   **Tài khoản sử dụng:** Một **Telegram User Account** (tài khoản người dùng thật, không phải bot) được cấu hình thông qua:
    *   `API_ID` và `API_HASH` trong file [.env](file:///d:/discordvip-cinema-web/.env).
    *   File session [user_session.session](file:///d:/discordvip-cinema-web/user_session.session) nằm ở thư mục gốc của project.
*   **Lợi ích:** Cho phép hệ thống thực hiện các thao tác nâng cao (như copy phim mà không bị dính tag "forwarded from", hoặc stream video dung lượng lớn) mà Bot API thông thường không làm được.
*   **Lưu ý:** Bất kể Admin nào (dù là Superadmin hay Admin phụ được phân quyền) thực hiện lệnh upload/forward, thì trên Telegram, hành động đó đều được thực hiện bởi tài khoản "chủ" này.

## Tóm tắt các File quan trọng:
1.  [apps/server/src/config.ts](file:///d:/discordvip-cinema-web/apps/server/src/config.ts): Load cấu hình từ [.env](file:///d:/discordvip-cinema-web/.env).
2.  [apps/server/src/services/auth-service.ts](file:///d:/discordvip-cinema-web/apps/server/src/services/auth-service.ts): Xử lý logic đăng nhập và kiểm tra quyền ban đầu.
3.  [apps/server/src/services/discord-service.ts](file:///d:/discordvip-cinema-web/apps/server/src/services/discord-service.ts): Kiểm tra ID và Role trên Discord.
4.  [apps/server/src/services/cinema/cinema-admin-access-service.ts](file:///d:/discordvip-cinema-web/apps/server/src/services/cinema/cinema-admin-access-service.ts): Xử lý phân quyền chi tiết cho module Cinema.
5.  [apps/admin/src/components/layout/AdminLayout.tsx](file:///d:/discordvip-cinema-web/apps/admin/src/components/layout/AdminLayout.tsx): Giao diện khung và quản lý sidebar mobile.

## 5. Đánh giá độ hoàn thiện (Mobile, Desktop, Auth Flow)

Dựa trên việc kiểm tra mã nguồn, đây là đánh giá về độ hoàn thiện của hệ thống quản trị:

### ✅ Những gì ĐÃ HOÀN THIỆN:
*   **Giao diện Dashboard & Quản lý:** Các trang quản lý thành viên VIP, Kênh Telegram, Cinema Workspace (phim), và Duyệt Admin đã được xây dựng đầy đủ.
*   **Hỗ trợ Mobile/Desktop:** Giao diện web admin (sử dụng Tailwind CSS) đã hỗ trợ tốt cho mobile. Sidebar có tính năng toggle (ẩn/hiện) khi màn hình nhỏ, giúp thao tác trên điện thoại thuận tiện.
*   **Phân quyền chi tiết:** Hệ thống cho phép phân quyền rất sâu (xem, sửa, xoá, upload) cho từng admin con đối với từng channel cụ thể.

### ⚠️ Những điểm CHƯA HOÀN THIỆN / "Gãy Flow":
*   **Đăng nhập Telegram trên Web:** Mặc dù Telegram admin có thể "Gửi yêu cầu" (Request) qua web, nhưng hiện tại **không có nút đăng nhập trực tiếp bằng Telegram** trên giao diện Web Admin.
    *   *Hệ quả:* Telegram admin chỉ có thể quản trị thông qua Bot (nếu bot có hỗ trợ) hoặc phải có tài khoản Discord được liên kết mới vào được Web Admin.
*   **Khả năng tự động liên kết:** Hiện chưa thấy logic tự động liên kết giữa một tài khoản Discord và một tài khoản Telegram của cùng một Admin trong mã nguồn [AuthService](file:///d:/discordvip-cinema-web/apps/server/src/services/auth-service.ts#32-310).
*   **UI Đăng nhập:** Giao diện đăng nhập hiện tại tập trung hoàn toàn vào Discord ("Đăng nhập với Discord").

### 🚀 Kết luận:
Hệ thống đã **build rất tốt về mặt Core (xử lý phim, stream, phân quyền)** và **Responsive UI**. Tuy nhiên, luồng đăng nhập (Auth Flow) cho Admin từ phía Telegram vẫn đang ở mức "Request" (đăng ký), chưa thực sự cho phép quản trị trực tiếp trên Web bằng tài khoản Telegram đó một cách độc lập.
