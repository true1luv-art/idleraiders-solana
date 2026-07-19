# Data Centralization Proposal — `features/game/lib/data/`

**Status:** Draft — awaiting review  
**Date:** 2026-07-01  
**Last revised:** 2026-07-01 — updated to reflect completed animal tending and fishing systems

---

## The Problem

The game's tunable values are spread across six files:

| File | What it holds |
|---|---|
| `types/crops.ts` | Crop buy/sell prices, harvest timers, seed prices, level requirements |
| `types/craftables.ts` | Food ingredients + sell prices, animal purchase costs + level gates |
| `types/resources.ts` | Produce sell prices (Egg, Milk, Wool), fish sell prices (14 fish), resource descriptions |
| `types/skills.ts` | Skill bonus thresholds and magnitudes (`INITIAL_BONUS`) |
| `lib/constants.ts` | Animal production timers, re-hunger delays, max animal counts, fishing cooldown constants, initial world layout |
| `lib/skills.ts` | XP per action (`SKILL_XP`), XP curve constants (`BASE_XP`, etc.), `computeBonus()` if-chain |
| `lib/stamina.ts` | Stamina costs per action, regen rate, offline regen cap |
| `events/chop.ts` | Tree recovery time (`TREE_RECOVERY_SECONDS`) — hardcoded locally |
| `events/stoneMine.ts` | Stone recovery time (`STONE_RECOVERY_TIME`) — hardcoded locally |
| `events/ironMine.ts` | Iron recovery time + level gate — hardcoded locally |
| `events/goldMine.ts` | Gold recovery time + level gate — hardcoded locally |
| `events/feedChicken.ts` | `WHEAT_REQUIRED = 1` — hardcoded locally, not shared |
| `events/feedCow.ts` | `KALE_REQUIRED = 1` — hardcoded locally, not shared |
| `events/feedSheep.ts` | `CABBAGE_REQUIRED = 1` — hardcoded locally, not shared |
| `lib/fishing.ts` | `FISH_TABLE` — 14 fish entries with weight, minLevel, sellPrice — currently inline |

These files mix **type definitions, helper functions, and raw tuning values** in the same file. Rebalancing the economy (e.g. changing Egg sell price or halving stone recovery) requires hunting across type files and risking accidental logic changes in the same edit.

There is no `lib/data/` folder today. It needs to be created.

---

## Proposed Structure

```
features/game/lib/data/
  crops.data.ts        ← crop prices, harvest timers, seed prices, level requirements
  food.data.ts         ← food recipes (ingredients + amounts), sell prices, XP per craft
  animals.data.ts      ← animal purchase cost, level gate, feed item + cost, production timer, re-hunger delay, max count, produce + sell price
  resources.data.ts    ← gathering node recovery times, base yield, level gates (iron/gold)
  workshop.data.ts     ← workshop resource recipes
  fishing.data.ts      ← fish table (weight, minLevel, sellPrice), cooldown constants, cast stamina cost
  skills.data.ts       ← XP per action, XP curve constants, bonus thresholds + magnitudes
  stamina.data.ts      ← stamina cost per action, regen config
```

The files under `types/` and `lib/` keep their **types and logic** but **import raw numbers from `lib/data/`** instead of defining them inline.

---

## File-by-File Breakdown

### `lib/data/crops.data.ts`

Extracted from `types/crops.ts` (`CROPS()` and `SEEDS()`).

