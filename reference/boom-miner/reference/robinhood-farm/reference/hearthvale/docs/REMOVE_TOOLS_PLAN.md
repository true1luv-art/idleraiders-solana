# Plan: Remove the Tool System from Hearthvale

**Status:** Approved — ready for implementation  
**Author:** v0  
**Date:** 2026-07-01

---

## Context & Rationale

Tools (Axe, Pickaxe, Stone Pickaxe, Iron Pickaxe, Hammer, Rod) were originally designed as a consumable gate: chopping a tree consumed 1 Axe, mining stone consumed 1 Pickaxe, etc. The intent was to create a resource sink that players would need to regularly restock from the Blacksmith.

**The problem:** Resources (Wood, Stone, Iron, Gold) currently regenerate on timers without any real cost to the player other than stamina. Because tools are crafted for free or for only 1 VTC and do not create any meaningful decision point, the tool system adds friction without adding depth. Players are routinely blocked by "No axes left" errors or forget to restock, degrading the moment-to-moment gameplay feel without a corresponding strategic payoff.

**The goal:** Remove tools as a consumable requirement from all gathering actions. Chopping, stone mining, iron mining, and gold mining should be gated by stamina (already implemented) and skill level (already implemented for iron/gold) — not by a tool inventory count.

---

## What Gets Removed

| Item | Where defined | Current role |
|---|---|---|
| `Axe` | `craftables.ts → TOOLS` | Required 1-per-chop in `chop.ts` |
| `Pickaxe` | `craftables.ts → TOOLS` | Required 1-per-stone-mine in `stoneMine.ts` |
| `Stone Pickaxe` | `craftables.ts → TOOLS` | Required 1-per-iron-mine in `ironMine.ts` |
| `Iron Pickaxe` | `craftables.ts → TOOLS` | Required 1-per-gold-mine in `goldMine.ts` |
| `Hammer` | `craftables.ts → TOOLS` | Already `disabled: true` — dead code |
| `Rod` | `craftables.ts → TOOLS` | Already `disabled: true` — dead code |

The `TOOLS` record and the `Tool` type will be fully deleted. Everything that references them must be cleaned up.

---

## Affected Files

### 1. `features/game/types/craftables.ts`

**Changes:**
- Delete the `Tool` type union (`"Axe" | "Pickaxe" | "Stone Pickaxe" | "Iron Pickaxe" | "Hammer" | "Rod"`).
- Delete the `TOOLS` constant object (6 entries).
- Remove `Tool` from the `CraftableName` union type.
- Remove `...TOOLS` from the `CRAFTABLES()` factory function.
- Remove the `Tool` import/export from any barrel files.

**Note:** `WorkshopResource`, `Food`, `Animal`, and `SeedName` entries inside `CraftableName` are unaffected.

---

### 2. `features/game/events/chop.ts`

**Changes:**
- Delete the `CHOP_ERRORS.MISSING_AXE` and `CHOP_ERRORS.NO_AXES` enum variants (keep `NO_TREE` and `STILL_GROWING`).
- Delete `getRequiredAxeAmount()` helper function entirely.
- Remove the axe-check block from `chop()`:
  ```ts
  // DELETE these lines:
  const requiredAxes = getRequiredAxeAmount(state.inventory);
  if (action.item !== "Axe" && requiredAxes.gt(0)) throw new Error(CHOP_ERRORS.MISSING_AXE);
  const axeAmount = new Decimal(state.inventory.Axe || 0);
  if (axeAmount.lessThan(requiredAxes)) throw new Error(CHOP_ERRORS.NO_AXES);
  ```
- Remove the `Axe: axeAmount.sub(requiredAxes)` line from the returned inventory.
- Remove the `item` field from `ChopAction` — it was only used to identify "Axe" was selected. The action can become just `{ type: "tree.chopped"; index: number }`.
- Remove the `Inventory` import if it is no longer used in the file.

---

### 3. `features/game/events/stoneMine.ts`

**Changes:**
- Delete `MINE_ERRORS.NO_PICKAXES` enum variant.
- Remove the pickaxe-check block from `mineStone()`:
  ```ts
  // DELETE these lines:
  const toolAmount = new Decimal(state.inventory["Pickaxe"] || 0);
  if (toolAmount.lessThan(1)) throw new Error(MINE_ERRORS.NO_PICKAXES);
  ```
- Remove `Pickaxe: toolAmount.sub(1)` from the returned inventory.

