# Fishing System Plan

**Status:** All phases complete  
**Last updated:** 2026-07-01

---

## 1. Overview

The Phaser scene already has the full visual side wired: the shoreline fishing
zone is computed at runtime from the tilemap, a red ADD-blend overlay marks
fishable tiles, the player must stand adjacent to the strip to cast, and the
three-phase animation sequence (`player_casting` → `player_reeling` →
`player_caught`) plays when the player clicks a shoreline tile. After the
caught animation the scene fires a `phaser-fishing-open` window event — but
nothing listens to it yet.

This plan closes that gap: React listens to `phaser-fishing-open`, resolves
which fish the player caught using a **weight-based probability draw** (no
tiers, no rarity labels), deducts stamina, adds the fish to inventory, awards
fishing XP, and shows a result modal. Fish are plain resources, identical in
structure to Wood, Stone, Egg, or Milk — just a name, description, and sell
price. Casting costs **3 stamina** per cast. There is no daily cast cap.

---

## 2. What Already Exists (do not re-implement)

| Layer | What is there |
|---|---|
| **FarmScene.js** | `_buildFishingZone()` computes the 3-tile shoreline strip from the live tilemap, paints the red ADD-blend overlay, stores tiles on `_fishingNodes['fishing_shoreline']` |
| **FarmScene.js** | Pointer handler checks `hitFishing`, validates player adjacency, calls `_startFishingSequence(spot)` |
| **FarmScene.js** | `_startFishingSequence()` chains `player_casting → player_reeling → player_caught` then fires `window.dispatchEvent(new CustomEvent('phaser-fishing-open', ...))` |
| **AnimationConfig.js** | `FISHING.CASTING` (15 f), `FISHING.REELING` (13 f), `FISHING.CAUGHT` (10 f) all registered |
| **skills.ts** | `computeBonus()` already computes `fishYield`, `fishSpeed`, `fishDouble` from the fishing skill level (spec §7.6) |
| **SkillBonus** | `fishYield`, `fishSpeed`, `fishDouble` fields exist on `SkillBonus` and `INITIAL_BONUS` |
| **stamina.ts** | `hasEnoughStamina()`, `deductStamina()`, `getStaminaCost()` helpers exist; `STAMINA_COSTS` object is the single source of truth for action costs |
| **public/assets/tools/fishing_rod.png** | Fishing rod icon asset exists |
| **public/assets/fish/fish.png** | Shared fish sprite — used for all 14 fish in the result modal |

---

## 3. Decisions

| Question | Decision |
|---|---|
| Cast cooldown | 30 s at lv0, scales down to 15 s minimum as `fishSpeed` increases |
| Fish sprites | Reuse single `public/assets/fish/fish.png` for all fish in the modal |
| Bait system | Out of scope — no bait field, no weight modifier |
| Daily cast limit | None — stamina cost (3 per cast) is the only rate limiter |
| Selling fish | Fish are added to `ResourceName`; existing Bazaar sell event handles them automatically |

---

## 4. Fish Types

Fish are added directly to `ResourceName` in `resources.ts`. Each fish has a
`description`, a `sellPrice`, and a `weight` used by the probability draw.
**Weight is the only thing that controls frequency** — no tier multiplier, no
rarity classification. A fish with weight 50 is ~100× more common than one
with weight 0.5 when both are eligible.

### 4.1 Fish table

| Fish | Weight | Sell price (coins) | Min fishing level |
|---|---|---|---|
| Anchovy | 50 | 0.30 | 0 |
| Sardine | 45 | 0.35 | 0 |
| Tilapia | 40 | 0.40 | 0 |
| Herring | 35 | 0.45 | 0 |
| Trout | 28 | 0.60 | 10 |
| Sea Bass | 22 | 0.80 | 10 |
| Mackerel | 18 | 1.00 | 20 |
| Salmon | 15 | 1.20 | 20 |
| Red Snapper | 10 | 1.80 | 30 |
| Barracuda | 7 | 2.50 | 40 |
| Tuna | 5 | 3.50 | 50 |
| Swordfish | 3 | 5.00 | 60 |
| Blue Marlin | 1.5 | 8.00 | 70 |
| Oarfish | 0.5 | 15.00 | 90 |

