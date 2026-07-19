# Features Folder — Refactor Review

**Goal:** Every feature follows the same two-folder contract:

```
features/{name}/
  components/   ← all React components (.tsx)
  lib/          ← pure logic, utilities, constants, hooks (.ts)
```

Optional sub-folders allowed inside a feature when the volume justifies it:

| Sub-folder | Purpose |
|---|---|
| `events/` | Game-state reducers / event handlers (only in `game/`) |
| `store/` | Zustand store, selectors, serializers (only in `game/`) |
| `types/` | TypeScript type declarations (only in `game/`) |
| `toast/` | Toast UI + provider (currently inside `game/`, candidate for its own feature) |

---

## Current State vs Target State

### 1. `features/animals`

| Current | Issue | Target |
|---|---|---|
| `components/BarnSale.tsx` | OK | Keep as-is |
| *(no `lib/`)* | No logic file yet — minor | No change needed until logic is extracted |

**Status: compliant.** No change needed.

---

### 2. `features/bank`

| Current | Issue | Target |
|---|---|---|
| `Bank.tsx` (root) | Component sitting at feature root | `components/Bank.tsx` |
| *(no `lib/`)* | No logic extracted | No change needed |

**Proposed move:**
```
features/bank/Bank.tsx
  → features/bank/components/Bank.tsx
```

**Import update required in:** any file that imports from `features/bank/Bank`.

---

### 3. `features/bazaar`

| Current | Issue | Target |
|---|---|---|
| `components/BazaarItems.tsx` | OK | Keep |
| `components/SellFood.tsx` | OK | Keep |
| `components/SellProduce.tsx` | OK | Keep |
| *(no `lib/`)* | Sell logic lives in `features/game/events/sell*.ts` | Consider extracting bazaar-specific display utils to `lib/` later |

**Status: compliant.** No change needed now.

---

### 4. `features/blacksmith`

| Current | Issue | Target |
|---|---|---|
| `components/Crafting.tsx` | OK | Keep |
| `components/CraftingItems.tsx` | OK | Keep |
| `lib/mintUtils.ts` | OK | Keep |

**Status: compliant.** No change needed.

---

### 5. `features/crops`

| Current | Issue | Target |
|---|---|---|
| `components/MarketItems.tsx` | OK | Keep |
| `components/Plants.tsx` | OK | Keep |
| `components/Seeds.tsx` | OK | Keep |
| `lib/plant.ts` | OK | Keep |

**Status: compliant.** No change needed.

---

### 6. `features/fishing`

| Current | Issue | Target |
|---|---|---|
| `components/FishCaughtModal.tsx` | OK | Keep |
| `components/FishingCooldown.tsx` | OK | Keep |
| *(no `lib/`)* | Fishing logic lives in `features/game/lib/fishing.ts` | Consider moving to `features/fishing/lib/fishing.ts` in a future pass |

**Status: compliant.** The `fishing.ts` logic migration is a medium-effort improvement noted below.

---

### 7. `features/game`

This is the largest feature and already uses sub-folders. Review per sub-folder:

| Sub-folder | Current | Issue | Target |
|---|---|---|---|
| *(root)* | `GameProvider.tsx` | Component at feature root | `components/GameProvider.tsx` |
| `events/` | 22 event files + tests | OK — sub-folder is justified | Keep |
| `lib/` | 10 utility files | OK | Keep |
| `store/` | 3 store files | OK | Keep |
| `types/` | 9 type files | OK | Keep |
| `toast/` | `ToastManager.tsx`, `ToastQueueProvider.tsx` | Two-file UI concern inside `game/` | Move to own feature: `features/toast/` |

**Proposed moves:**
```
features/game/GameProvider.tsx
  → features/game/components/GameProvider.tsx

features/game/toast/ToastManager.tsx
  → features/toast/components/ToastManager.tsx

features/game/toast/ToastQueueProvider.tsx
  → features/toast/components/ToastQueueProvider.tsx
```

**Import updates required in:**
- `phaser/PhaserCanvas.tsx` — imports `GameProvider`, `ToastManager`, `ToastQueueProvider`
- Any file importing from `features/game/toast/`

---

### 8. `features/house`

| Current | Issue | Target |
|---|---|---|
| `House.tsx` (root) | Two exported components (`House`, `HouseContent`) at feature root | `components/House.tsx`, `components/HouseContent.tsx` |
| *(no `lib/`)* | SKILL_LABELS constant inline | Extract to `lib/houseConstants.ts` |

**Proposed moves:**
```
features/house/House.tsx
  → features/house/components/House.tsx   (keep both exports in one file for now)

SKILL_LABELS constant
  → features/house/lib/constants.ts
```

**Import updates required in:** any file importing from `features/house/House`.

---

### 9. `features/hud`