```ts
export const CROP_DATA = {
  Potato:      { buyPrice: 0.05,  sellPrice: 0.065,  harvestSeconds: 60,           seedPrice: 0.05,  seedLevel: 0  },
  Carrot:      { buyPrice: 0.125, sellPrice: 0.175,  harvestSeconds: 5  * 60,      seedPrice: 0.125, seedLevel: 0  },
  Cabbage:     { buyPrice: 0.25,  sellPrice: 0.375,  harvestSeconds: 10 * 60,      seedPrice: 0.25,  seedLevel: 0  },
  Pumpkin:     { buyPrice: 0.5,   sellPrice: 0.8,    harvestSeconds: 30 * 60,      seedPrice: 0.5,   seedLevel: 0  },
  Beetroot:    { buyPrice: 0.875, sellPrice: 1.575,  harvestSeconds: 60 * 60,      seedPrice: 0.875, seedLevel: 5  },
  Parsnip:     { buyPrice: 1.5,   sellPrice: 3,      harvestSeconds: 2  * 60 * 60, seedPrice: 1.5,   seedLevel: 5  },
  Radish:      { buyPrice: 2.25,  sellPrice: 4.95,   harvestSeconds: 3  * 60 * 60, seedPrice: 2.25,  seedLevel: 5  },
  Cauliflower: { buyPrice: 3.5,   sellPrice: 8.75,   harvestSeconds: 6  * 60 * 60, seedPrice: 3.5,   seedLevel: 10 },
  Wheat:       { buyPrice: 5,     sellPrice: 14,     harvestSeconds: 12 * 60 * 60, seedPrice: 5,     seedLevel: 10 },
  Kale:        { buyPrice: 7.5,   sellPrice: 22.5,   harvestSeconds: 24 * 60 * 60, seedPrice: 7.5,   seedLevel: 10 },
} as const;
```

`types/crops.ts` builds `CROPS()` and `SEEDS()` by mapping over `CROP_DATA` with `new Decimal(...)` wrappers. No logic changes.

---

### `lib/data/food.data.ts`

Extracted from `types/craftables.ts` (`FOODS()`).

```ts
export const FOOD_DATA = {
  "Roasted Potato":       { sellPrice: 0.09,  xp: 25,  ingredients: [{ item: "Potato",      qty: 2 }, { item: "Firewood", qty: 1 }] },
  "Carrot Stew":          { sellPrice: 0.45,  xp: 35,  ingredients: [{ item: "Carrot",      qty: 3 }, { item: "Firewood", qty: 1 }] },
  "Cabbage Roll":         { sellPrice: 0.9,   xp: 40,  ingredients: [{ item: "Cabbage",     qty: 2 }, { item: "Carrot",   qty: 1 }, { item: "Firewood", qty: 1 }] },
  "Pumpkin Soup":         { sellPrice: 1.8,   xp: 50,  ingredients: [{ item: "Pumpkin",     qty: 3 }, { item: "Cabbage",  qty: 1 }, { item: "Firewood", qty: 1 }] },
  "Beetroot Salad":       { sellPrice: 4.7,   xp: 60,  ingredients: [{ item: "Beetroot",    qty: 3 }, { item: "Pumpkin",  qty: 1 }, { item: "Firewood", qty: 1 }] },
  "Parsnip Porridge":     { sellPrice: 8.1,   xp: 70,  ingredients: [{ item: "Parsnip",     qty: 3 }, { item: "Beetroot", qty: 2 }, { item: "Firewood", qty: 1 }] },
  "Radish Skewers":       { sellPrice: 16.2,  xp: 80,  ingredients: [{ item: "Radish",      qty: 4 }, { item: "Parsnip",  qty: 1 }, { item: "Firewood", qty: 1 }] },
  "Cauliflower Sandwich": { sellPrice: 25.2,  xp: 90,  ingredients: [{ item: "Cauliflower", qty: 4 }, { item: "Radish",   qty: 2 }, { item: "Firewood", qty: 1 }] },
  "Wheat Bread":          { sellPrice: 45,    xp: 100, ingredients: [{ item: "Wheat",       qty: 5 }, { item: "Cauliflower", qty: 2 }, { item: "Firewood", qty: 1 }] },
  "Kale Stir-fry":        { sellPrice: 90,    xp: 120, ingredients: [{ item: "Kale",        qty: 5 }, { item: "Wheat",    qty: 3 }, { item: "Firewood", qty: 1 }] },
} as const;
```

