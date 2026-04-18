---
name: cluster-5
description: "Skill for the Cluster_5 area of discordvip-cinema-web. 7 symbols across 1 files."
---

# Cluster_5

7 symbols | 1 files | Cohesion: 83%

## When to Use

- Understanding how clamp, pipMinWidth, pipMaxWidth work
- Modifying cluster_5-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `tmp_cinema_script.js` | clamp, pipMinWidth, pipMaxWidth, getSafeBounds, applyPipRect (+2) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `clamp` | Function | `tmp_cinema_script.js` | 123 |
| `pipMinWidth` | Function | `tmp_cinema_script.js` | 124 |
| `pipMaxWidth` | Function | `tmp_cinema_script.js` | 125 |
| `getSafeBounds` | Function | `tmp_cinema_script.js` | 126 |
| `applyPipRect` | Function | `tmp_cinema_script.js` | 133 |
| `snapPipToCorner` | Function | `tmp_cinema_script.js` | 148 |
| `enterPip` | Function | `tmp_cinema_script.js` | 467 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `EnterPip → IsLandscape` | cross_community | 5 |
| `EnterPip → FmtTime` | cross_community | 5 |
| `EnterPip → ActionPulse` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_3 | 4 calls |

## How to Explore

1. `gitnexus_context({name: "clamp"})` — see callers and callees
2. `gitnexus_query({query: "cluster_5"})` — find related execution flows
3. Read key files listed above for implementation details
