```mindmap
  root((Hệ thống Bot Invite VIP))
    Luồng Người Dùng
      Lấy Link: Lệnh /invite -> Bot tạo Unique Link
      Mời Bạn: User A gửi link cho User B
      Xác Thực: User B vào nhóm -> Nhấn nút Verify
      Chờ Đợi: Hệ thống treo trạng thái Pending trong 24h
      Quy Đổi: Lệnh /exchange -> Trừ điểm -> Cộng ngày VIP
    Logic Tích Điểm
      Quy tắc: 1 Người thành công = 10 Điểm
      Tỷ lệ đổi: 10 Điểm = 10 Ngày VIP
      Trạng thái:
        Pending: Đang chờ đủ 24h
        Success: Đủ thời gian + Còn ở trong nhóm
        Failed: Thoát nhóm trước 24h
    Hệ Thống Anti-Cheat
      Xác minh: Captcha hoặc Nút bấm thực tế
      Điều kiện Acc: Ngày tạo nick > 7 ngày + Có Avatar
      Check trùng: Chặn tự mời chính mình (Trùng ID/IP)
      Kiểm tra định kỳ: Bot quét thành viên mỗi giờ
    Kỹ Thuật & Backend
      Database: Lưu ID, Points, Expiry_Date, Join_Timestamp
      Cron Job: Quét DB tìm các bản ghi đủ 24h để xử lý
      API Kết nối:
        Telegram: createChatInviteLink
        Discord: Track Invite Uses
      Centralized: Chung 1 Database cho cả Tele & Discord
    Quản Trị Admin
      Leaderboard: Bảng xếp hạng top mời
      Cấu hình: Chỉnh sửa số điểm hoặc ngày quy đổi
      Manual: Cộng hoặc Trừ điểm thủ công cho User
      ```