`SKILL_XP` cooking entries in `lib/skills.ts` (`craft_roasted_potato`, etc.) are replaced by reading `FOOD_DATA[name].xp`, removing the currently duplicated XP values.

---

### `lib/data/animals.data.ts`

This is the biggest consolidation. Currently, for a single animal, values are spread across four different files:

| Value | Currently lives in |
|---|---|
| Purchase cost + level gate | `types/craftables.ts` (`ANIMALS`) |
| Feed item + cost | `events/feedChicken.ts` (`WHEAT_REQUIRED`), `events/feedCow.ts` (`KALE_REQUIRED`), `events/feedSheep.ts` (`CABBAGE_REQUIRED`) — each hardcoded locally |
| Production timer | `lib/constants.ts` (`CHICKEN_TIME_TO_EGG`, `COW_TIME_TO_MILK`, `SHEEP_TIME_TO_WOOL`) |
| Re-hunger delay | `lib/constants.ts` (`CHICKEN_RE_HUNGER_DELAY`, `COW_RE_HUNGER_DELAY`, `SHEEP_RE_HUNGER_DELAY`) |
| Max count | `lib/constants.ts` (`MAX_CHICKENS`, `MAX_COWS`, `MAX_SHEEP`) |
| Produce name + sell price | `types/resources.ts` (`Egg: 0.08`, `Milk: 1.5`, `Wool: 0.9`) |

After this change, every value for a given animal lives in exactly one row:

```ts
export const ANIMAL_DATA = {
  Chicken: {
    purchaseCost:     5,
    levelRequired:    3,
    feedItem:         "Wheat" as const,
    feedCost:         1,
    productionMs:     60 * 1000,           // 1 minute
    reHungerDelayMs:  4 * 60 * 60 * 1000,  // 4 hours
    maxCount:         10,
    produce:          "Egg" as const,
    produceSellPrice: 0.08,
  },
  Cow: {
    purchaseCost:     50,
    levelRequired:    6,
    feedItem:         "Kale" as const,
    feedCost:         1,
    productionMs:     90 * 1000,           // 1.5 minutes
    reHungerDelayMs:  6 * 60 * 60 * 1000,  // 6 hours
    maxCount:         5,
    produce:          "Milk" as const,
    produceSellPrice: 1.5,
  },
  Sheep: {
    purchaseCost:     30,
    levelRequired:    8,
    feedItem:         "Cabbage" as const,
    feedCost:         1,
    productionMs:     120 * 1000,          // 2 minutes
    reHungerDelayMs:  6 * 60 * 60 * 1000,  // 6 hours
    maxCount:         5,
    produce:          "Wool" as const,
    produceSellPrice: 0.9,
  },
} as const;
```

Files that import from this instead of their own locals: `feedChicken.ts`, `feedCow.ts`, `feedSheep.ts`, `collectEgg.ts`, `collectMilk.ts`, `collectWool.ts`, `lib/constants.ts` (re-exports thin aliases for backward compat), `types/craftables.ts` (`ANIMALS`), `types/resources.ts` (Egg/Milk/Wool sell prices), `FarmScene.js` (`PRODUCE_MS`, `RE_HUNGER`, `PRODUCE_LABEL`, `PRODUCE_ICON` — already derived locally in Phaser, can optionally read from here via `window.__animalData`).

---

### `lib/data/resources.data.ts`

Extracted from `events/chop.ts`, `events/stoneMine.ts`, `events/ironMine.ts`, `events/goldMine.ts`. Currently every resource event has its own local recovery constant and the level gates for iron/gold are hardcoded inside their respective event files.

```ts
export const RESOURCE_NODE_DATA = {
  Wood:  { recoverySeconds: 2  * 60 * 60, baseYield: 3, levelRequired: 0  },
  Stone: { recoverySeconds: 4  * 60 * 60, baseYield: 2, levelRequired: 0  },
  Iron:  { recoverySeconds: 8  * 60 * 60, baseYield: 2, levelRequired: 10 },
  Gold:  { recoverySeconds: 12 * 60 * 60, baseYield: 2, levelRequired: 25 },
} as const;
```

