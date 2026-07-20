# Data Layer Refactor Plan

> **Status:** Draft — pending review  
> **Scope:** `public/data/**` (all 18 files)  
> **Goal:** Eliminate duplication, split monolithic files, flatten unnecessary nesting, and establish a consistent barrel pattern.

---

## 1. Current State — Problems

### 1.1 `progression/progression.ts` — 1,527-line monolith

This is the most critical problem. A single file currently owns **four completely unrelated game systems**:

| Block | Lines (approx) | Should live in |
|---|---|---|
| `ACHIEVEMENTS` | ~160 | `progression/achievements.ts` |
| `CRAFTING` | ~1,076 | `progression/crafting.ts` |
| `GUILD_LEVELS`, `DONATION_RATES`, `GUILDS` | ~100 | `guilds/config.ts` |
| `GUILD_PERK_BRANCHES` | ~200 | `guilds/perks.ts` |
| `GUILD_WAR_CONFIG`, `WAR_ECONOMY_CONFIG` | ~110 | `guilds/war.ts` |

**Impact:** Any edit to a guild war config requires scrolling past 900 lines of crafting recipes. The file has no logical cohesion.

---

### 1.2 `progression/achievements.ts` — Duplicate of progression.ts

`achievements.ts` exists as a standalone file but the **exact same `ACHIEVEMENTS` array is also defined inside `progression.ts`** under the same export name. One of them is stale and the two will drift.

**Evidence:**
```
public/data/progression/achievements.ts   → exports ACHIEVEMENTS
public/data/progression/progression.ts    → also exports ACHIEVEMENTS (line ~7)
```

One must be deleted and the other made the single source of truth.

---

### 1.3 `items/items.ts` — Dead exports and redundant aliases

```ts
export const MATERIALS: never[] = []          // ← Dead. Comment says "Materials have been removed".
export const ITEMS_DATA_ARRAY = [...POTIONS, ...PACKS]  // ← Alias of the line below
export const ITEMS_DATA = ITEMS_DATA_ARRAY    // ← Same data, two names
```

`bosses.ts` still imports `MATERIALS` from this file and calls `.filter()` on it — this silently produces empty arrays every time.

---

### 1.4 `system/` and `economy/` — Unnecessary folder wrappers

Both are single-file domains with very few constants. The folder adds a path segment with no benefit:

| Current path | Size | Problem |
|---|---|---|
| `system/system.ts` | 3 constants | `system/system.ts` reads as redundant |
| `economy/economy.ts` | 3 constants | Same redundancy |

---

### 1.5 `cards/` — 5 rarity files for 20 heroes total

The cards domain splits heroes across five files by rarity. Each file is a simple array export. Current totals:

| File | Hero count |
|---|---|
| `legendary.ts` | 1 |
| `epic.ts` | 2 |
| `rare.ts` | 3 |
| `uncommon.ts` | 6 |
| `common.ts` | 8 |
| **Total** | **20** |

20 hero definitions do not need 5 files. This is premature file splitting. The split only makes sense once each tier contains enough heroes that reading a single file becomes impractical (e.g. 20+ per rarity).

The rarity-per-file approach also forces `cards/index.ts` to maintain 5 separate imports and a spread merge, creating boilerplate that grows with every new rarity tier added.

---

### 1.6 `world/` — Inconsistent barrel pattern

`world/index.ts` is a proper barrel that re-exports `bosses`, `dungeons`, and `territories`. The `cards/` directory also has an `index.ts` barrel. But `system/`, `economy/`, `items/`, and `progression/` all export directly from their single `.ts` file without a barrel — meaning `public/data/index.ts` must import from `./items/items`, `./progression/progression`, etc. (the filename repeated). The pattern should be uniform.

---

## 2. Proposed New Structure

