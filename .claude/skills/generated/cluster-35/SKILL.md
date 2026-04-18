---
name: cluster-35
description: "Skill for the Cluster_35 area of discordvip-cinema-web. 6 symbols across 1 files."
---

# Cluster_35

6 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `apps/`
- Understanding how startSchedulers, sendOpsAlertToAvailableAdapters, runPlatformHealthchecks work
- Modifying cluster_35-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/server/src/scheduler.ts` | startSchedulers, sendOpsAlertToAvailableAdapters, runPlatformHealthchecks, run, scheduleNext (+1) |

## Entry Points

Start here when exploring this area:

- **`startSchedulers`** (Function) — `apps/server/src/scheduler.ts:5`
- **`sendOpsAlertToAvailableAdapters`** (Function) — `apps/server/src/scheduler.ts:24`
- **`runPlatformHealthchecks`** (Function) — `apps/server/src/scheduler.ts:42`
- **`run`** (Function) — `apps/server/src/scheduler.ts:96`
- **`scheduleNext`** (Function) — `apps/server/src/scheduler.ts:195`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `startSchedulers` | Function | `apps/server/src/scheduler.ts` | 5 |
| `sendOpsAlertToAvailableAdapters` | Function | `apps/server/src/scheduler.ts` | 24 |
| `runPlatformHealthchecks` | Function | `apps/server/src/scheduler.ts` | 42 |
| `run` | Function | `apps/server/src/scheduler.ts` | 96 |
| `scheduleNext` | Function | `apps/server/src/scheduler.ts` | 195 |
| `tick` | Function | `apps/server/src/scheduler.ts` | 205 |

## How to Explore

1. `gitnexus_context({name: "startSchedulers"})` — see callers and callees
2. `gitnexus_query({query: "cluster_35"})` — find related execution flows
3. Read key files listed above for implementation details