Each event file reads its own row: `chop.ts` reads `RESOURCE_NODE_DATA.Wood.recoverySeconds`, replacing `TREE_RECOVERY_SECONDS = 2 * 60 * 60`. `canChop()` and `canMine()` remain in their respective files — only the constants move.

---

### `lib/data/workshop.data.ts`

Extracted from `types/craftables.ts` (`WORKSHOP_RESOURCES()`).

```ts
export const WORKSHOP_DATA = {
  Firewood:   { ingredients: [{ item: "Wood",  qty: 2 }] },
  Brick:      { ingredients: [{ item: "Stone", qty: 2 }, { item: "Firewood", qty: 1 }] },
  "Iron Bar": { ingredients: [{ item: "Iron",  qty: 2 }, { item: "Firewood", qty: 1 }] },
  "Gold Bar": { ingredients: [{ item: "Gold",  qty: 2 }, { item: "Firewood", qty: 1 }] },
} as const;
```

---

### `lib/data/fishing.data.ts`

This is a **new file** not in the original proposal. Fishing was added after the proposal was written.

Currently `lib/fishing.ts` contains both the `FISH_TABLE` data and the `rollCatch()` logic function inline. The cooldown constants live in `lib/constants.ts`. The stamina cost lives in `lib/stamina.ts`. All three of these are tuning values that belong in a data file.

```ts
// Catch probability table — weight is the only frequency control
export const FISH_TABLE_DATA = [
  { name: "Anchovy",     weight: 50,  minLevel: 0,  sellPrice: 0.30  },
  { name: "Sardine",     weight: 45,  minLevel: 0,  sellPrice: 0.35  },
  { name: "Tilapia",     weight: 40,  minLevel: 0,  sellPrice: 0.40  },
  { name: "Herring",     weight: 35,  minLevel: 0,  sellPrice: 0.45  },
  { name: "Trout",       weight: 28,  minLevel: 10, sellPrice: 0.60  },
  { name: "Sea Bass",    weight: 22,  minLevel: 10, sellPrice: 0.80  },
  { name: "Mackerel",    weight: 18,  minLevel: 20, sellPrice: 1.00  },
  { name: "Salmon",      weight: 15,  minLevel: 20, sellPrice: 1.20  },
  { name: "Red Snapper", weight: 10,  minLevel: 30, sellPrice: 1.80  },
  { name: "Barracuda",   weight: 7,   minLevel: 40, sellPrice: 2.50  },
  { name: "Tuna",        weight: 5,   minLevel: 50, sellPrice: 3.50  },
  { name: "Swordfish",   weight: 3,   minLevel: 60, sellPrice: 5.00  },
  { name: "Blue Marlin", weight: 1.5, minLevel: 70, sellPrice: 8.00  },
  { name: "Oarfish",     weight: 0.5, minLevel: 90, sellPrice: 15.00 },
] as const;

// Cooldown config
export const FISHING_CONFIG = {
  baseCooldownMs: 30_000,   // 30 s at lv0 fishing skill
  minCooldownMs:  15_000,   // 15 s floor (reached at max fishSpeed bonus)
  staminaCost:    3,        // deducted per cast
  castAnimMs:     3_800,    // total casting animation duration (15+13+10 frames @ 10 fps)
} as const;
```

`lib/fishing.ts` keeps `rollCatch()` (pure logic) but imports `FISH_TABLE_DATA` from here instead of defining inline.  
`lib/constants.ts` `FISHING_BASE_COOLDOWN_MS` / `FISHING_MIN_COOLDOWN_MS` → replaced by `FISHING_CONFIG.baseCooldownMs` / `FISHING_CONFIG.minCooldownMs`.  
`lib/stamina.ts` `STAMINA_COSTS.fish_cast = 3` → replaced by `FISHING_CONFIG.staminaCost`.  
`FarmScene.js` `const castDurationMs = (15 + 13 + 10) * (1000 / 10)` inline comment → reads `FISHING_CONFIG.castAnimMs` (requires exposing via `window.__fishingConfig` or a shared constants bundle).

