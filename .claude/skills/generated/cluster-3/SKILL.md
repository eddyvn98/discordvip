---
name: cluster-3
description: "Skill for the Cluster_3 area of discordvip-cinema-web. 12 symbols across 1 files."
---

# Cluster_3

12 symbols | 1 files | Cohesion: 71%

## When to Use

- Understanding how syncFullscreenMainButton, isLandscape, onOrientationLikeChange work
- Modifying cluster_3-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `tmp_cinema_script.js` | syncFullscreenMainButton, isLandscape, onOrientationLikeChange, togglePseudoFullscreen, updatePipButtons (+7) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `syncFullscreenMainButton` | Function | `tmp_cinema_script.js` | 73 |
| `isLandscape` | Function | `tmp_cinema_script.js` | 80 |
| `onOrientationLikeChange` | Function | `tmp_cinema_script.js` | 86 |
| `togglePseudoFullscreen` | Function | `tmp_cinema_script.js` | 96 |
| `updatePipButtons` | Function | `tmp_cinema_script.js` | 168 |
| `actionPulse` | Function | `tmp_cinema_script.js` | 188 |
| `showFullscreenControls` | Function | `tmp_cinema_script.js` | 193 |
| `fmtTime` | Function | `tmp_cinema_script.js` | 432 |
| `updatePlaybackDock` | Function | `tmp_cinema_script.js` | 439 |
| `exitPip` | Function | `tmp_cinema_script.js` | 486 |
| `resetPlayer` | Function | `tmp_cinema_script.js` | 505 |
| `endPipPointer` | Function | `tmp_cinema_script.js` | 1191 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Boot → IsLandscape` | cross_community | 6 |
| `Boot → FmtTime` | cross_community | 6 |
| `EnterPip → IsLandscape` | cross_community | 5 |
| `EnterPip → FmtTime` | cross_community | 5 |
| `Boot → ActionPulse` | cross_community | 5 |
| `Boot → SetFeedTransitionPreview` | cross_community | 5 |
| `OnOrientationLikeChange → IsLandscape` | intra_community | 5 |
| `OnOrientationLikeChange → FmtTime` | intra_community | 5 |
| `OpenItem → IsLandscape` | cross_community | 4 |
| `OpenItem → FmtTime` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_7 | 1 calls |
| Cluster_5 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "syncFullscreenMainButton"})` — see callers and callees
2. `gitnexus_query({query: "cluster_3"})` — find related execution flows
3. Read key files listed above for implementation details
