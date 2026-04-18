---
name: telegram
description: "Skill for the Telegram area of discordvip-cinema-web. 30 symbols across 6 files."
---

# Telegram

30 symbols | 6 files | Cohesion: 95%

## When to Use

- Working with code in `apps/`
- Understanding how buildHomeReplyKeyboard, describeErrorCause, getAllConfiguredVipChatIds work
- Modifying telegram-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/server/src/services/telegram/telegram-service.ts` | sendMessage, sendVipEntryLinks, grantAccess, sendVipActivatedNotice, sendVipExpiryReminder (+5) |
| `apps/server/src/services/telegram/update-handler.ts` | handleUpdate, handleMessage, routeCommand, handleCallbackQuery, handleChatJoinRequest (+1) |
| `apps/server/src/services/telegram/api.ts` | apiCall, sendMessage, sendWebAppButton, sendPhoto, clearPaymentPromptMessage (+1) |
| `apps/server/src/services/telegram/command-sync.ts` | getUserCommands, getAdminCommands, syncCommands, syncAdminCommandsForUser |
| `apps/server/src/services/telegram/utils.ts` | buildHomeReplyKeyboard, describeErrorCause |
| `apps/server/src/services/telegram/db-helpers.ts` | getAllConfiguredVipChatIds, getVipChatIdsForPlan |

## Entry Points

Start here when exploring this area:

- **`buildHomeReplyKeyboard`** (Function) — `apps/server/src/services/telegram/utils.ts:3`
- **`describeErrorCause`** (Function) — `apps/server/src/services/telegram/utils.ts:24`
- **`getAllConfiguredVipChatIds`** (Function) — `apps/server/src/services/telegram/db-helpers.ts:36`
- **`getVipChatIdsForPlan`** (Function) — `apps/server/src/services/telegram/db-helpers.ts:44`
- **`sendMessage`** (Method) — `apps/server/src/services/telegram/telegram-service.ts:88`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `buildHomeReplyKeyboard` | Function | `apps/server/src/services/telegram/utils.ts` | 3 |
| `describeErrorCause` | Function | `apps/server/src/services/telegram/utils.ts` | 24 |
| `getAllConfiguredVipChatIds` | Function | `apps/server/src/services/telegram/db-helpers.ts` | 36 |
| `getVipChatIdsForPlan` | Function | `apps/server/src/services/telegram/db-helpers.ts` | 44 |
| `sendMessage` | Method | `apps/server/src/services/telegram/telegram-service.ts` | 88 |
| `sendVipEntryLinks` | Method | `apps/server/src/services/telegram/telegram-service.ts` | 114 |
| `grantAccess` | Method | `apps/server/src/services/telegram/telegram-service.ts` | 127 |
| `sendVipActivatedNotice` | Method | `apps/server/src/services/telegram/telegram-service.ts` | 184 |
| `sendVipExpiryReminder` | Method | `apps/server/src/services/telegram/telegram-service.ts` | 191 |
| `sendAdminVipExpiryReminder` | Method | `apps/server/src/services/telegram/telegram-service.ts` | 201 |
| `sendAdminAutoPaymentConfirmedNotice` | Method | `apps/server/src/services/telegram/telegram-service.ts` | 212 |
| `sendOpsAlert` | Method | `apps/server/src/services/telegram/telegram-service.ts` | 239 |
| `handleUpdate` | Method | `apps/server/src/services/telegram/update-handler.ts` | 33 |
| `handleMessage` | Method | `apps/server/src/services/telegram/update-handler.ts` | 62 |
| `routeCommand` | Method | `apps/server/src/services/telegram/update-handler.ts` | 98 |
| `handleCallbackQuery` | Method | `apps/server/src/services/telegram/update-handler.ts` | 171 |
| `handleChatJoinRequest` | Method | `apps/server/src/services/telegram/update-handler.ts` | 188 |
| `handleChannelPost` | Method | `apps/server/src/services/telegram/update-handler.ts` | 238 |
| `apiCall` | Method | `apps/server/src/services/telegram/api.ts` | 5 |
| `sendMessage` | Method | `apps/server/src/services/telegram/api.ts` | 40 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleUpdate → NormalizeUrl` | cross_community | 7 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_90 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "buildHomeReplyKeyboard"})` — see callers and callees
2. `gitnexus_query({query: "telegram"})` — find related execution flows
3. Read key files listed above for implementation details
