---
name: cluster-37
description: "Skill for the Cluster_37 area of discordvip-cinema-web. 9 symbols across 1 files."
---

# Cluster_37

9 symbols | 1 files | Cohesion: 80%

## When to Use

- Working with code in `apps/`
- Understanding how handleTrial, handleVipStatus, handleRedeemVip work
- Modifying cluster_37-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/server/src/index.ts` | handleTrial, handleVipStatus, handleRedeemVip, handleGrantVip, handleRevokeVip (+4) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `handleTrial` | Function | `apps/server/src/index.ts` | 111 |
| `handleVipStatus` | Function | `apps/server/src/index.ts` | 136 |
| `handleRedeemVip` | Function | `apps/server/src/index.ts` | 171 |
| `handleGrantVip` | Function | `apps/server/src/index.ts` | 248 |
| `handleRevokeVip` | Function | `apps/server/src/index.ts` | 278 |
| `buildManualReviewComponents` | Function | `apps/server/src/index.ts` | 297 |
| `lockManualReviewMessage` | Function | `apps/server/src/index.ts` | 312 |
| `handleManualReviewAction` | Function | `apps/server/src/index.ts` | 328 |
| `bootstrap` | Function | `apps/server/src/index.ts` | 623 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Bootstrap → GetLatestActiveMembershipForPlatformUser` | cross_community | 4 |
| `Bootstrap → BuildOrderMessage` | cross_community | 3 |
| `Bootstrap → BuildVipAccessTitle` | cross_community | 3 |
| `Bootstrap → SendPhoto` | cross_community | 3 |
| `Bootstrap → BuildManualReviewComponents` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Services | 3 calls |
| Cinema | 1 calls |

## How to Explore

1. `gitnexus_context({name: "handleTrial"})` — see callers and callees
2. `gitnexus_query({query: "cluster_37"})` — find related execution flows
3. Read key files listed above for implementation details