### 4.2 How skill shifts the pool naturally

As the player levels up, higher-`minLevel` fish join the eligible pool. Because
those fish have lower weights, they are rare — but reachable. No extra
multiplier is needed; the weights handle everything.

---

## 5. Constants

New constants to add to `features/game/lib/constants.ts`:

```ts
// Fishing
export const FISHING_BASE_COOLDOWN_MS  = 30_000; // 30 s at lv0
export const FISHING_MIN_COOLDOWN_MS   = 15_000; // 15 s floor (reached via fishSpeed)
```

Effective cooldown formula (used in the event handler):

```ts
const effectiveCooldown = Math.max(
  FISHING_MIN_COOLDOWN_MS,
  FISHING_BASE_COOLDOWN_MS * (1 - (state.bonus.fishSpeed ?? 0))
);
```

At `fishSpeed = 0` (lv0): 30 000 ms.  
At `fishSpeed = 0.50` (lv100): 15 000 ms — hits the floor exactly.

---

## 6. Stamina cost

Add `fish_cast: 3` to `STAMINA_COSTS` in `stamina.ts`:

```ts
export const STAMINA_COSTS = {
  harvest_crop:     1,
  harvest_resource: 1,
  chop_tree:        1,
  mine_stone:       1,
  mine_iron:        1,
  mine_gold:        1,
  plant:            0,
  fish_cast:        3,  // ← new
} as const;
```

The handler calls `hasEnoughStamina(state.stamina.current, "fish_cast")` and
`deductStamina(state.stamina.current, "fish_cast")` — identical to how
`chop.ts` handles stamina.

---

## 7. Catch probability — `rollCatch()`

New file: `features/game/lib/fishing.ts`

```ts
export type FishEntry = {
  name: FishName;
  weight: number;   // unnormalised probability — higher = more common
  minLevel: number; // fishing skill level required to unlock
  sellPrice: number;
};

export const FISH_TABLE: FishEntry[] = [ /* table from §4.1 */ ];

/**
 * Pure weighted random draw.
 * Filters to fish whose minLevel <= fishingLevel,
 * then picks one proportionally to weight. No tier bonus, no rarity modifier.
 */
export function rollCatch(fishingLevel: number): FishName {
  const eligible = FISH_TABLE.filter(f => fishingLevel >= f.minLevel);
  const totalWeight = eligible.reduce((s, f) => s + f.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of eligible) {
    roll -= entry.weight;
    if (roll <= 0) return entry.name;
  }
  return eligible[eligible.length - 1].name; // numeric fallback
}
```

---

## 8. Game state additions

### 8.1 `FishingState` (new type in `game.ts`)

```ts
type FishingState = {
  lastCastAt: number;  // epoch ms — cooldown guard
  totalCasts:  number; // for achievements
  totalCaught: number; // for achievements
};
```

Add `fishing: FishingState` to `GameState`.  
Add to both `INITIAL_FARM` and `EMPTY` in `constants.ts`:

```ts
fishing: { lastCastAt: 0, totalCasts: 0, totalCaught: 0 },
```

### 8.2 `FishName` type

New file: `features/game/types/fish.ts`

```ts
export type FishName =
  | "Anchovy" | "Sardine" | "Tilapia" | "Herring"
  | "Trout" | "Sea Bass" | "Mackerel" | "Salmon"
  | "Red Snapper" | "Barracuda" | "Tuna" | "Swordfish"
  | "Blue Marlin" | "Oarfish";
```

Add all 14 names to `ResourceName` in `resources.ts` and add their
`description` and `sellPrice` entries to the `RESOURCES` map. No extra fields.

---

## 9. Game event — `fish.caught`

New file: `features/game/events/catchFish.ts`

Follows the exact same structure as `chop.ts`:

