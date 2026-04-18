---
name: cluster-8
description: "Skill for the Cluster_8 area of discordvip-cinema-web. 5 symbols across 1 files."
---

# Cluster_8

5 symbols | 1 files | Cohesion: 56%

## When to Use

- Understanding how getFeedAdjacentIndex, pickRandomItem, playNextAuto work
- Modifying cluster_8-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `tmp_cinema_script.js` | getFeedAdjacentIndex, pickRandomItem, playNextAuto, swipeItem, preloadNextFeedItem |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getFeedAdjacentIndex` | Function | `tmp_cinema_script.js` | 272 |
| `pickRandomItem` | Function | `tmp_cinema_script.js` | 574 |
| `playNextAuto` | Function | `tmp_cinema_script.js` | 583 |
| `swipeItem` | Function | `tmp_cinema_script.js` | 1037 |
| `preloadNextFeedItem` | Function | `tmp_cinema_script.js` | 1084 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_7 | 2 calls |
| Cluster_3 | 1 calls |
| Cluster_1 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "getFeedAdjacentIndex"})` — see callers and callees
2. `gitnexus_query({query: "cluster_8"})` — find related execution flows
3. Read key files listed above for implementation details
