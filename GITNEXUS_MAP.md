# GitNexus Knowledge Map - discordvip-cinema-web

Dá»± Ã¡n nÃ y Ä‘Ã£ Ä‘Æ°á»£c láº­p báº£n Ä‘á»“ tri thá»©c báº±ng **GitNexus**. Báº£n Ä‘á»“ nÃ y cung cáº¥p cÃ¡i nhÃ¬n 360 Ä‘á»™ vá» kiáº¿n trÃºc dá»± Ã¡n, cÃ¡c luá»“ng xá»­ lÃ½ vÃ  cÃ¡c vÃ¹ng chá»©c nÄƒng quan trá»ng.

## ðŸ“Š Overview
- **Symbols**: 1914
- **Relationships**: 4768
- **Execution Flows**: 143
- **Clusters (Areas)**: 20 chÃ­nh
- **Cáº­p nháº­t lÃºc**: 17:42 17/04/2026

## ðŸ§© CÃ¡c vÃ¹ng chá»©c nÄƒng chÃ­nh (Functional Areas)

DÆ°á»›i Ä‘Ã¢y lÃ  danh sÃ¡ch cÃ¡c vÃ¹ng chá»©c nÄƒng chÃ­nh Ä‘Æ°á»£c GitNexus phÃ¢n tÃ¡ch dá»±a trÃªn má»‘i liÃªn há»‡ giá»¯a cÃ¡c tá»‡p tin vÃ  logic:

| VÃ¹ng (Cluster) | MÃ´ táº£ | File ká»¹ nÄƒng |
|:---:|:---|:---|
| **Services** | Core business logic (Prisma, Discord, Payment, Cinema) | [services/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/services/SKILL.md) |
| **Pages** | Giao diá»‡n Next.js / Frontend components | [pages/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/pages/SKILL.md) |
| **Cinema** | Logic xá»­ lÃ½ liÃªn quan Ä‘áº¿n Cinema web vÃ  player | [cinema/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/cinema/SKILL.md) |
| **Http** | API Routes, App initialization, routing logic | [http/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/http/SKILL.md) |
| **Telegram** | TÃ­ch há»£p Telegram bot vÃ  cÃ¡c dá»‹ch vá»¥ Ä‘i kÃ¨m | [telegram/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/telegram/SKILL.md) |
| **Auth** | Há»‡ thá»‘ng xÃ¡c thá»±c vÃ  phÃ¢n quyá»n | [auth/SKILL.md](file:///d:/discordvip-cinema-web/.claude/skills/generated/auth/SKILL.md) |

## ðŸš€ Key Execution Flows (Luá»“ng xá»­ lÃ½ quan trá»ng)

Báº¡n cÃ³ thá»ƒ tÃ¬m hiá»ƒu cÃ¡ch há»‡ thá»‘ng hoáº¡t Ä‘á»™ng thÃ´ng qua cÃ¡c luá»“ng Ä‘Æ°á»£c GitNexus phÃ¡t hiá»‡n:

1. **Cinema Flow**: CÃ¡ch request Ä‘Æ°á»£c chuyá»ƒn tá»« route Ä‘iá»u khiá»ƒn local sang Cinema server.
2. **Payment Flow**: Luá»“ng xá»­ lÃ½ thanh toÃ¡n tá»« webhook Ä‘áº¿n khi kÃ­ch hoáº¡t VIP.
3. **Bot Sync**: Luá»“ng Ä‘á»“ng bá»™ hÃ³a giá»¯a Discord service vÃ  Telegram service.

## ðŸ› ï¸ HÆ°á»›ng dáº«n sá»­ dá»¥ng cho AI Agent
ThÃ´ng tin chi tiáº¿t vá» cÃ¡ch sá»­ dá»¥ng cÃ´ng cá»¥ GitNexus Ä‘á»ƒ phÃ¢n tÃ­ch tÃ¡c Ä‘á»™ng (impact analysis) vÃ  tÃ¬m kiáº¿m code Ä‘Ã£ Ä‘Æ°á»£c thÃªm vÃ o **[AGENTS.md](file:///d:/discordvip-cinema-web/AGENTS.md)**.

> [!TIP]
> Äá»ƒ cáº­p nháº­t láº¡i báº£n Ä‘á»“ sau khi code thay Ä‘á»•i nhiá»u, hÃ£y cháº¡y láº¡i:
> ```bash
> npx gitnexus analyze --skills
> ```