```ts
import Decimal from "decimal.js-light";
import { GameState } from "../types/game";
import { getSkillXP, getSkillLevel, computeBonus } from "../lib/skills";
import { rollCatch } from "../lib/fishing";
import { hasEnoughStamina, deductStamina } from "../lib/stamina";
import { trackActivity } from "../lib/activity";
import { INITIAL_BONUS } from "../types/skills";
import { FISHING_BASE_COOLDOWN_MS, FISHING_MIN_COOLDOWN_MS } from "../lib/constants";

export type CatchFishAction = {
  type: "fish.caught";
  createdAt: number;
};

export function catchFish({ state, action }: { state: GameState; action: CatchFishAction }): GameState {
  const { createdAt } = action;

  // 1. Stamina check
  if (!hasEnoughStamina(state.stamina.current, "fish_cast")) {
    throw new Error("Not enough stamina to fish");
  }

  // 2. Cooldown check
  const effectiveCooldown = Math.max(
    FISHING_MIN_COOLDOWN_MS,
    FISHING_BASE_COOLDOWN_MS * (1 - (state.bonus.fishSpeed ?? 0))
  );
  if (createdAt - state.fishing.lastCastAt < effectiveCooldown) {
    throw new Error("Fishing is on cooldown");
  }

  // 3. Roll
  const fishingLevel = state.skills.fishing ?? 0;
  const caught = rollCatch(fishingLevel);

  // 4. Yield — apply fishYield bonus, roll fishDouble
  const bonus = state.bonus ?? { ...INITIAL_BONUS };
  let amount = Math.max(1, Math.floor(1 * (1 + (bonus.fishYield ?? 0))));
  if (Math.random() < (bonus.fishDouble ?? 0)) amount *= 2;

  // 5. Award XP (same level-up pattern as chop.ts)
  const catchXP       = getSkillXP("catch_fish");
  const newFishingXP  = fishingLevel + catchXP;
  const oldLevel      = getSkillLevel(fishingLevel);
  const newLevel      = getSkillLevel(newFishingXP);
  const newBonus      =
    newLevel > oldLevel && newLevel % 10 === 0
      ? computeBonus({ ...state.skills, fishing: newFishingXP })
      : bonus;

  // 6. Update inventory
  const current = new Decimal(state.inventory[caught] || 0);
  const activity = trackActivity(state.activity, "Fish Caught", 1);

  return {
    ...state,
    inventory: {
      ...state.inventory,
      [caught]: current.add(amount),
    },
    skills:  { ...state.skills, fishing: newFishingXP },
    bonus:   newBonus,
    stamina: {
      ...state.stamina,
      current: deductStamina(state.stamina.current, "fish_cast"),
    },
    fishing: {
      lastCastAt:  createdAt,
      totalCasts:  (state.fishing.totalCasts  ?? 0) + 1,
      totalCaught: (state.fishing.totalCaught ?? 0) + 1,
    },
    activity,
  };
}
```

Register in `features/game/events/index.ts`:

```ts
"fish.caught": catchFish,
```

---

## 10. XP

Add one entry to `SKILL_XP` in `skills.ts`:

| Action key | XP |
|---|---|
| `catch_fish` | 35 |

One flat value per catch. Rarer fish (lower weight) being caught less often
naturally means players earn XP more slowly from them — no per-fish XP split
needed.

---

## 11. React wiring — `Game.tsx`

Add a `useEffect` that listens for `phaser-fishing-open` (mirrors the existing
`phaser-plot-plant` and `phaser-plot-harvest` handlers):

```ts
const [fishResult, setFishResult] =
  useState<{ fish: FishName; amount: number } | null>(null);

useEffect(() => {
  const handler = () => {
    try {
      const result = dispatch({ type: "fish.caught", createdAt: Date.now() });
      // dispatch returns the new state; read caught + amount from the event
      // (catchFish returns GameState — expose caught/amount via a return wrapper or
      //  read from state diff post-dispatch)
      setFishResult({ fish: result.lastCaughtFish, amount: result.lastCaughtAmount });
    } catch {
      // stamina or cooldown guard — silently ignore; animation already played
    }
  };
  window.addEventListener("phaser-fishing-open", handler);
  return () => window.removeEventListener("phaser-fishing-open", handler);
}, []);
```

> **Note:** `catchFish` should store `lastCaughtFish: FishName` and
> `lastCaughtAmount: number` on `FishingState` so Game.tsx can read the
> result without a separate channel. Add those two fields to `FishingState`
> in §8.1.

