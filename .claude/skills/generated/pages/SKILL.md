---
name: pages
description: "Skill for the Pages area of discordvip-cinema-web. 106 symbols across 25 files."
---

# Pages

106 symbols | 25 files | Cohesion: 70%

## When to Use

- Working with code in `migration-artifacts/`
- Understanding how TelegramChannelsPage, load, togglePlanCode work
- Modifying pages-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/MembershipsPage.tsx` | MembershipsPage, load, buildPath, lookupDiscordUser, grantManualMembership (+7) |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | TelegramChannelsPage, load, togglePlanCode, saveNewChannel, toggleEditPlanCode (+5) |
| `apps/admin/src/pages/PromoCodesPage.tsx` | toLocalDateTimeValue, toIsoOrNull, PromoCodesPage, syncEditState, load (+5) |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/PromoCodesPage.tsx` | toLocalDateTimeValue, toIsoOrNull, PromoCodesPage, syncEditState, load (+5) |
| `apps/admin/src/pages/TelegramChannelsPage.tsx` | TelegramChannelsPage, load, saveChannel, createVerificationToken, cleanupExpiredVerifications (+1) |
| `apps/admin/src/pages/PlansPage.tsx` | PlansPage, syncEditState, load, createPlan, updatePlan (+1) |
| `apps/admin/src/pages/MembershipsPage.tsx` | MembershipsPage, load, buildPath, handleManualGrant, handleAdjustMembership (+1) |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/PlansPage.tsx` | PlansPage, syncEditState, load, createPlan, updatePlan (+1) |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/PendingPage.tsx` | PendingPage, load, searchOrders, resolvePayment, deletePendingPayment (+1) |
| `apps/admin/src/pages/PendingPage.tsx` | PendingPage, load, resolvePayment, deletePendingPayment, confirmOrder (+1) |

## Entry Points

Start here when exploring this area:

- **`TelegramChannelsPage`** (Function) — `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx:20`
- **`load`** (Function) — `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx:35`
- **`togglePlanCode`** (Function) — `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx:65`
- **`saveNewChannel`** (Function) — `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx:74`
- **`toggleEditPlanCode`** (Function) — `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx:97`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `TelegramChannelsPage` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | 20 |
| `load` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | 35 |
| `togglePlanCode` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | 65 |
| `saveNewChannel` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | 74 |
| `toggleEditPlanCode` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | 97 |
| `saveEditChannel` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | 111 |
| `createVerificationToken` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | 138 |
| `cleanupExpiredVerifications` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | 157 |
| `copyText` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | 175 |
| `deleteChannel` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/pages/TelegramChannelsPage.tsx` | 188 |
| `TelegramChannelsPage` | Function | `apps/admin/src/pages/TelegramChannelsPage.tsx` | 47 |
| `load` | Function | `apps/admin/src/pages/TelegramChannelsPage.tsx` | 63 |
| `saveChannel` | Function | `apps/admin/src/pages/TelegramChannelsPage.tsx` | 95 |
| `createVerificationToken` | Function | `apps/admin/src/pages/TelegramChannelsPage.tsx` | 122 |
| `cleanupExpiredVerifications` | Function | `apps/admin/src/pages/TelegramChannelsPage.tsx` | 141 |
| `deleteChannel` | Function | `apps/admin/src/pages/TelegramChannelsPage.tsx` | 159 |
| `ensureStorageAndScan` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts` | 26 |
| `cancelJob` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts` | 67 |
| `retryJob` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts` | 80 |
| `currency` | Function | `apps/admin/src/utils/format.ts` | 0 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `PromoCodesPage → ToLocalDateTimeValue` | intra_community | 5 |
| `PromoCodesPage → ToLocalDateTimeValue` | intra_community | 5 |
| `TelegramChannelsPage → Get` | cross_community | 4 |
| `MembershipsPage → CacheKey` | cross_community | 4 |
| `MembershipsPage → Post` | cross_community | 4 |
| `MembershipsPage → Get` | cross_community | 4 |
| `MembershipsPage → BuildPath` | intra_community | 4 |
| `PromoCodesPage → Get` | cross_community | 4 |
| `PromoCodesPage → Get` | cross_community | 4 |
| `MembershipsPage → Get` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Components | 1 calls |

## How to Explore

1. `gitnexus_context({name: "TelegramChannelsPage"})` — see callers and callees
2. `gitnexus_query({query: "pages"})` — find related execution flows
3. Read key files listed above for implementation details
