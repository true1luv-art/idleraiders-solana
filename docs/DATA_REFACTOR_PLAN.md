# Data Layer Refactor Plan

> **Status:** Draft — pending review  
> **Scope:** `public/data/**` (18 files, 3,347 lines total)  
> **Goal:** Remove dead code you've already removed from the game, eliminate duplication, split the monolith, and establish a consistent barrel pattern.

---

## 1. Dead Code Audit — What to Remove Now

These are constants that are confirmed dead: either their feature was removed from the game, they are exact duplicates, or they are redundant aliases.

### 1.1 `items/items.ts` — Materials were removed

```ts
// ← DEAD. Comment in the file says "Materials have been removed from the game."
export const MATERIALS: never[] = []
```

**Problem:** `world/bosses.ts` still imports `MATERIALS` and runs `.filter()` on it to build two constants that are silently always empty:

```ts
// world/bosses.ts
import { MATERIALS } from "../items/items"

export const DEFAULT_COMPONENT_POOL = MATERIALS.filter((m) => m.type === "component").map((m) => m.id)
// → always []

export const DEFAULT_CATALYST_POOL = MATERIALS.filter((m) => m.type === "catalyst").map((m) => m.id)
// → always []
```

**Action:** Delete `MATERIALS` from `items/items.ts`. Remove the `import { MATERIALS }` from `bosses.ts` and replace `DEFAULT_COMPONENT_POOL` / `DEFAULT_CATALYST_POOL` with `[]` literals (or remove the constants entirely — they are never referenced outside `bosses.ts`).

---

### 1.2 `items/items.ts` — Redundant alias `ITEMS_DATA_ARRAY`

```ts
export const ITEMS_DATA_ARRAY = [...POTIONS, ...PACKS]  // ← alias of the line below
export const ITEMS_DATA = ITEMS_DATA_ARRAY              // ← actual default export
```

`ITEMS_DATA_ARRAY` is never imported anywhere in the codebase (confirmed by global search). It exists only as an intermediate variable that is then assigned to `ITEMS_DATA`.

**Action:** Inline the spread directly into `ITEMS_DATA`. Remove `ITEMS_DATA_ARRAY`.

---

### 1.3 `economy/economy.ts` — `MATERIAL_CONVERSION` is dead

```ts
export const MATERIAL_CONVERSION = {
  ratio: 5,
  coinCostPerZone: 25,
  coinCost: 25,   // "Legacy field retained for backwards compatibility"
}
```

`MATERIAL_CONVERSION` is exported inside `ECONOMY_DATA` but is **never imported anywhere in the application** (confirmed by global search). The conversion feature relied on materials, which were removed. The comment inside the file itself says the live logic is in `lib/modules/items/item.service.ts:convertMaterials` — which should be checked and removed too.

**Action:** Remove `MATERIAL_CONVERSION` from `economy.ts` and from the `ECONOMY_DATA` export object.

---

### 1.4 `progression/progression.ts` — Duplicate `ACHIEVEMENTS`

`achievements.ts` defines and exports `ACHIEVEMENTS`. `progression.ts` **also defines and exports `ACHIEVEMENTS`** (lines 7–159), with the **same IDs but different `rewards` fields** — the one in `progression.ts` has coin/shard rewards, the one in `achievements.ts` does not.

This is an active divergence, not just a copy. The two files are already inconsistent:

| ID | `progression.ts` reward | `achievements.ts` reward |
|---|---|---|
| `first_blood` | `{ coins: 100 }` | none |
| `veteran` | `{ coins: 500 }` | none |
| `guild_member` | present (social category) | **missing** |

**Action:** Decide which is canonical. The `progression.ts` version has rewards — if achievements reward coins, that file wins. Delete the `achievements.ts` file and keep only the version in `progression.ts` (to be later split out to its own file). Update the doc to reflect this.

---

### 1.5 `progression/progression.ts` — `CRAFTING` references removed card types

`CRAFTING` calls `getCardStats({ type: 'equipment', ... })` and `getCardStats({ type: 'transport', ... })` extensively. Looking at `cardConfig.ts`:

```ts
export const CARD_BASE_STATS: Record<string, CardStats> = {
  hero: { raidPower: 60, mastery: 30, luck: 0, gm: 1 },
  // equipment, transport, mount, relic, artifact are NOT defined
}
```

`CARD_BASE_STATS` only contains `hero`. For any other type, `generateCardStats` hits this branch:

```ts
if (!base) {
  return { raidPower: 0, mastery: 0, luck: 0, gm: 0 }
}
```

So every crafting recipe produces `stats: { raidPower: 0, mastery: 0, luck: 0, gm: 0 }`. The entire `CRAFTING` array produces zero-stat items — because the underlying card types (`equipment`, `transport`) were removed from the game along with materials.

