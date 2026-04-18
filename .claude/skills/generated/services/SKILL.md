---
name: services
description: "Skill for the Services area of discordvip-cinema-web. 253 symbols across 26 files."
---

# Services

253 symbols | 26 files | Cohesion: 86%

## When to Use

- Working with code in `apps/`
- Understanding how registerLocalCinemaControlRoutes, createApp, registerAdminCinemaRoutes work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/server/src/services/admin-service.ts` | toPlatformFilter, mapPlatformWhere, mapMembershipWhere, formatDiscordDisplayName, getCachedDiscordDisplayName (+42) |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/server/src/services/admin-service.ts` | toPlatformFilter, mapPlatformWhere, mapMembershipWhere, formatDiscordDisplayName, getCachedDiscordDisplayName (+41) |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/server/src/services/telegram-service.ts` | start, syncCommands, pollLoop, apiCall, sendPhoto (+17) |
| `apps/server/src/services/cinema-service.ts` | listAllChannels, renameChannel, adminCopyToChannel, ensureTelegramStorageChannels, listWebMoviesForAdmin (+15) |
| `apps/server/src/services/discord-service.ts` | start, getGuild, getGuildMember, addVipRole, removeVipRole (+7) |
| `apps/server/src/services/membership-service.ts` | getLatestActiveMembershipForPlatformUser, resolveTelegramPlatformChatId, calculateManualMembershipExpireAt, applyPaidOrder, adjustManualMembership (+5) |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/server/src/services/discord-service.ts` | start, getGuild, getGuildMember, addVipRole, removeVipRole (+5) |
| `apps/server/src/services/payment-service.ts` | clearOrderPaymentPrompt, getOrderTarget, processWebhook, processNormalizedPayment, resolvePendingPayment (+4) |
| `apps/server/src/services/cinema/cinema-channel-service.ts` | renameChannel, ensureTelegramStorageChannels, deleteChannel, createOrUpdateChannel, ensureTelegramChannelReady (+3) |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/server/src/services/membership-service.ts` | calculateManualMembershipExpireAt, applyPaidOrder, adjustManualMembership, adjustManualMembershipInTransaction, resolveRoleId (+3) |

## Entry Points

Start here when exploring this area:

- **`registerLocalCinemaControlRoutes`** (Function) — `apps/server/src/http/local-cinema-control.ts:128`
- **`createApp`** (Function) — `apps/server/src/http/app.ts:48`
- **`registerAdminCinemaRoutes`** (Function) — `apps/server/src/http/admin-cinema.ts:44`
- **`deleteChannel`** (Function) — `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts:130`
- **`deleteMovie`** (Function) — `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts:180`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `registerLocalCinemaControlRoutes` | Function | `apps/server/src/http/local-cinema-control.ts` | 128 |
| `createApp` | Function | `apps/server/src/http/app.ts` | 48 |
| `registerAdminCinemaRoutes` | Function | `apps/server/src/http/admin-cinema.ts` | 44 |
| `deleteChannel` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts` | 130 |
| `deleteMovie` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts` | 180 |
| `validatePromoCodeInput` | Function | `apps/server/src/services/promo-code-service.ts` | 17 |
| `validatePromoCodeUpdateInput` | Function | `apps/server/src/services/promo-code-service.ts` | 45 |
| `validatePromoCodeInput` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/server/src/services/promo-code-service.ts` | 17 |
| `validatePromoCodeUpdateInput` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/server/src/services/promo-code-service.ts` | 45 |
| `calculateManualMembershipExpireAt` | Function | `apps/server/src/services/membership-service.ts` | 24 |
| `buildPaidBreakdown` | Function | `apps/server/src/services/admin-service.ts` | 1154 |
| `calculateManualMembershipExpireAt` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/server/src/services/membership-service.ts` | 24 |
| `buildPaidBreakdown` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/server/src/services/admin-service.ts` | 1151 |
| `listAllChannels` | Method | `apps/server/src/services/cinema-service.ts` | 56 |
| `renameChannel` | Method | `apps/server/src/services/cinema-service.ts` | 62 |
| `adminCopyToChannel` | Method | `apps/server/src/services/cinema-service.ts` | 75 |
| `ensureTelegramStorageChannels` | Method | `apps/server/src/services/cinema-service.ts` | 110 |
| `listWebMoviesForAdmin` | Method | `apps/server/src/services/cinema-service.ts` | 118 |
| `renameMovie` | Method | `apps/server/src/services/cinema-service.ts` | 121 |
| `importTelegramItem` | Method | `apps/server/src/services/cinema-service.ts` | 145 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Start → GetFallbackVipChatIds` | cross_community | 6 |
| `Start → ApiCall` | cross_community | 6 |
| `RegisterCinemaRoutes → Delete` | cross_community | 5 |
| `CreateApp → NormalizeUrl` | cross_community | 5 |
| `CreateApp → ToWebAssetRef` | cross_community | 5 |
| `Bootstrap → GetLatestActiveMembershipForPlatformUser` | cross_community | 4 |
| `AdjustDiscordMembershipDuration → FormatDiscordDisplayName` | cross_community | 4 |
| `AdjustDiscordMembershipDuration → SetCachedDiscordDisplayName` | cross_community | 4 |
| `CreateApp → EnsureTelegramStorageChannels` | intra_community | 4 |
| `CreateApp → RenameChannel` | intra_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cinema | 9 calls |
| Telegram | 2 calls |
| Http | 2 calls |

## How to Explore

1. `gitnexus_context({name: "registerLocalCinemaControlRoutes"})` — see callers and callees
2. `gitnexus_query({query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
