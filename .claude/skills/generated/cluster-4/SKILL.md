---
name: cluster-4
description: "Skill for the Cluster_4 area of discordvip-cinema-web. 17 symbols across 1 files."
---

# Cluster_4

17 symbols | 1 files | Cohesion: 83%

## When to Use

- Understanding how hideState, closeFeedDrawer, exitFeedMode work
- Modifying cluster_4-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `tmp_cinema_script.js` | hideState, closeFeedDrawer, exitFeedMode, openFeedChannelDrawer, closePanels (+12) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `hideState` | Function | `tmp_cinema_script.js` | 122 |
| `closeFeedDrawer` | Function | `tmp_cinema_script.js` | 400 |
| `exitFeedMode` | Function | `tmp_cinema_script.js` | 401 |
| `openFeedChannelDrawer` | Function | `tmp_cinema_script.js` | 413 |
| `closePanels` | Function | `tmp_cinema_script.js` | 454 |
| `setPlayerMode` | Function | `tmp_cinema_script.js` | 462 |
| `escAttr` | Function | `tmp_cinema_script.js` | 536 |
| `cardHtml` | Function | `tmp_cinema_script.js` | 537 |
| `upNextCardHtml` | Function | `tmp_cinema_script.js` | 538 |
| `bindCardClicks` | Function | `tmp_cinema_script.js` | 549 |
| `filtered` | Function | `tmp_cinema_script.js` | 570 |
| `navBack` | Function | `tmp_cinema_script.js` | 593 |
| `renderChannels` | Function | `tmp_cinema_script.js` | 599 |
| `renderChannelItems` | Function | `tmp_cinema_script.js` | 619 |
| `openChannel` | Function | `tmp_cinema_script.js` | 634 |
| `resetToHome` | Function | `tmp_cinema_script.js` | 807 |
| `applySearchInput` | Function | `tmp_cinema_script.js` | 849 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Boot → IsLandscape` | cross_community | 6 |
| `Boot → FmtTime` | cross_community | 6 |
| `Boot → ActionPulse` | cross_community | 5 |
| `Boot → SetFeedTransitionPreview` | cross_community | 5 |
| `Boot → ClosePanels` | cross_community | 4 |
| `Boot → SyncFullscreenMainButton` | cross_community | 4 |
| `NavBack → SetFeedTransitionPreview` | cross_community | 4 |
| `NavBack → CloseFeedDrawer` | intra_community | 4 |
| `NavBack → Filtered` | intra_community | 4 |
| `NavBack → IsLandscape` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_3 | 3 calls |
| Cluster_1 | 2 calls |
| Cluster_7 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "hideState"})` — see callers and callees
2. `gitnexus_query({query: "cluster_4"})` — find related execution flows
3. Read key files listed above for implementation details
