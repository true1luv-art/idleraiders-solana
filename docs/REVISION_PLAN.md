# Game Revision Plan

## Overview

Three independent surgical removals:
1. **Item drops from dungeon runs and dungeon bosses** — strip potion drops from dungeon completion and all item/component/catalyst drops from boss raids
2. **Marketplace logic purge** — remove all market service/model/repository/routes/components/actions while keeping `app/game/marketplace/page.tsx` as a layout shell
3. **Redis + BullMQ removal** — remove all queue infrastructure (both `lib/queue/` and `lib/queues/`) and convert transaction service to a direct synchronous flow

---

## 1. Remove Item Drops from Dungeons and Bosses

### What drops currently exist

**Dungeon runs** (`completeDungeonMission` in `lib/modules/missions/mission.service.ts`):
- `potionDrop` — rolled via `rollPotionDrop(cardBoosts.luck)` then saved via `itemService.addPotion()`
- `materials` — rolled from `dungeon.materialPool` — **keep these**, only potion drops are removed

**Boss raids** (`completeBossMission` in the same file):
- Component drops — rolled per material slot via `getBossComponentDrop()` and saved via `itemService.addMaterial()`
- Catalyst drops — rolled per material slot via `getBossCatalystDrop()` and saved via `itemService.addMaterial()`
- Both are stored in `materialDrops[]` and returned as `componentDrop` / `catalystDrop` in `BossCompletionResult`

> Story quest drops (card drops, material drops) are **not touched** — only dungeon and boss drops are affected.

---

### Files to change

#### `lib/modules/missions/mission.service.ts`

**`completeDungeonMission` function:**
- Remove the `rollPotionDrop` call and the `if (potionDrop)` block that calls `itemService.addPotion()`
- Remove `potionDrop` from the return value `{ tokens, materials, potionDrop, xp }` → `{ tokens, materials, xp }`
- Remove `potionDrop` from the history metadata object
- Keep `rollMaterialsFromPool` and all material/token logic intact

**`completeBossMission` function:**
- Remove all drop rolling logic: the `for` loop that rolls `dropRoll < componentChance` and calls `getBossComponentDrop` / `getBossCatalystDrop` / `itemService.addMaterial`
- Remove `materialDrops`, `catalystDrops`, `totalComponentDrops`, `totalCatalystDrops` variables
- Remove `materialCount` calculation (`baseMaterialCount`, `materialsPerFiveMinutes`, `fiveMinutesInSeconds`)
- Remove `matBoostPct` since it's only used for boss drops
- Remove `componentDrop` / `catalystDrop` from the return value; update `BossCompletionResult` return to `{ damage, bossDefeated, xp }`
- Update the history metadata to remove `componentDrops`, `catalystDrops`, `totalMaterialDrops`

**Imports to clean up in `mission.service.ts`:**
- Remove `rollMaterialsFromPool` from the import of `./mission.logic` if it's no longer used (it IS still used in `completeDungeonMission` for material drops — keep it)
- Remove `rollPotionDrop` import from `../items/item.logic`
- Remove `applyBoostCap` import from `../players/player.builder` if only used for `matBoostPct` in boss (it IS still used in dungeon for `matBoostPct` and `xpBoostPct` — keep it)
- Remove `itemService` import only if no other item calls remain — it IS still used in `completeDungeonMission` for `itemService.addMaterial`, so keep it

#### `lib/modules/missions/mission.service.ts` — interface cleanup
- Update `BossCompletionResult` interface: remove `materialDrops`, `componentDrop`, `catalystDrop` fields; keep `damage`, `bossDefeated`, `xp`

#### `app/api/missions/boss/route.ts`
- Check what fields from `BossCompletionResult` are forwarded in the API response and trim `materialDrops`, `componentDrop`, `catalystDrop`

#### `app/api/missions/complete/route.ts`
- Same — trim boss-specific drop fields from the response shape

#### `components/game/world/BossTab.tsx`
- Remove any UI that displays component/catalyst drops in the completion result modal/toast
- Keep damage display, XP display, and bossDefeated logic intact

#### `features/actions/missionActions.ts`
- Check if client-side action handler reads `potionDrop`, `componentDrop`, `catalystDrop` from response — remove those destructuring/display calls
- Keep `tokens`, `materials`, `xp` handling

---

## 2. Marketplace Purge (keep layout page)

### What exists

**API Routes** (all to be deleted):
- `app/api/market/buy/route.ts`
- `app/api/market/cancel/route.ts`
- `app/api/market/sell/route.ts`
- `app/api/market/listings/route.ts`
- `app/api/market/jobs/[jobId]/route.ts`