---

### 4. `features/game/events/ironMine.ts`

**Changes:**
- Delete `MINE_ERRORS.NO_PICKAXES` enum variant.
- Remove the Stone Pickaxe check block from `mineIron()`:
  ```ts
  // DELETE these lines:
  const toolAmount = new Decimal(state.inventory["Stone Pickaxe"] || 0);
  if (toolAmount.lessThan(1)) throw new Error(MINE_ERRORS.NO_PICKAXES);
  ```
- Remove `"Stone Pickaxe": toolAmount.sub(1)` from the returned inventory.

---

### 5. `features/game/events/goldMine.ts`

**Changes:**
- Delete `MINE_ERRORS.NO_PICKAXES` enum variant.
- Remove the Iron Pickaxe check block from `mineGold()`:
  ```ts
  // DELETE these lines:
  const toolAmount = new Decimal(state.inventory["Iron Pickaxe"] || 0);
  if (toolAmount.lessThan(1)) throw new Error(MINE_ERRORS.NO_PICKAXES);
  ```
- Remove `"Iron Pickaxe": toolAmount.sub(1)` from the returned inventory.

---

### 6. `features/game/events/craft.ts`

**Changes:**
- Remove `TOOLS` from the import line at the top.
- Remove `...TOOLS` from the `VALID_ITEMS` array construction.
- The `craft` handler should no longer allow crafting tool items. The `CraftableName` type will no longer include `Tool` names after step 1, so this will become a compile-time error that confirms the cleanup is complete.

---

### 7. `features/game/types/images.ts`

**Changes:**
- Remove all tool asset imports:
  ```ts
  // DELETE:
  import axe from "assets/tools/axe.png";
  import woodPickaxe from "assets/tools/wood_pickaxe.png";
  import stonePickaxe from "assets/tools/stone_pickaxe.png";
  import ironPickaxe from "assets/tools/iron_pickaxe.png";
  import hammer from "assets/tools/hammer.png";
  import rod from "assets/tools/fishing_rod.png";
  ```
- Remove the six tool entries from `ITEM_DETAILS`:
  `Axe`, `Pickaxe`, `"Stone Pickaxe"`, `"Iron Pickaxe"`, `Hammer`, `Rod`.
- Remove the `TOOLS` import from `craftables`.

---

### 8. `features/hud/components/InventoryItems.tsx`

**Changes:**
- Remove the `Tools` category from `BASKET_CATEGORIES`:
  ```ts
  // DELETE:
  Tools: {
    img: tool,
    items: TOOLS,
  },
  ```
- Remove the `TOOLS` import from `craftables`.
- Remove the `tool` asset import (`assets/tools/hammer.png`).

---

### 9. `features/blacksmith/Blacksmith.tsx`, `features/blacksmith/components/Crafting.tsx`, `features/blacksmith/components/CraftingItems.tsx`

The Blacksmith building currently has two tabs: **Tools** and **Craft** (Workshop Resources).

**Option A — Remove the Blacksmith entirely** (recommended if tools are the only reason the building exists):
- Delete `features/blacksmith/` directory.
- Remove `<Blacksmith />` from `features/game/Game.tsx`.
- Move Workshop Resources crafting into the Kitchen or a dedicated Workshop building if desired.

**Option B — Keep Blacksmith as Workshop only**:
- In `Crafting.tsx`, remove the `"tools"` tab state, remove the Tools `<Tab>` button, and remove the `{tab === "tools" && <CraftingItems items={TOOLS} ... />}` block.
- Remove the `TOOLS` import from `Crafting.tsx`.
- The Blacksmith then only shows the "Craft" tab for Workshop Resources (Firewood, Plank, Brick, Iron Bar, Gold Bar).
- Update the building label/action text from "Craft" to "Workshop" or similar for clarity.

> **Recommendation:** Go with Option B. The Blacksmith building still has a purpose for crafting Workshop Resources (Firewood, Planks, Bricks, Iron Bars, Gold Bars) which are used as cooking fuel and crafting inputs. Removing it entirely would strand those recipes.

---

### 10. `features/blacksmith/lib/mintUtils.ts`

**Review required:** Check if this file references tool minting logic. If it does, delete or refactor it. If it is already only about Workshop Resources, no change is needed.

---

### 11. `features/game/events/chop.test.ts`

**Changes:**
- Remove the two test cases that assert axe errors:
  - `"throws an error if axe is not selected"`
  - `"throws an error if no axes are left"`