**This is the largest dead block:** ~916 lines (lines 165–1,076 of `progression.ts`).

**Action:** Confirm crafting has been removed from the game. If yes, delete the entire `CRAFTING` const and the `import getCardStats` at the top of `progression.ts`. Remove `CRAFTING` from the `PROGRESSION_DATA` export object.

---

### 1.6 `lib/types/index.ts` — `GameData.ITEMS` type is stale

```ts
export interface GameData {
  ITEMS: {
    MATERIALS: Array<{ id: string; name: string; rarity: Rarity }>  // ← Materials removed
    CONSUMABLES: Array<{ id: string; name: string; effect: string }> // ← No CONSUMABLES in items.ts
  }
  ...
  PROGRESSION: Record<string, unknown>  // ← Very loose, should be tightened
}
```

The actual `ITEMS_DATA` from `items/items.ts` is `[...POTIONS, ...PACKS]`. There are no `MATERIALS` and no `CONSUMABLES` — the `GameData` type is lying about the shape.

**Action:** Update `GameData.ITEMS` to match reality: `Array<{ id: string; name: string; ... }>` (flat array), or type it as `{ POTIONS: ...; PACKS: ... }` if splitting items by category.

---

## 2. Structural Problems (Separate from Dead Code)

These are not dead code but are worth addressing in the same refactor pass.

### 2.1 `progression/progression.ts` — 1,527-line monolith

Even after removing `ACHIEVEMENTS` (duplicate) and `CRAFTING` (dead), the file still contains guild config, guild perks, and guild war economy — three separate concerns in one file.

| Block | Lines | Should live in |
|---|---|---|
| `ACHIEVEMENTS` | ~160 | `progression/achievements.ts` (after choosing canonical version) |
| `CRAFTING` | ~916 | **Delete** (dead — all stats are zero) |
| `GUILD_LEVELS`, `DONATION_RATES` | ~90 | `guilds/config.ts` |
| `GUILD_PERK_BRANCHES` (+ types) | ~200 | `guilds/perks.ts` |
| `GUILD_WAR_CONFIG`, `WAR_ECONOMY_CONFIG` | ~100 | `guilds/war.ts` |

---

### 2.2 `cards/` — 5 rarity files for 20 heroes total

| File | Count |
|---|---|
| `legendary.ts` | 1 hero |
| `epic.ts` | 2 heroes |
| `rare.ts` | 3 heroes |
| `uncommon.ts` | 6 heroes |
| `common.ts` | 8 heroes |
| **Total** | **20 heroes** |

20 definitions across 5 files is premature splitting. A single `heroes.ts` is easier to scan, and `cards/index.ts` can drop its 5 separate imports.

---

### 2.3 `world/bosses.ts` — Bosses reference removed card types via drop rates

`bosses.ts` has `dropRate: { component: 75, catalyst: 25 }` on every boss. Materials (components and catalysts) were removed. These fields are dead data. Whether to remove them or leave them for future use is a product decision — flagged here for review.

---

## 3. Proposed New Structure

```
public/data/
├── index.ts                     ← Root aggregator (GAME_DATA shape updated)
│
├── cards/
│   ├── heroes.ts                ← All 20 heroes (replaces 5 rarity files)
│   ├── stories.ts               ← Unchanged
│   ├── cardConfig.ts            ← Unchanged (hero-only stat system)
│   └── index.ts                 ← Barrel (updated to import from heroes.ts)
│
├── world/
│   ├── bosses.ts                ← Remove MATERIALS import + dead pool consts
│   ├── dungeons.ts              ← Unchanged
│   ├── territories.ts           ← Unchanged
│   └── index.ts                 ← Unchanged
│
├── items/
│   ├── items.ts                 ← Remove MATERIALS and ITEMS_DATA_ARRAY; keep POTIONS + PACKS
│   └── (index.ts optional)
│
├── economy/
│   ├── economy.ts               ← Remove MATERIAL_CONVERSION
│   └── (index.ts optional)
│
├── system/
│   └── system.ts                ← Unchanged
│
├── progression/
│   ├── achievements.ts          ← Single source (canonical version from progression.ts)
│   └── index.ts                 ← Barrel exporting PROGRESSION_DATA (GUILDS only after split)
│
└── guilds/                      ← New directory, extracted from progression.ts
    ├── config.ts                ← GUILD_LEVELS, DONATION_RATES, GUILDS base config
    ├── perks.ts                 ← GuildPerkEffectType, IGuildPerkTier, GUILD_PERK_BRANCHES
    ├── war.ts                   ← GUILD_WAR_CONFIG, WAR_ECONOMY_CONFIG
    └── index.ts                 ← Barrel exporting GUILDS_DATA
```

