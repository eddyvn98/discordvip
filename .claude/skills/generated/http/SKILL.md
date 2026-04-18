---
name: http
description: "Skill for the Http area of discordvip-cinema-web. 38 symbols across 19 files."
---

# Http

38 symbols | 19 files | Cohesion: 82%

## When to Use

- Working with code in `apps/`
- Understanding how registerCinemaRoutes, getWatchUsage, proxyTelethonBigStream work
- Modifying http-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/server/src/http/cinema.ts` | registerCinemaRoutes, getWatchUsage, proxyTelethonBigStream, renderCinemaWithDevBypass, renderEntry |
| `apps/server/src/http/cinema-stream-utils.ts` | makeTelefilmInitData, proxyStaticFile, proxyTelefilmStream, isSameOriginPlaybackRequest, isTelegramOrigin |
| `apps/server/src/services/cinema-service.ts` | setItemFavorite, resolveTelegramFile, requireCinemaSession |
| `apps/server/src/http/cinema-auth.ts` | adminFallbackSession, requireCinemaSession, requireVip |
| `apps/server/src/http/webhooks.ts` | verifySepayApiKey, parseWebhookPayload, registerWebhookRoutes |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/server/src/http/webhooks.ts` | verifySepayApiKey, parseWebhookPayload, registerWebhookRoutes |
| `apps/server/src/lib/public-base-url.ts` | getCinemaPublicOrigin, isTryCloudflareOrigin |
| `apps/server/src/http/auth.ts` | registerAuthRoutes, applyDevCinemaLogin |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/server/src/http/app.ts` | isAllowedOrigin, createApp |
| `apps/server/src/http/cinema-rate-limiter.ts` | rateLimit |

## Entry Points

Start here when exploring this area:

- **`registerCinemaRoutes`** (Function) — `apps/server/src/http/cinema.ts:20`
- **`getWatchUsage`** (Function) — `apps/server/src/http/cinema.ts:23`
- **`proxyTelethonBigStream`** (Function) — `apps/server/src/http/cinema.ts:30`
- **`makeTelefilmInitData`** (Function) — `apps/server/src/http/cinema-stream-utils.ts:49`
- **`proxyStaticFile`** (Function) — `apps/server/src/http/cinema-stream-utils.ts:68`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `registerCinemaRoutes` | Function | `apps/server/src/http/cinema.ts` | 20 |
| `getWatchUsage` | Function | `apps/server/src/http/cinema.ts` | 23 |
| `proxyTelethonBigStream` | Function | `apps/server/src/http/cinema.ts` | 30 |
| `makeTelefilmInitData` | Function | `apps/server/src/http/cinema-stream-utils.ts` | 49 |
| `proxyStaticFile` | Function | `apps/server/src/http/cinema-stream-utils.ts` | 68 |
| `proxyTelefilmStream` | Function | `apps/server/src/http/cinema-stream-utils.ts` | 93 |
| `rateLimit` | Function | `apps/server/src/http/cinema-rate-limiter.ts` | 2 |
| `renderCinemaWithDevBypass` | Function | `apps/server/src/http/cinema.ts` | 57 |
| `renderEntry` | Function | `apps/server/src/http/cinema.ts` | 72 |
| `renderEntryBootstrapHtml` | Function | `apps/server/src/http/cinema-bootstrap-html.ts` | 2 |
| `renderCinemaHtml` | Function | `apps/server/src/http/cinema-html/index.ts` | 6 |
| `getCinemaJs` | Function | `apps/server/src/http/cinema-html/js/index.ts` | 7 |
| `getCinemaHtmlBody` | Function | `apps/server/src/http/cinema-html/html/layout.ts` | 0 |
| `getCinemaCss` | Function | `apps/server/src/http/cinema-html/css/index.ts` | 6 |
| `requireCinemaSession` | Function | `apps/server/src/http/cinema-auth.ts` | 16 |
| `requireVip` | Function | `apps/server/src/http/cinema-auth.ts` | 27 |
| `getCinemaPublicOrigin` | Function | `apps/server/src/lib/public-base-url.ts` | 63 |
| `isTryCloudflareOrigin` | Function | `apps/server/src/lib/public-base-url.ts` | 67 |
| `isSameOriginPlaybackRequest` | Function | `apps/server/src/http/cinema-stream-utils.ts` | 8 |
| `isTelegramOrigin` | Function | `apps/server/src/http/cinema-stream-utils.ts` | 25 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RegisterCinemaRoutes → HashStr` | cross_community | 6 |
| `RegisterCinemaRoutes → Delete` | cross_community | 5 |
| `RegisterCinemaRoutes → NowSec` | cross_community | 5 |
| `CreateApp → NormalizeUrl` | cross_community | 5 |
| `CreateApp → AdminFallbackSession` | cross_community | 4 |
| `CreateApp → IsTryCloudflareOrigin` | cross_community | 3 |
| `CreateApp → RateLimit` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cinema | 13 calls |
| Cluster_90 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "registerCinemaRoutes"})` — see callers and callees
2. `gitnexus_query({query: "http"})` — find related execution flows
3. Read key files listed above for implementation details