- Update the `"chops a tree"` test — remove `Axe` from the inventory setup and remove the `expect(game.inventory.Axe).toEqual(new Decimal(0))` assertion.
- Update the `"chops multiple trees"` test similarly.
- Remove the `"applies Lumberjack skill bonus"` test's `Axe` inventory entry.
- Remove the `ChopAction` import / `item` field usage from all test payloads.

---

### 12. `features/game/events/craft.test.ts`

**Changes:**
- Remove any test cases that test crafting Axe, Pickaxe, or other tools.
- Ensure remaining tests still pass.

---

### 13. `features/game/events/stoneMine.test.ts`, `ironMine.test.ts`, `goldMine.test.ts`

**Changes:**
- Remove test cases that assert `NO_PICKAXES` errors.
- Remove tool items from the inventory setup in all passing test cases.

---

### 14. `features/game/store/useGameStore.ts` (migration)

**Changes:**
- Bump the store `version` number (currently `15`) to `16`.
- In the `migrate` function, strip tool items from the saved inventory so old saves that have `Axe`, `Pickaxe`, `Stone Pickaxe`, `Iron Pickaxe` in their inventory don't carry dead items forward:
  ```ts
  const { Axe, Pickaxe, "Stone Pickaxe": sp, "Iron Pickaxe": ip, ...cleanInventory } = cleanState.inventory ?? {};
  // use cleanInventory instead of cleanState.inventory
  ```

---

### 15. `features/game/lib/constants.ts`

**Changes:**
- The `INITIAL_FARM` and `EMPTY` states do not currently include any tool items in `inventory`, so no changes are needed here.
- Confirm `INITIAL_FARM.inventory` has no tool keys; if any were added during development, remove them.

---

## What Does NOT Change

The following systems are unaffected:

- **Stamina** — still gates all gathering actions (chop, mine, harvest, feed animals).
- **Skill level gates** — Iron mining still requires Mining Level 10; Gold mining still requires Mining Level 25.
- **Tree and rock respawn timers** — Wood (2h), Stone (4h), Iron (12h), Gold (24h) are unchanged.
- **Workshop Resources** — Firewood, Plank, Brick, Iron Bar, Gold Bar remain craftable at the Blacksmith.
- **Foods** — All food recipes are unchanged.
- **Animals** — Chickens, Cows, Sheep are unchanged.
- **Crops** — Planting and harvesting are unchanged.
- **Balance / VTC** — Tool prices (Axe: 1 VTC, Pickaxe: 1 VTC) are removed alongside the items. No other balance changes.

---

## Execution Order

Complete steps in this order to avoid broken imports mid-refactor:

1. **`craftables.ts`** — Delete `Tool` type, `TOOLS` constant, remove from `CraftableName` and `CRAFTABLES()`.
2. **`chop.ts`** — Remove axe checks and `item` field from `ChopAction`.
3. **`stoneMine.ts`** — Remove pickaxe check.
4. **`ironMine.ts`** — Remove stone pickaxe check.
5. **`goldMine.ts`** — Remove iron pickaxe check.
6. **`craft.ts`** — Remove `TOOLS` import and from `VALID_ITEMS`.
7. **`images.ts`** — Remove tool asset imports and `ITEM_DETAILS` entries.
8. **`InventoryItems.tsx`** — Remove `Tools` category from basket.
9. **`blacksmith/Crafting.tsx`** — Remove Tools tab (Option B).
10. **`useGameStore.ts`** — Bump version to 16, add inventory migration to strip tool keys.
11. **Tests** — Update all affected test files.
12. **Verify** — Run `pnpm test` to confirm all tests pass; run `pnpm build` to confirm no TypeScript errors.

---

## Decisions (Resolved)

| # | Question | Decision |
|---|---|---|
| 1 | Should the Blacksmith be renamed to "Workshop"? | **No.** Keep the name "Blacksmith" — it will soon serve as the home for the upcoming equipment system. No label changes required. |
| 2 | Should `ChopAction.item` be removed or kept? | **Remove it entirely.** The game is in testing with no live players, so there is no risk of invalidating saved action logs. The field is deleted from the `ChopAction` type and all call sites. |
| 3 | Were `Rod` and `Hammer` planned for future systems? | **No.** Neither `Rod` nor `Hammer` will ever be used. The game does not have a fishing or building system. Both are deleted along with the rest of the `TOOLS` constant. |