---

## 4. Dead Code Removal — Exact Changes

### Priority 1: `items/items.ts`

**Remove:**
```ts
// DELETE this line
export const MATERIALS: never[] = []

// DELETE this alias
export const ITEMS_DATA_ARRAY = [...POTIONS, ...PACKS]

// CHANGE to inline
export const ITEMS_DATA = [...POTIONS, ...PACKS]
```

### Priority 2: `world/bosses.ts`

**Remove:**
```ts
// DELETE import
import { MATERIALS } from "../items/items"

// DELETE these two consts (they resolve to [] — never used outside this file)
export const DEFAULT_COMPONENT_POOL = MATERIALS
  .filter((m) => m.type === "component")
  .map((m) => m.id)

export const DEFAULT_CATALYST_POOL = MATERIALS
  .filter((m) => m.type === "catalyst")
  .map((m) => m.id)
```

### Priority 3: `economy/economy.ts`

**Remove:**
```ts
// DELETE the entire MATERIAL_CONVERSION block
export const MATERIAL_CONVERSION = { ... }

// REMOVE from ECONOMY_DATA object
export const ECONOMY_DATA = {
  MISSION_REWARDS,
  MARKETPLACE,
  // MATERIAL_CONVERSION,  ← delete this line
}
```

### Priority 4: `progression/progression.ts` — Remove CRAFTING (~916 lines)

**Remove:**
```ts
// DELETE line 1
import getCardStats from '../cards/cardConfig'

// DELETE lines 165–1,076
export const CRAFTING = [ ... ]  // entire array

// REMOVE from PROGRESSION_DATA
export const PROGRESSION_DATA = {
  ACHIEVEMENTS,
  // CRAFTING,  ← delete this line
  GUILDS,
}
```

### Priority 5: `progression/achievements.ts` — Resolve the duplicate

**Decision required:** The `progression.ts` version has `rewards` fields; `achievements.ts` does not. Choose one, delete the other, make it the single source.

Recommendation: Keep `progression.ts` version (it has more data), extract it to `progression/achievements.ts`, and delete the current `achievements.ts`.

### Priority 6: `lib/types/index.ts` — Fix `GameData.ITEMS`

**Change:**
```ts
// BEFORE
ITEMS: {
  MATERIALS: Array<{ id: string; name: string; rarity: Rarity }>
  CONSUMABLES: Array<{ id: string; name: string; effect: string }>
}

// AFTER (matches actual shape: flat array of potions + packs)
ITEMS: Array<{ id: string; name: string; [key: string]: unknown }>
```

---

## 5. File Count Impact

| Metric | Before | After (dead-code-only pass) |
|---|---|---|
| Dead exports | 6 | 0 |
| Duplicate definitions | 1 (`ACHIEVEMENTS` x2) | 0 |
| `progression.ts` lines | 1,527 | ~450 (after CRAFTING removed) |
| Files with always-[] imports | 1 (`bosses.ts`) | 0 |

---

## 6. Implementation Order

1. **`items/items.ts`** — Remove `MATERIALS`, inline `ITEMS_DATA` (5-minute fix, no ripple effect)
2. **`world/bosses.ts`** — Remove `import { MATERIALS }` and the two dead pool consts
3. **`economy/economy.ts`** — Remove `MATERIAL_CONVERSION` and its entry in `ECONOMY_DATA`
4. **`progression/progression.ts`** — Delete the `CRAFTING` const and `import getCardStats` (removes ~920 lines)
5. **`progression/achievements.ts`** — Resolve the duplicate (pick canonical, delete the other)
6. **`lib/types/index.ts`** — Fix `GameData.ITEMS` type
7. **Structural refactor** (separate PR) — Merge hero rarity files, extract guilds to own directory

---

## 7. Open Questions

| # | Question | Impact |
|---|---|---|
| 1 | Is `CRAFTING` fully removed from the game or planned for later? | If later: move to `progression/crafting.ts` instead of deleting |
| 2 | Do `DEFAULT_COMPONENT_POOL` / `DEFAULT_CATALYST_POOL` get referenced in `lib/modules/missions/`? | If yes, replace with `[]` literals there too |
| 3 | Which `ACHIEVEMENTS` version is canonical — with or without `rewards`? | Determines which file to delete |
| 4 | Should `bosses.ts` `dropRate: { component, catalyst }` fields be cleaned up too? | Cosmetic — materials are gone |
| 5 | Should `GAME_DATA.PROGRESSION` be split into `ACHIEVEMENTS` + `GUILDS` at the root? | Breaking change for consumers |
