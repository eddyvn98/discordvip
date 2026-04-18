---
name: auth
description: "Skill for the Auth area of discordvip-cinema-web. 10 symbols across 6 files."
---

# Auth

10 symbols | 6 files | Cohesion: 100%

## When to Use

- Working with code in `apps/`
- Understanding how LoginScreen, LoginScreen, handleDebugLogin work
- Modifying auth-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/admin/src/api.ts` | loginUrl, debugLogin |
| `apps/admin/src/components/auth/LoginScreen.tsx` | LoginScreen, handleDebugLogin |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/api.ts` | loginUrl, debugLogin |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/components/auth/LoginScreen.tsx` | LoginScreen, handleDebugLogin |
| `apps/admin/src/App.js` | LoginScreen |
| `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/App.js` | LoginScreen |

## Entry Points

Start here when exploring this area:

- **`LoginScreen`** (Function) — `apps/admin/src/components/auth/LoginScreen.tsx:4`
- **`LoginScreen`** (Function) — `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/components/auth/LoginScreen.tsx:4`
- **`handleDebugLogin`** (Function) — `apps/admin/src/components/auth/LoginScreen.tsx:9`
- **`handleDebugLogin`** (Function) — `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/components/auth/LoginScreen.tsx:9`
- **`loginUrl`** (Method) — `apps/admin/src/api.ts:56`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `LoginScreen` | Function | `apps/admin/src/components/auth/LoginScreen.tsx` | 4 |
| `LoginScreen` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/components/auth/LoginScreen.tsx` | 4 |
| `handleDebugLogin` | Function | `apps/admin/src/components/auth/LoginScreen.tsx` | 9 |
| `handleDebugLogin` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/components/auth/LoginScreen.tsx` | 9 |
| `loginUrl` | Method | `apps/admin/src/api.ts` | 56 |
| `loginUrl` | Method | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/api.ts` | 45 |
| `debugLogin` | Method | `apps/admin/src/api.ts` | 62 |
| `debugLogin` | Method | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/api.ts` | 51 |
| `LoginScreen` | Function | `apps/admin/src/App.js` | 29 |
| `LoginScreen` | Function | `migration-artifacts/discordvip-migration-20260324-092420/apps/admin/src/App.js` | 29 |

## How to Explore

1. `gitnexus_context({name: "LoginScreen"})` — see callers and callees
2. `gitnexus_query({query: "auth"})` — find related execution flows
3. Read key files listed above for implementation details