---

### `lib/data/skills.data.ts`

Extracted from `lib/skills.ts` (`SKILL_XP`, `BASE_XP`, `MAX_SKILL_LEVEL`) and `lib/skills.ts` `computeBonus()` if-chain.

```ts
// XP curve constants
export const XP_CURVE = {
  BASE_XP:    500,
  LINEAR:     350,
  QUADRATIC:  25,
  MAX_LEVEL:  100,
} as const;

// XP rewarded per action — single source of truth
export const ACTION_XP = {
  // Forestry
  chop_tree:   25,
  // Mining
  mine_stone:  60,
  mine_iron:   100,
  mine_gold:   150,
  // Farming
  harvest_potato:       10,
  harvest_carrot:       15,
  harvest_cabbage:      20,
  harvest_pumpkin:      25,
  harvest_beetroot:     35,
  harvest_parsnip:      45,
  harvest_radish:       55,
  harvest_cauliflower:  70,
  harvest_wheat:        90,
  harvest_kale:         120,
  // Cooking — these currently duplicate the xp field in FOOD_DATA; after this
  // change, FOOD_DATA.xp IS the authoritative value and SKILL_XP reads from it
  craft_roasted_potato:       25,
  craft_carrot_stew:          35,
  craft_cabbage_roll:         40,
  craft_pumpkin_soup:         50,
  craft_beetroot_salad:       60,
  craft_parsnip_porridge:     70,
  craft_radish_skewers:       80,
  craft_cauliflower_sandwich: 90,
  craft_wheat_bread:          100,
  craft_kale_stirfry:         120,
  // Husbandry
  collect_egg:   30,
  collect_milk:  50,
  collect_wool:  50,
  feed_animal:   5,
  // Fishing
  catch_fish:    35,
} as const;

// Bonus increments per skill per level threshold
// Each entry: { level, field, delta } — computeBonus() loops over this
// instead of the current 100+ hardcoded if-statements
export const SKILL_BONUS_TABLE = {
  forestry: [
    { level: 10,  field: "woodYield",    delta: 0.10 },
    { level: 20,  field: "woodYield",    delta: 0.10 },
    { level: 30,  field: "woodRecovery", delta: 0.10 },
    { level: 40,  field: "woodYield",    delta: 0.10 },
    { level: 50,  field: "woodRecovery", delta: 0.10 },
    { level: 60,  field: "woodYield",    delta: 0.10 },
    { level: 70,  field: "woodRecovery", delta: 0.10 },
    { level: 80,  field: "woodYield",    delta: 0.10 },
    { level: 90,  field: "woodRecovery", delta: 0.10 },
    { level: 100, field: "woodYield",    delta: 0.25 },
    { level: 100, field: "woodDouble",   delta: 0.15 },
  ],
  mining: [
    { level: 10,  field: "oreYield",    delta: 0.10 },
    { level: 20,  field: "oreYield",    delta: 0.10 },
    { level: 30,  field: "oreRecovery", delta: 0.10 },
    { level: 40,  field: "oreYield",    delta: 0.10 },
    { level: 50,  field: "oreDouble",   delta: 0.10 },
    { level: 60,  field: "oreRecovery", delta: 0.10 },
    { level: 70,  field: "oreYield",    delta: 0.20 },
    { level: 80,  field: "oreRecovery", delta: 0.10 },
    { level: 90,  field: "oreDouble",   delta: 0.10 },
    { level: 100, field: "oreYield",    delta: 0.25 },
    { level: 100, field: "oreRecovery", delta: 0.10 },
  ],
  farming: [
    { level: 10,  field: "cropSpeed",  delta: 0.05 },
    { level: 20,  field: "cropSpeed",  delta: 0.05 },
    { level: 30,  field: "cropYield",  delta: 0.10 },
    { level: 40,  field: "cropSpeed",  delta: 0.05 },
    { level: 50,  field: "cropYield",  delta: 0.10 },
    { level: 60,  field: "cropSpeed",  delta: 0.05 },
    { level: 70,  field: "cropDouble", delta: 0.10 },
    { level: 80,  field: "cropYield",  delta: 0.15 },
    { level: 90,  field: "cropSpeed",  delta: 0.05 },
    { level: 100, field: "cropYield",  delta: 0.15 },
    { level: 100, field: "cropDouble", delta: 0.10 },
  ],
  husbandry: [
    { level: 10,  field: "produceSpeed",  delta: 0.10 },
    { level: 20,  field: "produceSpeed",  delta: 0.10 },
    { level: 30,  field: "produceYield",  delta: 0.10 },
    { level: 40,  field: "produceSpeed",  delta: 0.10 },
    { level: 50,  field: "produceDouble", delta: 0.10 },
    { level: 60,  field: "produceYield",  delta: 0.10 },
    { level: 70,  field: "produceSpeed",  delta: 0.10 },
    { level: 80,  field: "produceYield",  delta: 0.10 },
    { level: 90,  field: "produceDouble", delta: 0.10 },
    { level: 100, field: "produceSpeed",  delta: 0.10 },
    { level: 100, field: "produceYield",  delta: 0.20 },
  ],
  fishing: [
    { level: 10,  field: "fishYield",  delta: 0.10 },
    { level: 20,  field: "fishYield",  delta: 0.10 },
    { level: 30,  field: "fishSpeed",  delta: 0.10 },
    { level: 40,  field: "fishYield",  delta: 0.10 },
    { level: 50,  field: "fishDouble", delta: 0.10 },
    { level: 60,  field: "fishSpeed",  delta: 0.10 },
    { level: 70,  field: "fishYield",  delta: 0.20 },
    { level: 80,  field: "fishSpeed",  delta: 0.10 },
    { level: 90,  field: "fishDouble", delta: 0.10 },
    { level: 100, field: "fishYield",  delta: 0.25 },
    { level: 100, field: "fishDouble", delta: 0.15 },
  ],
  cooking: [
    { level: 10,  field: "staminaYield",  delta: 0.10 },
    { level: 20,  field: "staminaYield",  delta: 0.10 },
    { level: 30,  field: "cookingDouble", delta: 0.05 },
    { level: 40,  field: "staminaYield",  delta: 0.10 },
    { level: 50,  field: "cookingSpeed",  delta: 0.10 },
    { level: 60,  field: "cookingDouble", delta: 0.05 },
    { level: 70,  field: "staminaYield",  delta: 0.10 },
    { level: 80,  field: "cookingSpeed",  delta: 0.10 },
    { level: 90,  field: "cookingDouble", delta: 0.10 },
    { level: 100, field: "staminaYield",  delta: 0.10 },
    { level: 100, field: "cookingSpeed",  delta: 0.10 },
  ],
  combat: [
    { level: 10,  field: "damageBonus",  delta: 0.05 },
    { level: 20,  field: "defenseBonus", delta: 0.05 },
    { level: 30,  field: "dodgeBonus",   delta: 0.05 },
    { level: 40,  field: "damageBonus",  delta: 0.05 },
    { level: 50,  field: "critChance",   delta: 0.05 },
    { level: 60,  field: "defenseBonus", delta: 0.05 },
    { level: 70,  field: "damageBonus",  delta: 0.05 },
    { level: 80,  field: "dodgeBonus",   delta: 0.05 },
    { level: 90,  field: "critChance",   delta: 0.05 },
    { level: 100, field: "damageBonus",  delta: 0.05 },
    { level: 100, field: "critChance",   delta: 0.05 },
  ],
} as const;
```