| Current | Issue | Target |
|---|---|---|
| `Hud.tsx` (root) | Root-level entry point for the feature | `components/Hud.tsx` |
| `components/*.tsx` (10 files) | OK | Keep |
| `lib/onboarding.ts` | OK | Keep |
| `lib/shortcuts.ts` | OK | Keep |

**Proposed move:**
```
features/hud/Hud.tsx
  → features/hud/components/Hud.tsx
```

**Import updates required in:** `phaser/PhaserCanvas.tsx` which imports `Hud` from `features/hud/Hud`.

---

### 10. `features/kitchen`

| Current | Issue | Target |
|---|---|---|
| `components/Crafting.tsx` | OK | Keep |
| `components/CraftingItems.tsx` | OK | Keep |
| *(no `lib/`)* | No logic extracted yet | No change needed |

**Status: compliant.** No change needed.

---

## Summary of Required Moves

| Priority | Move | Reason |
|---|---|---|
| **High** | `features/bank/Bank.tsx` → `features/bank/components/Bank.tsx` | Component at feature root |
| **High** | `features/house/House.tsx` → `features/house/components/House.tsx` | Component at feature root |
| **High** | `features/hud/Hud.tsx` → `features/hud/components/Hud.tsx` | Component at feature root |
| **High** | `features/game/GameProvider.tsx` → `features/game/components/GameProvider.tsx` | Component at feature root |
| **Medium** | Extract `SKILL_LABELS` from `House.tsx` → `features/house/lib/constants.ts` | Inline constant should live in `lib/` |
| **Medium** | `features/game/toast/` → `features/toast/components/` | Toast is its own UI concern, not core game state |
| **Low** | `features/game/lib/fishing.ts` → `features/fishing/lib/fishing.ts` | Logic belongs in the fishing feature |

---

## Import Files That Need Updating (per move)

### `features/bank/Bank.tsx` → `features/bank/components/Bank.tsx`
Search: `from "features/bank/Bank"` or `from "features/bank"`

### `features/house/House.tsx` → `features/house/components/House.tsx`
Search: `from "features/house/House"` or `from "features/house"`

### `features/hud/Hud.tsx` → `features/hud/components/Hud.tsx`
Search: `from "features/hud/Hud"` — confirmed in `phaser/PhaserCanvas.tsx`

### `features/game/GameProvider.tsx` → `features/game/components/GameProvider.tsx`
Search: `from "features/game/GameProvider"` — confirmed in `phaser/PhaserCanvas.tsx`

### `features/game/toast/` → `features/toast/components/`
Search: `from "features/game/toast/` — confirmed in `phaser/PhaserCanvas.tsx`

---

## Proposed Final Structure (after all moves)

```
features/
  animals/
    components/
      BarnSale.tsx

  bank/
    components/
      Bank.tsx                   ← moved from root

  bazaar/
    components/
      BazaarItems.tsx
      SellFood.tsx
      SellProduce.tsx

  blacksmith/
    components/
      Crafting.tsx
      CraftingItems.tsx
    lib/
      mintUtils.ts

  crops/
    components/
      MarketItems.tsx
      Plants.tsx
      Seeds.tsx
    lib/
      plant.ts

  fishing/
    components/
      FishCaughtModal.tsx
      FishingCooldown.tsx
    lib/
      fishing.ts                 ← moved from features/game/lib/ (low priority)

  game/
    components/
      GameProvider.tsx           ← moved from root
    events/
      catchFish.ts … (22 files)
    lib/
      activity.ts … (9 files, fishing.ts removed in low-priority pass)
    store/
      selectors.ts
      serializer.ts
      useGameStore.ts
    types/
      achievements.ts … (9 files)

  house/
    components/
      House.tsx                  ← moved from root (keeps HouseContent export)
    lib/
      constants.ts               ← SKILL_LABELS extracted here

  hud/
    components/
      Hud.tsx                    ← moved from root
      AnimalAlerts.tsx
      AvatarMenu.tsx
      Balance.tsx
      Inventory.tsx
      InventoryItems.tsx
      InventoryTabContent.tsx
      Menu.tsx
      PlayerHud.tsx
      ScreenshotButton.tsx
      StaminaBar.tsx
      VisitBanner.tsx
      WalletModal.tsx
    lib/
      onboarding.ts
      shortcuts.ts

  kitchen/
    components/
      Crafting.tsx
      CraftingItems.tsx

  toast/                         ← new feature (split from game/toast)
    components/
      ToastManager.tsx
      ToastQueueProvider.tsx
```

---

## Notes

- All moves should be done feature-by-feature on separate branches to keep PRs reviewable.
- No logic changes are needed during the restructure — only file moves and import path updates.
- The `features/game/` `events/`, `store/`, and `types/` sub-folders are non-standard extensions of the base contract but are justified by volume and are already consistent internally — do not flatten them.
- Run `pnpm tsc --noEmit` after each batch of moves to verify no broken imports remain.
