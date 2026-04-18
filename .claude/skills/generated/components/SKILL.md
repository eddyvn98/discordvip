---
name: components
description: "Skill for the Components area of discordvip-cinema-web. 12 symbols across 9 files."
---

# Components

12 symbols | 9 files | Cohesion: 88%

## When to Use

- Working with code in `apps/`
- Understanding how cn, AdminLayout, getPageTitle work
- Modifying components-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/admin/src/components/layout/AdminLayout.tsx` | AdminLayout, getPageTitle |
| `apps/admin/src/pages/cinema/components/CinemaChannelDetails.tsx` | CinemaChannelDetails, cancelMovieEdit |
| `apps/admin/src/pages/cinema/components/CinemaWebMoviesPanel.tsx` | CinemaWebMoviesPanel, cancelEdit |
| `apps/admin/src/lib/utils.ts` | cn |
| `apps/admin/src/components/ui/badge.tsx` | Badge |
| `apps/admin/src/pages/cinema/components/CinemaStats.tsx` | CinemaStats |
| `apps/admin/src/pages/cinema/components/CinemaMovieGrid.tsx` | CinemaMovieGrid |
| `apps/admin/src/pages/cinema/components/CinemaChannelListItem.tsx` | CinemaChannelListItem |
| `apps/admin/src/pages/cinema/components/CinemaChannelGrid.tsx` | CinemaChannelGrid |

## Entry Points

Start here when exploring this area:

- **`cn`** (Function) — `apps/admin/src/lib/utils.ts:3`
- **`AdminLayout`** (Function) — `apps/admin/src/components/layout/AdminLayout.tsx:30`
- **`getPageTitle`** (Function) — `apps/admin/src/components/layout/AdminLayout.tsx:34`
- **`CinemaStats`** (Function) — `apps/admin/src/pages/cinema/components/CinemaStats.tsx:14`
- **`CinemaMovieGrid`** (Function) — `apps/admin/src/pages/cinema/components/CinemaMovieGrid.tsx:40`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `cn` | Function | `apps/admin/src/lib/utils.ts` | 3 |
| `AdminLayout` | Function | `apps/admin/src/components/layout/AdminLayout.tsx` | 30 |
| `getPageTitle` | Function | `apps/admin/src/components/layout/AdminLayout.tsx` | 34 |
| `CinemaStats` | Function | `apps/admin/src/pages/cinema/components/CinemaStats.tsx` | 14 |
| `CinemaMovieGrid` | Function | `apps/admin/src/pages/cinema/components/CinemaMovieGrid.tsx` | 40 |
| `CinemaChannelListItem` | Function | `apps/admin/src/pages/cinema/components/CinemaChannelListItem.tsx` | 11 |
| `CinemaChannelGrid` | Function | `apps/admin/src/pages/cinema/components/CinemaChannelGrid.tsx` | 22 |
| `CinemaChannelDetails` | Function | `apps/admin/src/pages/cinema/components/CinemaChannelDetails.tsx` | 30 |
| `cancelMovieEdit` | Function | `apps/admin/src/pages/cinema/components/CinemaChannelDetails.tsx` | 87 |
| `CinemaWebMoviesPanel` | Function | `apps/admin/src/pages/cinema/components/CinemaWebMoviesPanel.tsx` | 16 |
| `cancelEdit` | Function | `apps/admin/src/pages/cinema/components/CinemaWebMoviesPanel.tsx` | 39 |
| `Badge` | Function | `apps/admin/src/components/ui/badge.tsx` | 29 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Pages | 2 calls |

## How to Explore

1. `gitnexus_context({name: "cn"})` — see callers and callees
2. `gitnexus_query({query: "components"})` — find related execution flows
3. Read key files listed above for implementation details