`computeBonus()` in `lib/skills.ts` becomes a loop over `SKILL_BONUS_TABLE[skill]` that replaces the current 100+ hardcoded `if` statements. The XP curve formula reads from `XP_CURVE` instead of inlined magic numbers.

---

### `lib/data/stamina.data.ts`

Extracted from `lib/stamina.ts` (`STAMINA_CONSTANTS`, `STAMINA_COSTS`). After `fishing.data.ts` is introduced, `fish_cast: 3` moves there and `stamina.data.ts` only holds the non-fishing costs.

```ts
export const STAMINA_CONFIG = {
  maxStamina:           100,
  regenIntervalMs:      60 * 60 * 1000,  // 1 hour
  regenPercent:         0.05,            // 5% per tick
  maxOfflineIntervals:  8,               // cap at 8 hours offline
} as const;

export const STAMINA_COSTS = {
  harvest_crop:     1,
  harvest_resource: 1,
  chop_tree:        1,
  mine_stone:       1,
  mine_iron:        1,
  mine_gold:        1,
  plant:            0,
  // fish_cast is defined in fishing.data.ts — merged here at runtime via spread
} as const;
```

`lib/stamina.ts` keeps all its helper functions (`hasEnoughStamina`, `deductStamina`, `calculateStaminaRegen`, etc.) but imports `STAMINA_CONFIG` and `STAMINA_COSTS` from this file.

