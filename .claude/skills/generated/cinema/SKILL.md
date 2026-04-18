---
name: cinema
description: "Skill for the Cinema area of discordvip-cinema-web. 78 symbols across 11 files."
---

# Cinema

78 symbols | 11 files | Cohesion: 70%

## When to Use

- Working with code in `apps/`
- Understanding how inferMediaTypeFromMime, toPrettyMovieTitle, extractEntityList work
- Modifying cinema-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/server/src/services/cinema-service.ts` | listFeedItemsForWeb, getItemForWeb, importTelegramChannelPost, listItemsForWeb, listLibraryItemsForWeb (+13) |
| `apps/server/src/services/cinema/cinema-utils.ts` | inferMediaTypeFromMime, toPrettyMovieTitle, extractEntityList, extractActorsAndGenres, toWebAssetRef (+10) |
| `apps/server/src/services/cinema/cinema-item-service.ts` | listFeedItemsForWeb, getItemForWeb, importTelegramChannelPost, importTelegramItem, toWebRows (+5) |
| `apps/server/src/services/cinema/cinema-view-service.ts` | ensureViewTables, markItemViewed, getDailyViewedCount, setFavorite, listViewedItemIds (+2) |
| `apps/server/src/services/cinema/cinema-media-service.ts` | CinemaMediaService, refreshTelegramFullAssetFileIdByItemId, findTelegramStorageChatId, findTelegramStorageChatIdByItemId, runFfmpeg (+1) |
| `apps/server/src/services/cinema/cinema-scan-job-service.ts` | CinemaScanJobService, createScanJob, runLocalUploadJob, runScanJob, constructor (+1) |
| `apps/server/src/services/cinema/cinema-stream-service.ts` | CinemaStreamService, parseStreamToken, resolveStream, makeStreamToken, getSignedPlaybackLinks |
| `apps/server/src/services/cinema/cinema-auth-service.ts` | CinemaAuthService, createEntryUrl, exchangeEntryTicket, verifyTelegramInitData, exchangeTelegramWebAppSession |
| `apps/server/src/services/cinema/cinema-channel-service.ts` | listChannelsForWeb, listAllChannels, getChannelDetailWithMovies, CinemaChannelService |
| `apps/server/src/scratch/test-sync-11.ts` | main |

## Entry Points

Start here when exploring this area:

- **`inferMediaTypeFromMime`** (Function) — `apps/server/src/services/cinema/cinema-utils.ts:25`
- **`toPrettyMovieTitle`** (Function) — `apps/server/src/services/cinema/cinema-utils.ts:80`
- **`extractEntityList`** (Function) — `apps/server/src/services/cinema/cinema-utils.ts:57`
- **`extractActorsAndGenres`** (Function) — `apps/server/src/services/cinema/cinema-utils.ts:73`
- **`toWebAssetRef`** (Function) — `apps/server/src/services/cinema/cinema-utils.ts:31`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `CinemaViewService` | Class | `apps/server/src/services/cinema/cinema-view-service.ts` | 2 |
| `CinemaStreamService` | Class | `apps/server/src/services/cinema/cinema-stream-service.ts` | 5 |
| `CinemaMediaService` | Class | `apps/server/src/services/cinema/cinema-media-service.ts` | 9 |
| `CinemaAuthService` | Class | `apps/server/src/services/cinema/cinema-auth-service.ts` | 11 |
| `CinemaScanJobService` | Class | `apps/server/src/services/cinema/cinema-scan-job-service.ts` | 11 |
| `CinemaItemService` | Class | `apps/server/src/services/cinema/cinema-item-service.ts` | 8 |
| `CinemaChannelService` | Class | `apps/server/src/services/cinema/cinema-channel-service.ts` | 6 |
| `inferMediaTypeFromMime` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 25 |
| `toPrettyMovieTitle` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 80 |
| `extractEntityList` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 57 |
| `extractActorsAndGenres` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 73 |
| `toWebAssetRef` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 31 |
| `fromB64` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 9 |
| `sign` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 13 |
| `platformToPrisma` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 53 |
| `hashStr` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 17 |
| `buildFingerprint` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 47 |
| `nowSec` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 21 |
| `b64` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 5 |
| `resolveContainerPath` | Function | `apps/server/src/services/cinema/cinema-utils.ts` | 122 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RegisterCinemaRoutes → HashStr` | cross_community | 6 |
| `RegisterCinemaRoutes → Delete` | cross_community | 5 |
| `RegisterCinemaRoutes → NowSec` | cross_community | 5 |
| `CreateApp → ToWebAssetRef` | cross_community | 5 |
| `RegisterLocalCinemaControlRoutes → ToWebAssetRef` | cross_community | 4 |
| `CreateEntryUrl → NormalizeUrl` | cross_community | 4 |
| `VerifyTelegramChannelStatus → FindTelegramStorageChatId` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 1 calls |
| Cluster_90 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "inferMediaTypeFromMime"})` — see callers and callees
2. `gitnexus_query({query: "cinema"})` — find related execution flows
3. Read key files listed above for implementation details