---

## 12. Result modal — `FishCaughtModal.tsx`

New file: `features/fishing/components/FishCaughtModal.tsx`

Displayed when `fishResult` state is non-null in `Game.tsx`.

**Contents:**
- Fish sprite: `public/assets/fish/fish.png` (single shared sprite for all fish)
- Fish name and quantity (e.g. "2× Salmon")
- Fishing XP gained (always `catch_fish` XP × amount)
- "Nice catch!" close button

Auto-dismisses after 4 seconds or on click/button press.

---

## 13. Cooldown HUD — `FishingCooldown.tsx`

New file: `features/fishing/components/FishingCooldown.tsx`

- Shows the fishing rod icon (`public/assets/tools/fishing_rod.png`) with a
  countdown timer when the cooldown has not yet expired.
- Reads `state.fishing.lastCastAt` and `state.bonus.fishSpeed` from the game
  store to compute remaining seconds.
- Ticks every second (`setInterval`) — same pattern as `AnimalAlerts.tsx`.
- Hides when the player is ready to cast again.

Rendered in `Hud.tsx` alongside `<AnimalAlerts />`.

---

## 14. Phaser guard (minimal)

`FarmScene.js` — `_startFishingSequence()`: read `window.__gameStore?.getState?.()` at
the top of the function. If the cooldown has not expired **or** stamina < 3,
skip the sequence and fire `phaser-fishing-cooldown` instead with
`{ remainingMs }`. `FishingCooldown.tsx` listens for this event to show a
brief "Not ready yet" / "Not enough stamina" toast. This is one small guard
block at the top of an existing function — no new Phaser files are needed.

---

## 15. File Change Summary

| File | Phase | Change |
|---|---|---|
| `features/game/types/fish.ts` | 1 | New — `FishName` union (14 names) | Done |
| `features/game/types/resources.ts` | 1 | Add all 14 fish to `ResourceName` + `RESOURCES` map | Done |
| `features/game/types/game.ts` | 1 | Add `FishingState` type + `fishing` field to `GameState` | Done |
| `features/game/lib/fishing.ts` | 1 | New — `FISH_TABLE`, `rollCatch()` | Done |
| `features/game/lib/constants.ts` | 1 | Add `FISHING_BASE_COOLDOWN_MS`, `FISHING_MIN_COOLDOWN_MS`; add `fishing` to `INITIAL_FARM` + `EMPTY` | Done |
| `features/game/lib/stamina.ts` | 1 | Add `fish_cast: 3` to `STAMINA_COSTS` | Done |
| `features/game/lib/skills.ts` | 1 | Add `catch_fish: 35` to `SKILL_XP` | Done |
| `features/game/events/catchFish.ts` | 1 | New — `fish.caught` event handler | Done |
| `features/game/events/index.ts` | 1 | Register `"fish.caught": catchFish` | Done |
| `features/game/Game.tsx` | 2 | Add `phaser-fishing-open` listener, `fishResult` state | Done |
| `features/fishing/components/FishCaughtModal.tsx` | 2 | New — result modal (uses shared fish.png) | Done |
| `public/assets/fish/fish.png` | — | Already saved — shared sprite for all fish in result modal |
| `features/fishing/components/FishingCooldown.tsx` | 3 | New — cooldown HUD component | Done |
| `features/hud/Hud.tsx` | 3 | Render `<FishingCooldown />` | Done |
| `features/phaser/scenes/FarmScene.js` | 3 | Add cooldown + stamina guard at top of `_startFishingSequence()` | Done |

---

## 16. Implementation Phases

### Phase 1 — Data and event layer
`fish.ts` types, `resources.ts` additions, `game.ts` FishingState, `fishing.ts`
table + rollCatch, `constants.ts` cooldown constants + initial state,
`stamina.ts` cost, `skills.ts` XP, `catchFish.ts` event, `index.ts`
registration.

### Phase 2 — React wiring + result modal
`Game.tsx` listener, `FishCaughtModal.tsx` component.

### Phase 3 — Cooldown UX
`FarmScene.js` guard, `FishingCooldown.tsx` HUD component, `Hud.tsx`
renders it.