**Backend modules** (all to be deleted):
- `lib/modules/markets/market.model.ts`
- `lib/modules/markets/market.logic.ts`
- `lib/modules/markets/market.repository.ts`
- `lib/modules/markets/market.service.ts`

**Frontend components** (all to be deleted):
- `components/modals/MarketBuy.tsx`
- `components/modals/MarketSell.tsx`
- `components/marketplace/marketplace-hero.tsx`

**Feature actions** (to be emptied/stubbed):
- `features/actions/marketActions.ts` — delete all market action implementations; replace with stub functions that return `{ success: false, message: 'Marketplace coming soon' }` so imports don't break

**Page to KEEP (gutted to placeholder):**
- `app/game/marketplace/page.tsx` — remove all state, API calls, and content; replace with a "Coming Soon" layout shell that preserves the page route and general structure

### Files to delete
```
app/api/market/buy/route.ts
app/api/market/cancel/route.ts
app/api/market/sell/route.ts
app/api/market/listings/route.ts
app/api/market/jobs/[jobId]/route.ts
lib/modules/markets/market.model.ts
lib/modules/markets/market.logic.ts
lib/modules/markets/market.repository.ts
lib/modules/markets/market.service.ts
components/modals/MarketBuy.tsx
components/modals/MarketSell.tsx
components/marketplace/marketplace-hero.tsx
lib/queue/workers/purchase.worker.ts
lib/queue/workers/cancel.worker.ts
lib/queue/workers/index.ts
lib/queue/purchase.queue.ts
lib/queue/cancel.queue.ts
lib/queue/index.ts
```

### Files to rewrite/stub

**`features/actions/marketActions.ts`**
- Replace all function bodies with stubs returning `{ success: false, message: 'Marketplace coming soon' }`
- Keep function signatures so existing imports compile

**`app/game/marketplace/page.tsx`**
- Replace entire component with a simple "Coming Soon" shell
- Keep the file path, export name, and `'use client'` directive
- No API calls, no state, no imports of deleted modules

---

## 3. Remove Redis + BullMQ (Queues)

### What uses Redis/BullMQ

**Queue infrastructure (delete):**
- `lib/queue/index.ts` — re-exports purchase/cancel queues and redis
- `lib/queue/purchase.queue.ts` — BullMQ queue for marketplace purchases
- `lib/queue/cancel.queue.ts` — BullMQ queue for marketplace cancellations
- `lib/queue/workers/purchase.worker.ts` — BullMQ worker for purchases
- `lib/queue/workers/cancel.worker.ts` — BullMQ worker for cancellations
- `lib/queue/workers/index.ts` — worker index
- `lib/queues/snapshot.queue.ts` — BullMQ queue for weekly leaderboard snapshots
- `lib/queues/transaction.queue.ts` — BullMQ queue for blockchain transactions

**Redis config/client (delete):**
- `lib/redis/client.ts` — ioredis singleton proxy
- `lib/config/redis.ts` — `getRedisConnection()` / `closeRedisConnection()`

**Transaction service — convert to direct execution:**
- `lib/modules/transactions/transaction.service.ts` — heavily uses Redis locks and BullMQ; needs full rewrite
  - Remove `acquireUserTxLock`, `releaseUserTxLock`, `refreshUserTxLock`, `reserveUserTxSlot` (all Redis-based locking)
  - Replace with a simple **DB-only duplicate check**: before creating a tx, check `transactionRepo.findPendingBySender(username, 1)` for pending tx guard, and the existing MongoDB unique index on `transactionId` handles chain-tx deduplication
  - Replace `addTransactionJob(...)` calls with direct `transaction.processor.processTransaction(tx._id)` calls (synchronous inline processing)
  - Remove `recoverPendingTransactions` (no longer needed without a queue)
  - Remove import of `addTransactionJob` from `lib/queues/transaction.queue`
  - Remove import of `getRedisConnection` from `lib/config/redis`

**Snapshot queue — convert to direct execution:**
- `lib/queues/snapshot.queue.ts` — the snapshot job logic needs to be moved to a direct function call in the weekly snapshot API/cron route; the queue/worker infrastructure is removed
- Any route that calls `scheduleWeeklySnapshot()` should instead call the snapshot processing function directly

**`app/api/market/jobs/[jobId]/route.ts`** — deleted as part of marketplace purge above

### Dependencies to remove from `package.json`
```json
"bullmq": "^5.34.0",
"ioredis": "^5.4.2"
```

### Environment variable
- `REDIS_URL` is no longer needed — document in the plan that it can be removed from Vercel env vars after deployment

---

## 4. Execution Order

Work in this order to avoid cascading compile errors:

1. **Delete marketplace files first** (no other modules depend on them)
   - Delete all `app/api/market/*` routes
   - Delete all `lib/modules/markets/*` files
   - Delete all market-related components and workers
   - Stub `features/actions/marketActions.ts`
   - Replace `app/game/marketplace/page.tsx` with coming-soon shell

2. **Remove dungeon/boss item drops**
   - Edit `lib/modules/missions/mission.service.ts` — strip potion from dungeon, strip all drops from boss
   - Update `BossCompletionResult` interface
   - Update `app/api/missions/boss/route.ts` and `app/api/missions/complete/route.ts` response shapes
   - Update `components/game/world/BossTab.tsx` to remove drop UI
   - Update `features/actions/missionActions.ts` client handling

3. **Remove Redis + queues last** (transaction service depends on queue — rewrite that simultaneously)
   - Delete `lib/redis/client.ts`
   - Delete `lib/config/redis.ts`
   - Delete `lib/queue/*` and `lib/queues/*`
   - Rewrite `lib/modules/transactions/transaction.service.ts` to be queue-free
   - Remove `bullmq` and `ioredis` from `package.json`

---

## 5. Files Summary

### Files to Delete (total: ~20)
| File | Reason |
|------|--------|
| `app/api/market/buy/route.ts` | Marketplace purge |
| `app/api/market/cancel/route.ts` | Marketplace purge |
| `app/api/market/sell/route.ts` | Marketplace purge |
| `app/api/market/listings/route.ts` | Marketplace purge |
| `app/api/market/jobs/[jobId]/route.ts` | Marketplace purge + queue removal |
| `lib/modules/markets/market.model.ts` | Marketplace purge |
| `lib/modules/markets/market.logic.ts` | Marketplace purge |
| `lib/modules/markets/market.repository.ts` | Marketplace purge |
| `lib/modules/markets/market.service.ts` | Marketplace purge |
| `components/modals/MarketBuy.tsx` | Marketplace purge |
| `components/modals/MarketSell.tsx` | Marketplace purge |
| `components/marketplace/marketplace-hero.tsx` | Marketplace purge |
| `lib/queue/index.ts` | Queue removal |
| `lib/queue/purchase.queue.ts` | Queue removal |
| `lib/queue/cancel.queue.ts` | Queue removal |
| `lib/queue/workers/purchase.worker.ts` | Queue removal |
| `lib/queue/workers/cancel.worker.ts` | Queue removal |
| `lib/queue/workers/index.ts` | Queue removal |
| `lib/queues/snapshot.queue.ts` | Queue removal |
| `lib/queues/transaction.queue.ts` | Queue removal |
| `lib/redis/client.ts` | Queue removal |
| `lib/config/redis.ts` | Queue removal |

### Files to Rewrite/Edit (total: ~8)
| File | Changes |
|------|---------|
| `lib/modules/missions/mission.service.ts` | Remove potion drop from dungeon; remove all drops from boss |
| `features/actions/missionActions.ts` | Remove `potionDrop`, `componentDrop`, `catalystDrop` response handling |
| `components/game/world/BossTab.tsx` | Remove drop display UI |
| `app/api/missions/boss/route.ts` | Remove drop fields from response |
| `app/api/missions/complete/route.ts` | Remove drop fields from boss response shape |
| `lib/modules/transactions/transaction.service.ts` | Remove Redis locks + BullMQ; use direct DB checks + inline processing |
| `features/actions/marketActions.ts` | Replace with stubs |
| `app/game/marketplace/page.tsx` | Replace with coming-soon shell |

---

## 6. Notes & Risks

- **Story quest drops are untouched** — `completeStoryQuest` card/material drops stay as-is
- **Dungeon materials are untouched** — only `potionDrop` is removed from dungeon completion
- **Boss damage + XP stay** — `completeBossMission` still tracks damage and XP; only the material/component/catalyst drop loop is removed
- **Transaction integrity** — removing Redis NX locks means the race-condition window between two simultaneous submissions is covered only by the MongoDB unique index on `transactionId` (chain tx deduplication) and a DB pending-tx check. This is acceptable as the unique index is the authoritative guard; the Redis NX lock was a secondary optimization. Consider adding an optimistic concurrency check in the DB layer if needed.
- **Snapshot queue** — `scheduleWeeklySnapshot()` callers (any cron/admin route) must be updated to call the snapshot processor directly. Identify those call sites before removing the queue.
- **`lib/config/config.ts`** — check if it imports `REDIS_URL` from environment; remove that reference.
- **Worker startup code** — check `proxy.ts` or any server entry point for `createPurchaseWorker()` / `createCancelWorker()` / transaction worker startup calls; remove them.
- **`eslint.config.mjs`** — no queue-specific lint rules, no changes needed.