```
public/data/
├── index.ts                     ← Root aggregator (unchanged shape, updated imports)
│
├── cards/
│   ├── heroes.ts                ← All 20 hero definitions (replaces 5 rarity files)
│   ├── stories.ts               ← Unchanged
│   ├── config.ts                ← Renamed from cardConfig.ts (interfaces + stat functions)
│   └── index.ts                 ← Barrel (unchanged logic)
│
├── world/
│   ├── bosses.ts                ← Unchanged (remove MATERIALS import — it's always [])
│   ├── dungeons.ts              ← Unchanged
│   ├── territories.ts           ← Unchanged
│   └── index.ts                 ← Unchanged
│
├── items/
│   ├── potions.ts               ← POTIONS array only
│   ├── packs.ts                 ← PACKS array only
│   └── index.ts                 ← Barrel: combines + exports ITEMS_DATA
│
├── economy/
│   ├── marketplace.ts           ← MARKETPLACE + MATERIAL_CONVERSION constants
│   ├── rewards.ts               ← MISSION_REWARDS constant
│   └── index.ts                 ← Barrel: exports ECONOMY_DATA
│
├── system/
│   ├── player.ts                ← PLAYER constant
│   ├── energy.ts                ← ENERGY constant
│   └── index.ts                 ← Barrel: exports SYSTEM_DATA
│
├── progression/
│   ├── achievements.ts          ← Single source of truth for ACHIEVEMENTS (delete from progression.ts)
│   ├── crafting.ts              ← ~1,076 lines of CRAFTING recipes extracted from progression.ts
│   └── index.ts                 ← Barrel: exports PROGRESSION_DATA
│
└── guilds/
    ├── config.ts                ← GUILD_LEVELS, DONATION_RATES, GUILDS base config
    ├── perks.ts                 ← GUILD_PERK_BRANCHES (types + data)
    ├── war.ts                   ← GUILD_WAR_CONFIG + WAR_ECONOMY_CONFIG
    └── index.ts                 ← Barrel: exports GUILDS_DATA
```

> **Note on `GAME_DATA`:** The root `index.ts` export shape stays identical. Consumers (`lib/registries/`, `context/GameContext.tsx`, etc.) do not need to change.

---

## 3. File-by-File Changes

### 3.1 Delete

| File | Reason |
|---|---|
| `cards/legendary.ts` | Merged into `cards/heroes.ts` |
| `cards/epic.ts` | Merged into `cards/heroes.ts` |
| `cards/rare.ts` | Merged into `cards/heroes.ts` |
| `cards/uncommon.ts` | Merged into `cards/heroes.ts` |
| `cards/common.ts` | Merged into `cards/heroes.ts` |
| `progression/achievements.ts` | Duplicate — canonical version kept in `progression/achievements.ts` after progression.ts is split |

> `progression/progression.ts` itself is effectively deleted and replaced by the three new `progression/` files plus the new `guilds/` directory.

---

### 3.2 Rename

| Old | New | Reason |
|---|---|---|
| `cards/cardConfig.ts` | `cards/config.ts` | Shorter, consistent with other `config.ts` files |

---

### 3.3 Create

| New file | Source content |
|---|---|
| `cards/heroes.ts` | Merge of all 5 rarity arrays |
| `items/potions.ts` | `POTIONS` from `items/items.ts` |
| `items/packs.ts` | `PACKS` from `items/items.ts` |
| `items/index.ts` | New barrel |
| `economy/marketplace.ts` | `MARKETPLACE` + `MATERIAL_CONVERSION` |
| `economy/rewards.ts` | `MISSION_REWARDS` |
| `economy/index.ts` | New barrel |
| `system/player.ts` | `PLAYER` constant |
| `system/energy.ts` | `ENERGY` constant |
| `system/index.ts` | New barrel |
| `progression/crafting.ts` | `CRAFTING` array extracted from `progression.ts` |
| `progression/index.ts` | New barrel |
| `guilds/config.ts` | `GUILD_LEVELS`, `DONATION_RATES`, `GUILDS` |
| `guilds/perks.ts` | `GuildPerkEffectType`, `IGuildPerkTier`, `IGuildPerkBranch`, `GUILD_PERK_BRANCHES` |
| `guilds/war.ts` | `GUILD_WAR_CONFIG`, `WAR_ECONOMY_CONFIG` |
| `guilds/index.ts` | New barrel exporting `GUILDS_DATA` |

---

### 3.4 Update

| File | Change |
|---|---|
| `cards/index.ts` | Replace 5 rarity imports with single `import { HERO_CARDS } from './heroes'` |
| `world/bosses.ts` | Remove `import { MATERIALS }` — replace `DEFAULT_COMPONENT_POOL` and `DEFAULT_CATALYST_POOL` with `[]` or remove entirely since materials were removed |
| `public/data/index.ts` | Update imports to use barrel `index.ts` for each domain; add `GUILDS` to `GAME_DATA` |

---

## 4. Dead Code to Remove

