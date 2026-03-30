# Mindmap User Flow Bot (Telegram + Discord)

```mermaid
mindmap
  root((User Flow Bot))
    Bắt đầu
      User thấy bot qua bạn bè hoặc cộng đồng
      User mở link bot hoặc invite bot vào server
    Telegram
      Mở chat bot
      Gửi /start
      Bot phản hồi menu chính
      User chọn tác vụ
        Đăng ký hoặc đăng nhập
          Nhập thông tin hoặc xác thực OTP
          Bot xác nhận tài khoản
        Dùng tính năng chính
          Gửi lệnh
          Bot xử lý
          Trả kết quả
        Quản lý tài khoản
          Xem trạng thái gói VIP
          Gia hạn hoặc nâng cấp
      Nhận thông báo tự động
        Cảnh báo
        Cập nhật trạng thái
      Hỗ trợ
        /help
        Liên hệ admin
    Discord
      User join server
      Invite bot với quyền cần thiết
      Bot online và gửi hướng dẫn
      User tương tác
        Slash command
          User nhập /command
          Bot xác thực quyền
          Bot trả kết quả tại channel hoặc DM
        Button hoặc select menu
          User chọn hành động
          Bot cập nhật message theo trạng thái mới
        Quản lý vé support
          User mở ticket
          Bot tạo kênh hỗ trợ
      Hệ thống phân quyền
        Role member
        Role VIP
        Role admin
      Thông báo sự kiện
        Giveaway
        Cảnh báo hệ thống
    Điểm chung hai nền tảng
      Xác thực user
      Kiểm tra gói dịch vụ
      Ghi log hoạt động
      Chống spam và rate limit
      Retry khi lỗi mạng
    Kết thúc phiên
      User hài lòng và quay lại
      User gặp lỗi và tạo ticket hỗ trợ
```

## Gợi ý xem trong VS Code

- Cài extension: `Markdown Preview Mermaid Support` hoặc dùng bản VS Code đã hỗ trợ Mermaid.
- Mở file và bấm `Ctrl+Shift+V` để xem preview.
