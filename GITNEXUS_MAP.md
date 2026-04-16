# GitNexus Knowledge Map - discordvip-cinema-web

Dự án này đã được lập bản đồ tri thức bằng **GitNexus**. Bản đồ này cung cấp cái nhìn 360 độ về kiến trúc dự án, các luồng xử lý và các vùng chức năng quan trọng.

## 📊 Overview
- **Symbols**: 1787
- **Relationships**: 4369
- **Execution Flows**: 134
- **Clusters (Areas)**: 20 chính
- **Cập nhật lúc**: 12:31 16/04/2026

## 🧩 Các vùng chức năng chính (Functional Areas)

Dưới đây là danh sách các vùng chức năng chính được GitNexus phân tách dựa trên mối liên hệ giữa các tệp tin và logic:

| Vùng (Cluster) | Mô tả | File kỹ năng |
|:---:|:---|:---|
| **Services** | Core business logic (Prisma, Discord, Payment, Cinema) | [services/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/services/SKILL.md) |
| **Pages** | Giao diện Next.js / Frontend components | [pages/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/pages/SKILL.md) |
| **Cinema** | Logic xử lý liên quan đến Cinema web và player | [cinema/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/cinema/SKILL.md) |
| **Http** | API Routes, App initialization, routing logic | [http/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/http/SKILL.md) |
| **Telegram** | Tích hợp Telegram bot và các dịch vụ đi kèm | [telegram/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/telegram/SKILL.md) |
| **Auth** | Hệ thống xác thực và phân quyền | [auth/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/auth/SKILL.md) |

## 🚀 Key Execution Flows (Luồng xử lý quan trọng)

Bạn có thể tìm hiểu cách hệ thống hoạt động thông qua các luồng được GitNexus phát hiện:

1. **Cinema Flow**: Cách request được chuyển từ route điều khiển local sang Cinema server.
2. **Payment Flow**: Luồng xử lý thanh toán từ webhook đến khi kích hoạt VIP.
3. **Bot Sync**: Luồng đồng bộ hóa giữa Discord service và Telegram service.

## 🛠️ Hướng dẫn sử dụng cho AI Agent
Thông tin chi tiết về cách sử dụng công cụ GitNexus để phân tích tác động (impact analysis) và tìm kiếm code đã được thêm vào **[AGENTS.md](file:///d:/discordvip-cinema-web/AGENTS.md)**.

> [!TIP]
> Để cập nhật lại bản đồ sau khi code thay đổi nhiều, hãy chạy lại:
> ```bash
> npx gitnexus analyze --skills
> ```
