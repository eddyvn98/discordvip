---
name: cluster-7
description: "Skill for the Cluster_7 area of discordvip-cinema-web. 5 symbols across 1 files."
---

# Cluster_7

5 symbols | 1 files | Cohesion: 63%

## When to Use

- Understanding how setFeedTransitionPreview, clearFeedSwipeTransition, runFeedSwipeTransition work
- Modifying cluster_7-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `tmp_cinema_script.js` | setFeedTransitionPreview, clearFeedSwipeTransition, runFeedSwipeTransition, updateFeedDragPreview, settleFeedDrag |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `setFeedTransitionPreview` | Function | `tmp_cinema_script.js` | 213 |
| `clearFeedSwipeTransition` | Function | `tmp_cinema_script.js` | 240 |
| `runFeedSwipeTransition` | Function | `tmp_cinema_script.js` | 254 |
| `updateFeedDragPreview` | Function | `tmp_cinema_script.js` | 290 |
| `settleFeedDrag` | Function | `tmp_cinema_script.js` | 309 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Boot → SetFeedTransitionPreview` | cross_community | 5 |
| `NavBack → SetFeedTransitionPreview` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_8 | 1 calls |
| Cluster_1 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "setFeedTransitionPreview"})` — see callers and callees
2. `gitnexus_query({query: "cluster_7"})` — find related execution flows
3. Read key files listed above for implementation details
