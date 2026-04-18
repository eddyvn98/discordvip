---
name: cluster-1
description: "Skill for the Cluster_1 area of discordvip-cinema-web. 14 symbols across 1 files."
---

# Cluster_1

14 symbols | 1 files | Cohesion: 67%

## When to Use

- Understanding how showState, applySessionMeta, showFeedControls work
- Modifying cluster_1-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `tmp_cinema_script.js` | showState, applySessionMeta, showFeedControls, scheduleFeedSkip, feedInitials (+9) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `showState` | Function | `tmp_cinema_script.js` | 6 |
| `applySessionMeta` | Function | `tmp_cinema_script.js` | 10 |
| `showFeedControls` | Function | `tmp_cinema_script.js` | 203 |
| `scheduleFeedSkip` | Function | `tmp_cinema_script.js` | 347 |
| `feedInitials` | Function | `tmp_cinema_script.js` | 361 |
| `ensureFeedRows` | Function | `tmp_cinema_script.js` | 367 |
| `enterFeedMode` | Function | `tmp_cinema_script.js` | 372 |
| `api` | Function | `tmp_cinema_script.js` | 531 |
| `waitForMediaReady` | Function | `tmp_cinema_script.js` | 654 |
| `finish` | Function | `tmp_cinema_script.js` | 657 |
| `cleanup` | Function | `tmp_cinema_script.js` | 658 |
| `openItem` | Function | `tmp_cinema_script.js` | 672 |
| `boot` | Function | `tmp_cinema_script.js` | 774 |
| `showPaywall` | Method | `tmp_cinema_script.js` | 1369 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Boot → IsLandscape` | cross_community | 6 |
| `Boot → FmtTime` | cross_community | 6 |
| `Boot → ActionPulse` | cross_community | 5 |
| `Boot → SetFeedTransitionPreview` | cross_community | 5 |
| `OpenItem → IsLandscape` | cross_community | 4 |
| `OpenItem → FmtTime` | cross_community | 4 |
| `Boot → ClosePanels` | cross_community | 4 |
| `Boot → SyncFullscreenMainButton` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_4 | 5 calls |
| Cluster_8 | 3 calls |
| Cluster_3 | 3 calls |
| Cluster_7 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "showState"})` — see callers and callees
2. `gitnexus_query({query: "cluster_1"})` — find related execution flows
3. Read key files listed above for implementation details
