# Hướng Dẫn Sử Dụng Bot Discord VIP

## Tổng quan

Bot đang chạy cho server Discord với các chức năng chính:

- nhận donate ủng hộ server qua lệnh `/donate`
- tự động xác nhận thanh toán qua SePay
- tự cấp role VIP sau khi thanh toán hợp lệ
- cho dùng trial VIP 24 giờ qua lệnh `/trialvip`
- cho admin xem thống kê bằng lệnh `/adminstats`

Hệ thống production hiện tại:

- Bot Discord: `BOT VIP`
- Domain public: `https://discordvip.vivutrade.io.vn`
- Webhook SePay: `https://discordvip.vivutrade.io.vn/api/webhooks/sepay`

## Lệnh dành cho thành viên

### `/donate`

Dùng để tạo đơn ủng hộ server và nhận hướng dẫn chuyển khoản.

Các gói hiện có:

- `39.000đ tặng VIP 31 ngày`
- `99.000đ tặng VIP 90 ngày`
- `199.000đ tặng VIP 365 ngày`

Cách dùng:

1. Gõ `/donate`
2. Chọn `plan`
3. Bot trả về:
   - số tiền
   - mã nội dung chuyển khoản
   - ảnh QR để quét
   - thời hạn của đơn

Lưu ý:

- Phản hồi của `/donate` là `ephemeral`
- Chỉ người bấm lệnh mới nhìn thấy nội dung trả về

### `/trialvip`

Dùng để nhận VIP dùng thử.

Quy tắc hiện tại:

- mỗi lần trial kéo dài `24 giờ`
- mỗi tài khoản được dùng `1 lần trong 30 ngày`

Nếu đã dùng trial trong vòng 30 ngày gần đây, bot sẽ từ chối.

### `/vipstatus`

Dùng để kiểm tra tình trạng VIP hiện tại.

Bot sẽ hiển thị:

- nguồn VIP: `Trial` hoặc `Paid`
- thời điểm hết hạn

## Lệnh dành cho admin

### `/adminstats`

Dùng để xem:

- số lượng VIP đang active
- số lượng VIP hết hạn trong ngày
- doanh thu tháng

Lệnh này chỉ dùng được với:

- thành viên có role admin được cấu hình trong bot
- hoặc Discord ID nằm trong `ADMIN_DISCORD_IDS`

Nếu user không có quyền, bot sẽ từ chối.

## Luồng donate tự động

Luồng hoạt động hiện tại dùng `SePay` tự động:

1. User tạo đơn bằng `/donate`
2. Bot sinh mã nội dung chuyển khoản theo dạng:

```text
DONATE <order_code>
```

3. User chuyển khoản đúng số tiền và đúng nội dung
4. SePay gửi webhook về:

```text
POST /api/webhooks/sepay
```

5. Bot đối soát:
   - đúng `order_code`
   - đúng số tiền
   - đơn chưa hết hạn
6. Nếu hợp lệ:
   - order chuyển sang `PAID`
   - payment được đánh dấu `MATCHED`
   - membership VIP được tạo hoặc gia hạn
   - bot tự gán role `VIP`

## Thông tin chuyển khoản hiện tại

Bot đang sinh QR theo tài khoản:

- Ngân hàng: `TPBank`
- Chủ tài khoản: `HA MINH PHUC`
- Số tài khoản: `04293568001`

## Điều kiện để bot cấp VIP thành công

Bot chỉ cấp role VIP thành công khi:

- bot đang online
- bot đã được mời vào đúng server
- bot có quyền `Manage Roles`
- role của bot nằm cao hơn role `VIP`

Nếu role bot nằm thấp hơn role VIP, bot sẽ không thể gán VIP dù thanh toán đã match.

## Khi nào cần sửa trong Discord Developer Portal

Developer Portal không ảnh hưởng đến việc bot tự nhận lệnh hoặc auto cấp VIP nếu bot đã online đúng token.

Nhưng cần cấu hình đúng khi dùng các chức năng sau:

- Discord OAuth cho admin panel
- redirect URI đăng nhập admin

Redirect URI production đang dùng:

```text
https://discordvip.vivutrade.io.vn/api/auth/discord/callback
```

## Cách kiểm tra nhanh nếu bot có vấn đề

### User bấm `/donate` mà không thấy phản hồi

Kiểm tra:

- bot có đang online không
- Docker container `discordvip-app-server-1` có đang chạy không
- slash command đã sync chưa

### User chuyển khoản xong mà chưa được cấp VIP

Kiểm tra:

- nội dung chuyển khoản có đúng `DONATE <order_code>` không
- số tiền có đúng plan không
- webhook SePay có trỏ đúng domain production không
- role `BOT VIP` có nằm trên role `VIP` không

### Admin không dùng được `/adminstats`

Kiểm tra:

- user có role admin đúng ID cấu hình không
- hoặc user có nằm trong `ADMIN_DISCORD_IDS` không

## Ghi chú vận hành

- Bot production đang chạy trong Docker
- Public domain đang đi qua Cloudflare Tunnel
- Webhook SePay đang hoạt động qua domain public

Nếu cần thay đổi giá, thời hạn VIP, trial rule hoặc tài khoản nhận tiền, phải cập nhật:

- seed plan
- slash command choices
- env tài khoản ngân hàng
- sau đó rebuild lại container `app-server`
