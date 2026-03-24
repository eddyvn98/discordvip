# Mind Map - Chuc Nang Thuc Te

```mermaid
mindmap
  root((Discord VIP Bot + SePay))
    Nguoi dung
      Discord
        "/buyvip"
        "/trialvip"
        "/vipstatus"
      Telegram
        Kich VIP theo plan
        Verify lien ket tai khoan
    Thanh toan
      SePay webhook
        Kiem tra API key va signature
        Parse payload
      Xu ly payment
        MATCHED
        PENDING_REVIEW
      Order
        Tao order code
        Trang thai PENDING/PAID/EXPIRED
    Membership
      Nguon
        PAID
        TRIAL
        MANUAL
      Vong doi
        ACTIVE
        EXPIRED
      Tac vu
        applyPaidOrder
        grantTrial 24h
        manual adjust plus/minus ngay
        revoke VIP
    Platform adapter
      Discord adapter
        Cap role VIP
        Thu hoi role VIP
        Gui thong bao
      Telegram adapter
        Cap quyen kenh VIP
        Thu hoi quyen
    Admin panel
      Auth
        Discord OAuth
        Session Postgres
      Man hinh
        Dashboard
        VIP Stats
        Transactions
        Memberships
        Promo Codes
        Plans
        Pending
        Telegram VIP Channels
      Hanh dong
        Resolve pending payment
        Confirm manual order
        Plan CRUD
        Promo code CRUD
    Van hanh
      Scheduler
        Nhac sap het han 3d/1d
        Het han thi revoke access
      Ha tang
        Postgres + Prisma
        Docker Compose
        Nginx
        Cloudflare Tunnel
      Du lieu
        Backup database
        Migration export/import
```