---

## Complete Value Migration Table

| Value | Current location | Proposed location |
|---|---|---|
| Crop sell/buy price | `types/crops.ts` inline | `lib/data/crops.data.ts` |
| Crop harvest timer | `types/crops.ts` inline | `lib/data/crops.data.ts` |
| Seed price + level gate | `types/crops.ts` inline | `lib/data/crops.data.ts` |
| Food ingredients | `types/craftables.ts` `FOODS()` inline | `lib/data/food.data.ts` |
| Food sell price | `types/craftables.ts` `FOODS()` inline | `lib/data/food.data.ts` |
| Food craft XP | `lib/skills.ts` `SKILL_XP` (duplicated) | `lib/data/food.data.ts` (`xp` field, `SKILL_XP` reads from it) |
| Animal purchase cost | `types/craftables.ts` `ANIMALS` inline | `lib/data/animals.data.ts` |
| Animal level gate | `types/craftables.ts` `ANIMALS` inline | `lib/data/animals.data.ts` |
| Animal feed item | `events/feedChicken.ts` `WHEAT_REQUIRED` | `lib/data/animals.data.ts` |
| Animal feed item | `events/feedCow.ts` `KALE_REQUIRED` | `lib/data/animals.data.ts` |
| Animal feed item | `events/feedSheep.ts` `CABBAGE_REQUIRED` | `lib/data/animals.data.ts` |
| Animal production timer | `lib/constants.ts` `CHICKEN_TIME_TO_EGG` etc. | `lib/data/animals.data.ts` |
| Animal re-hunger delay | `lib/constants.ts` `CHICKEN_RE_HUNGER_DELAY` etc. | `lib/data/animals.data.ts` |
| Max animal count | `lib/constants.ts` `MAX_CHICKENS` etc. | `lib/data/animals.data.ts` |
| Produce sell price (Egg/Milk/Wool) | `types/resources.ts` inline | `lib/data/animals.data.ts` |
| Tree recovery time | `events/chop.ts` `TREE_RECOVERY_SECONDS` | `lib/data/resources.data.ts` |
| Stone recovery time | `events/stoneMine.ts` `STONE_RECOVERY_TIME` | `lib/data/resources.data.ts` |
| Iron recovery time | `events/ironMine.ts` inline | `lib/data/resources.data.ts` |
| Gold recovery time | `events/goldMine.ts` inline | `lib/data/resources.data.ts` |
| Iron/Gold level gates | `events/ironMine.ts` / `goldMine.ts` inline | `lib/data/resources.data.ts` |
| Workshop ingredients | `types/craftables.ts` `WORKSHOP_RESOURCES()` inline | `lib/data/workshop.data.ts` |
| Fish table (weight/minLevel/sellPrice) | `lib/fishing.ts` `FISH_TABLE` inline | `lib/data/fishing.data.ts` |
| Fish sell prices | `types/resources.ts` `RESOURCES` inline (duplicated from FISH_TABLE) | `lib/data/fishing.data.ts` (`sellPrice` field; `resources.ts` reads from it) |
| Fishing cooldown constants | `lib/constants.ts` `FISHING_BASE/MIN_COOLDOWN_MS` | `lib/data/fishing.data.ts` |
| Fishing stamina cost | `lib/stamina.ts` `STAMINA_COSTS.fish_cast` | `lib/data/fishing.data.ts` |
| Casting animation duration | `FarmScene.js` inline comment `(15+13+10) * 100` | `lib/data/fishing.data.ts` `castAnimMs` |
| XP per action | `lib/skills.ts` `SKILL_XP` | `lib/data/skills.data.ts` `ACTION_XP` |
| XP curve constants | `lib/skills.ts` `BASE_XP`, `MAX_SKILL_LEVEL` | `lib/data/skills.data.ts` `XP_CURVE` |
| Skill bonus thresholds + magnitudes | `lib/skills.ts` `computeBonus()` if-chain | `lib/data/skills.data.ts` `SKILL_BONUS_TABLE` |
| Stamina regen config | `lib/stamina.ts` `STAMINA_CONSTANTS` | `lib/data/stamina.data.ts` `STAMINA_CONFIG` |
| Stamina costs (non-fishing) | `lib/stamina.ts` `STAMINA_COSTS` | `lib/data/stamina.data.ts` `STAMINA_COSTS` |

