---
name: hooks
description: "Skill for the Hooks area of discordvip-cinema-web. 22 symbols across 13 files."
---

# Hooks

22 symbols | 13 files | Cohesion: 87%

## When to Use

- Working with code in `apps/`
- Understanding how CinemaPage, CinemaChannelsPage, useCinemaPageData work
- Modifying hooks-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/admin/src/pages/cinema/hooks/useCinemaPageData.ts` | toAbsoluteMediaUrl, normalizeChannelPoster, normalizeChannelDetail, useCinemaPageData |
| `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts` | useCinemaActions, startLocalUpload, renameChannel, renameMovie |
| `apps/admin/src/App.js` | useCurrentUser, App |
| `apps/admin/src/api.ts` | logout, patch |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/App.js` | useCurrentUser, App |
| `apps/admin/src/pages/CinemaPage.tsx` | CinemaPage |
| `apps/admin/src/pages/CinemaChannelsPage.tsx` | CinemaChannelsPage |
| `apps/admin/src/pages/cinema/hooks/useCinemaFeedback.ts` | useCinemaFeedback |
| `apps/admin/src/App.tsx` | App |
| `apps/admin/src/hooks/useCurrentUser.ts` | useCurrentUser |

## Entry Points

Start here when exploring this area:

- **`CinemaPage`** (Function) — `apps/admin/src/pages/CinemaPage.tsx:23`
- **`CinemaChannelsPage`** (Function) — `apps/admin/src/pages/CinemaChannelsPage.tsx:22`
- **`useCinemaPageData`** (Function) — `apps/admin/src/pages/cinema/hooks/useCinemaPageData.ts:39`
- **`useCinemaFeedback`** (Function) — `apps/admin/src/pages/cinema/hooks/useCinemaFeedback.ts:2`
- **`useCinemaActions`** (Function) — `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts:11`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `CinemaPage` | Function | `apps/admin/src/pages/CinemaPage.tsx` | 23 |
| `CinemaChannelsPage` | Function | `apps/admin/src/pages/CinemaChannelsPage.tsx` | 22 |
| `useCinemaPageData` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaPageData.ts` | 39 |
| `useCinemaFeedback` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaFeedback.ts` | 2 |
| `useCinemaActions` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts` | 11 |
| `startLocalUpload` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts` | 46 |
| `App` | Function | `apps/admin/src/App.js` | 166 |
| `App` | Function | `apps/admin/src/App.tsx` | 5 |
| `useCurrentUser` | Function | `apps/admin/src/hooks/useCurrentUser.ts` | 5 |
| `App` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/App.tsx` | 5 |
| `App` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/App.js` | 166 |
| `useCurrentUser` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/hooks/useCurrentUser.ts` | 5 |
| `renameChannel` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts` | 102 |
| `renameMovie` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaActions.ts` | 152 |
| `logout` | Method | `apps/admin/src/api.ts` | 59 |
| `logout` | Method | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/api.ts` | 48 |
| `patch` | Method | `apps/admin/src/api.ts` | 45 |
| `toAbsoluteMediaUrl` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaPageData.ts` | 12 |
| `normalizeChannelPoster` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaPageData.ts` | 22 |
| `normalizeChannelDetail` | Function | `apps/admin/src/pages/cinema/hooks/useCinemaPageData.ts` | 29 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `CinemaPage → ToAbsoluteMediaUrl` | intra_community | 4 |
| `CinemaChannelsPage → ToAbsoluteMediaUrl` | intra_community | 4 |
| `CinemaPage → Get` | cross_community | 3 |
| `CinemaPage → Post` | cross_community | 3 |
| `CinemaChannelsPage → Get` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 6 calls |

## How to Explore

1. `gitnexus_context({name: "CinemaPage"})` — see callers and callees
2. `gitnexus_query({query: "hooks"})` — find related execution flows
3. Read key files listed above for implementation details