| Location | Dead code | Action |
|---|---|---|
| `items/items.ts` | `export const MATERIALS: never[] = []` | Delete — nothing should reference it |
| `items/items.ts` | `export const ITEMS_DATA_ARRAY` | Delete — rename final export to just `ITEMS_DATA` |
| `world/bosses.ts` | `import { MATERIALS } from "../items/items"` | Delete — `DEFAULT_COMPONENT_POOL` and `DEFAULT_CATALYST_POOL` both resolve to `[]` |
| `world/bosses.ts` | `DEFAULT_COMPONENT_POOL` / `DEFAULT_CATALYST_POOL` | Evaluate whether callers in `lib/` still use these; remove if not |
| `progression/progression.ts` | Entire `ACHIEVEMENTS` block (~160 lines) | Removed; `achievements.ts` becomes the single source |

---

## 5. `GAME_DATA` Root Shape — Before vs After

### Before
```ts
const GAME_DATA = {
  CARDS: CARDS_DATA,
  ITEMS: ITEMS_DATA,
  WORLD: WORLD_DATA,
  PROGRESSION: PROGRESSION_DATA,   // contains ACHIEVEMENTS + CRAFTING + GUILDS
  SYSTEM: SYSTEM_DATA,
  ECONOMY: ECONOMY_DATA,
}
```

### After
```ts
const GAME_DATA = {
  CARDS: CARDS_DATA,
  ITEMS: ITEMS_DATA,
  WORLD: WORLD_DATA,
  ACHIEVEMENTS: ACHIEVEMENTS_DATA,  // split out
  CRAFTING: CRAFTING_DATA,          // split out
  GUILDS: GUILDS_DATA,              // promoted from PROGRESSION.GUILDS
  SYSTEM: SYSTEM_DATA,
  ECONOMY: ECONOMY_DATA,
}
```

> **Breaking change for consumers.** Callers that currently access `GAME_DATA.PROGRESSION.ACHIEVEMENTS`, `GAME_DATA.PROGRESSION.CRAFTING`, or `GAME_DATA.PROGRESSION.GUILDS` will need to be updated to `GAME_DATA.ACHIEVEMENTS`, `GAME_DATA.CRAFTING`, and `GAME_DATA.GUILDS` respectively.  
> Run a codebase-wide search for `PROGRESSION_DATA` and `GAME_DATA.PROGRESSION` before executing this change.

If the breaking change is undesirable in the short term, `PROGRESSION_DATA` can keep its current shape and simply import from the new split files — preserving the existing consumer API while still splitting the 1,527-line file.

---

## 6. File Count Comparison

| | Before | After |
|---|---|---|
| Total files | 18 | 27 |
| Files > 500 lines | 2 (`progression.ts` 1,527 · `territories.ts` ~500) | 1 (`territories.ts`) |
| Duplicate definitions | 1 (`ACHIEVEMENTS` x2) | 0 |
| Dead exports | 3 (`MATERIALS`, `ITEMS_DATA_ARRAY`, unused pools) | 0 |
| Monolith files (>1,000 lines) | 1 | 0 |

---

## 7. Implementation Order

1. **Split `progression/progression.ts`** — highest priority, biggest win. Extract in this order:
   - Move `CRAFTING` → `progression/crafting.ts`
   - Move guild types + `GUILD_LEVELS` + `DONATION_RATES` → `guilds/config.ts`
   - Move `GUILD_PERK_BRANCHES` (and its types) → `guilds/perks.ts`
   - Move `GUILD_WAR_CONFIG` + `WAR_ECONOMY_CONFIG` → `guilds/war.ts`
   - Create `guilds/index.ts` barrel
   - Delete the `ACHIEVEMENTS` duplicate from `progression.ts` (keep `achievements.ts`)
   - Create `progression/index.ts` barrel

2. **Merge hero rarity files** → `cards/heroes.ts`, update `cards/index.ts`

3. **Clean `items/`** — remove dead `MATERIALS`, remove `ITEMS_DATA_ARRAY` alias, create barrel

4. **Clean `world/bosses.ts`** — remove `MATERIALS` import and dead pool constants

5. **Flatten `system/` and `economy/`** into barrels (or keep single-file, just rename to `index.ts`)

6. **Update root `public/data/index.ts`** imports to use barrels throughout

7. **Search and update all consumers** if `GAME_DATA` shape is changed (step 5 above)

---

## 8. Notes & Decisions Needed

- **`GAME_DATA.PROGRESSION` shape change** — confirm whether to keep backward-compatible wrapper or do a clean break. See Section 5.
- **`DEFAULT_COMPONENT_POOL` / `DEFAULT_CATALYST_POOL` in `bosses.ts`** — these resolve to `[]` since materials were removed. Confirm with `lib/modules/missions/` whether they are still referenced at runtime before deleting.
- **`crafting.ts` references `getCardStats`** from `cards/cardConfig.ts` — ensure the import path updates correctly when the file is renamed to `cards/config.ts`.