---

## What Does NOT Move

- **Type definitions** (`CropName`, `Food`, `Animal`, `FishName`, `WorkshopResource`, `SkillBonus`, `FishingState`, etc.) — remain in `types/`
- **Helper functions** (`CROPS()`, `SEEDS()`, `FOODS()`, `rollCatch()`, `computeBonus()`, `getOreYield()`, `canChop()`, `canMine()`, etc.) — remain in `types/` and `lib/`
- **`INITIAL_FARM` / `EMPTY`** — remain in `lib/constants.ts`; they describe the starting world layout, not tunable balancing values
- **`ACHIEVEMENTS`** — remains in `types/achievements.ts`
- **`FISH_TABLE` export** — `lib/fishing.ts` re-exports it for external consumers (PhaserCanvas.tsx reads it to show fish names in the caught modal); it just sources its data from `fishing.data.ts`
- **`FishingCooldown.tsx`, `FishCaughtModal.tsx`, `AnimalAlerts.tsx`** — UI components, nothing to move
- **`FarmScene.js` local Phaser constants** (`PRODUCE_MS`, `RE_HUNGER`, `PRODUCE_LABEL`, `PRODUCE_ICON`, `STATE_KEY`) — these are Phaser-internal derived maps built at scene-init time; they can optionally be computed from `ANIMAL_DATA` but are not a priority

---

## Implementation Order

Each file is independent and can be committed separately.

1. `lib/data/stamina.data.ts` — smallest change, zero type impact
2. `lib/data/resources.data.ts` — isolates recovery times from four event files
3. `lib/data/crops.data.ts` — replaces inline `Decimal` values in `types/crops.ts`
4. `lib/data/workshop.data.ts` — extracts workshop recipes from `types/craftables.ts`
5. `lib/data/fishing.data.ts` — **new** — consolidates fish table, cooldown config, stamina cost, anim duration
6. `lib/data/animals.data.ts` — biggest consolidation; touches six event files, `lib/constants.ts`, `types/craftables.ts`, `types/resources.ts`
7. `lib/data/food.data.ts` — replaces food recipes and deduplicates cooking XP from `SKILL_XP`
8. `lib/data/skills.data.ts` — last step; refactors `computeBonus()` if-chain into a data-driven loop and unifies the XP table
