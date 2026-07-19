# Animal Hunger System — Implementation Plan

**Status:** All phases complete (1 through 4)  
**Scope:** Chicken, Cow, Sheep  
**Goal:** Animals start hungry on a new game, become hungry again after produce is collected, and re-hunger after a configurable cooldown period even when no produce is collected (they "forget" their food). The player must feed them to restart the produce cycle.

---

## Current State (What Already Exists)

The backbone is already in place and working correctly:

| Layer | File | State |
|---|---|---|
| Event — feed | `feedChicken.ts`, `feedCow.ts`, `feedSheep.ts` | Done — deducts crop, sets `fedAt` |
| Event — collect | `collectEgg.ts`, `collectMilk.ts`, `collectWool.ts` | Done — adds produce, clears `fedAt` |
| State hook | `useChickenState.ts`, `useCowState.ts`, `useSheepState.ts` | Done — derives `hungry / happy / eggReady` from `fedAt` |
| UI | `Chicken.tsx`, `Cow.tsx`, `Sheep.tsx` | Done — click to feed, click to collect, expression icons, progress bar, tooltip |
| Timer constants | `constants.ts` | Done — `CHICKEN_TIME_TO_EGG`, `COW_TIME_TO_MILK`, `SHEEP_TIME_TO_WOOL` |

### What Is Missing / Broken Right Now

1. **Brand-new animals are always "hungry" — but nothing shows the player they need to feed them.** The initial `chickens: {}`, `cows: {}`, `sheep: {}` in `INITIAL_FARM` means every slot has no `fedAt`, so `status === "hungry"` works. However there is no onboarding nudge or HUD notification that hungry animals are waiting.

2. **`feedChicken.ts` has a bug: the hungry guard is inverted.** It throws `"Chicken is not hungry"` when `chicken?.fedAt` is truthy — meaning a chicken that *has* been fed blocks re-feeding. This is correct. But when `chicken` is `undefined` (fresh slot, never fed), `chicken?.fedAt` is `undefined` which is falsy, so the guard passes correctly. This part is fine.

3. **No re-hunger timer after produce is collected.** Once `collectEgg` runs it sets `fedAt: undefined`, which immediately puts the chicken back to `"hungry"`. That is actually the correct behavior — the chicken is hungry again right after collection. No timer needed for re-hunger on collect; **this is already working**.

4. **No re-hunger timer for animals that have been fed but no produce collected** (player goes offline, comes back hours later). Currently: if a player never clicks to collect, the animal stays in `"eggReady"` forever. There is no "the food wore off" / "they got hungry again" state.

5. **The `useCowState` and `useSheepState` hooks stop their `setInterval` once the produce timer expires** — so the UI freezes at 100% and never transitions back to hungry if the player doesn't collect. No staleness check exists.

6. **`Cows.tsx` and `Sheeps.tsx` do not pass position props** — they use `{ top: 0, right: 0 }` as a hardcoded default, so all cows/sheep overlap at the same position. Not a hunger bug but needs fixing before Phase 2.

7. **No husbandry skill XP is awarded** when feeding or collecting. `feedChicken.ts` tracks `"Animal Fed"` activity but does not increment `skills.husbandry`.

---

## Proposed `ChickenState`, `CowState`, `SheepState` Changes

No type changes needed. The existing `fedAt?: number` field is sufficient:

- `fedAt = undefined` → hungry
- `fedAt = timestamp` and `now - fedAt < PRODUCE_TIME` → producing
- `fedAt = timestamp` and `now - fedAt >= PRODUCE_TIME` → produce ready (existing)
- `fedAt = timestamp` and `now - fedAt >= PRODUCE_TIME + RE_HUNGER_DELAY` → hungry again (NEW — Phase 2)

The `RE_HUNGER_DELAY` is the window the player has to collect produce before the animal goes hungry again. After that window the UI treats it as hungry and the player must feed again (losing the uncollected produce).

---

## Phases

---

### Phase 1 — Fix the Existing Hunger Loop (No New Features)

**Goal:** Make what already exists work correctly end-to-end. Every animal starts hungry, can be fed, and goes hungry again after produce is collected.

**Files to change:**

#### 1.1 — `features/game/lib/constants.ts`

Add the re-hunger delay constants. These control how long the "produce ready" window stays open before the animal goes hungry again without the player collecting.

```ts
// Window after produce is ready — player must collect before animal goes hungry again
export const CHICKEN_RE_HUNGER_DELAY = 4 * 60 * 60 * 1000;  // 4 hours
export const COW_RE_HUNGER_DELAY     = 6 * 60 * 60 * 1000;  // 6 hours
export const SHEEP_RE_HUNGER_DELAY   = 6 * 60 * 60 * 1000;  // 6 hours
```

> Note: These are separate from the produce timers. Set them to large values for now (4–6 hours) so animals are forgiving. They can be tuned later via `lib/data/`.

#### 1.2 — `features/animals/lib/useChickenState.ts`

Add a `"rehungry"` status check after `"eggReady"`:

```ts
if (timePassedSinceFed >= CHICKEN_TIME_TO_EGG + CHICKEN_RE_HUNGER_DELAY) {
  return "hungry";  // window expired, animal went hungry without being collected
}
if (timePassedSinceFed >= CHICKEN_TIME_TO_EGG) {
  return "eggReady";
}
```

Also fix the `setInterval`: restart it when the animal is in `"eggReady"` state so the hook keeps ticking until the re-hunger window also expires.

Apply the same pattern to `useCowState.ts` and `useSheepState.ts`.

#### 1.3 — `features/game/events/collectEgg.ts` / `collectMilk.ts` / `collectWool.ts`

Currently after collection `fedAt` is set to `undefined`. This is correct — animal is immediately hungry. No changes needed here.

Award husbandry XP on collection (mirrors how forestry XP is awarded in `chop.ts`):

```ts
const collectXP = getSkillXP("collect_produce");
const newHusbandryXP = (state.skills.husbandry ?? 0) + collectXP;
```

#### 1.4 — `features/game/events/feedChicken.ts` / `feedCow.ts` / `feedSheep.ts`

Award husbandry XP on feeding too (smaller amount than collection).

Also handle the `"rehungry"` case: if `fedAt` is set but the re-hunger window has expired, allow re-feeding (clear the old `fedAt` first). Right now the guard `if (chicken?.fedAt) throw "Chicken is not hungry"` would block re-feeding an animal whose produce window expired — the player would be stuck.

Fix:
```ts
const isRehungry = chicken?.fedAt &&
  (createdAt - chicken.fedAt) >= CHICKEN_TIME_TO_EGG + CHICKEN_RE_HUNGER_DELAY;

if (chicken?.fedAt && !isRehungry) {
  throw new Error("Chicken is not hungry");
}
```

#### 1.5 — `features/animals/components/Cows.tsx` and `Sheeps.tsx`

Add position spreading like `Chickens.tsx` does. Cows and sheep currently all stack at `{ top: 0, right: 0 }`. Add position arrays to `constants.ts` mirroring `CHICKEN_POSITIONS`.

---

### Phase 2 — HUD Hungry Indicator

**Goal:** Show the player somewhere on screen that animals need attention, without requiring them to scroll to the barn area.

**New file:** `features/hud/components/AnimalAlerts.tsx`

A small status bar rendered inside `features/hud/Hud.tsx` (or inside the existing HUD panel) that shows:
- An icon per animal type (chicken, cow, sheep) with a badge count of how many are hungry
- Clicking the icon scrolls/jumps the map camera to the animal area (using the `mapMovement` utility or a DOM scroll)

**Selector logic** (in a new `features/game/store/selectors.ts` entry or inline):

```ts
function countHungryChickens(state: GameState, now: number): number {
  return Array.from({ length: Number(state.inventory.Chicken ?? 0) }, (_, i) => {
    const c = state.chickens[i];
    if (!c?.fedAt) return true;
    const elapsed = now - c.fedAt;
    return elapsed >= CHICKEN_TIME_TO_EGG + CHICKEN_RE_HUNGER_DELAY;
  }).filter(Boolean).length;
}
```

Apply the same for cows and sheep.

**Files to create/change:**
- `features/hud/components/AnimalAlerts.tsx` — new component
- `features/hud/Hud.tsx` — import and render `<AnimalAlerts />`

---

### Phase 3 — Produce Ready Indicator

**Goal:** Show a separate count/icon for animals whose produce is ready to collect, distinct from hungry.

Same pattern as Phase 2 but queries for `"eggReady"` / `"milkReady"` / `"woolReady"`.

**Files to change:**
- `features/hud/components/AnimalAlerts.tsx` — extend with a "ready to collect" section

---

### Phase 4 — Husbandry Skill Integration

**Goal:** Reward the husbandry skill properly and let level-ups provide meaningful animal bonuses.

**Sub-tasks:**

#### 4.1 — Add `collect_produce` and `feed_animal` to `getSkillXP()` in `lib/skills.ts`

```ts
collect_produce: 15,   // per collect action
feed_animal:      5,   // per feed action
```

#### 4.2 — Add husbandry bonuses to `computeBonus()` in `lib/skills.ts`

Suggested milestones (discussable):

| Husbandry Level | Bonus |
|---|---|
| 10 | +1 extra egg/milk/wool per collect |
| 20 | -25% feed crop cost (e.g. 1 Wheat → 0.75) |
| 30 | +1 more extra produce (total +2) |
| 50 | Re-hunger window doubled |

This requires adding a `husbandryBonus` (or similar fields) to the `SkillBonus` type in `types/skills.ts`.

#### 4.3 — Apply bonuses in event handlers

`collectEgg.ts` / `collectMilk.ts` / `collectWool.ts` read `state.bonus.husbandryProduceBonus` and add it to the base yield.

`feedChicken.ts` / `feedCow.ts` / `feedSheep.ts` read `state.bonus.feedCostReduction` and apply it when deducting the crop.

---

## File Change Summary

| File | Phase | Change | Status |
|---|---|---|---|
| `features/game/lib/constants.ts` | 1 | Add `*_RE_HUNGER_DELAY`, add `COW_POSITIONS`, `SHEEP_POSITIONS` | Done |
| `features/animals/lib/useChickenState.ts` | 1 | Add re-hunger check, fix interval | Done |
| `features/animals/lib/useCowState.ts` | 1 | Add re-hunger check, fix interval | Done |
| `features/animals/lib/useSheepState.ts` | 1 | Add re-hunger check, fix interval | Done |
| `features/game/events/feedChicken.ts` | 1 | Fix re-hunger guard, award feed XP | Done |
| `features/game/events/feedCow.ts` | 1 | Fix re-hunger guard, award feed XP | Done |
| `features/game/events/feedSheep.ts` | 1 | Fix re-hunger guard, award feed XP | Done |
| `features/game/events/collectEgg.ts` | 1 | Award husbandry XP | Done |
| `features/game/events/collectMilk.ts` | 1 | Award husbandry XP | Done |
| `features/game/events/collectWool.ts` | 1 | Award husbandry XP | Done |
| `features/animals/components/Cow.tsx` | 1 | Accept & forward position prop | Done |
| `features/animals/components/Cows.tsx` | 1 | Spread cow positions from `COW_POSITIONS` | Done |
| `features/animals/components/Sheep.tsx` | 1 | Accept & forward position prop | Done |
| `features/animals/components/Sheeps.tsx` | 1 | Spread sheep positions from `SHEEP_POSITIONS` | Done |
| `features/game/lib/skills.ts` | 1 | Add `feed_animal` XP entry | Done |
| `features/hud/components/AnimalAlerts.tsx` | 2 | New — hungry animal indicator | Done |
| `features/hud/Hud.tsx` | 2 | Render `<AnimalAlerts />` | Done |
| `features/hud/components/AnimalAlerts.tsx` | 3 | Extend with produce-ready indicator | Done |
| `features/game/lib/skills.ts` | 4 | Add `feedCostReduction` + `reHungerMultiplier` milestones to `computeBonus()` | Done |
| `features/game/types/skills.ts` | 4 | Add `feedCostReduction` + `reHungerMultiplier` fields to `SkillBonus` | Done |
| `features/game/events/collectEgg.ts` | 4 | Apply `produceYield` + `produceDouble` to yield | Done |
| `features/game/events/collectMilk.ts` | 4 | Apply `produceYield` + `produceDouble` to yield | Done |
| `features/game/events/collectWool.ts` | 4 | Apply `produceYield` + `produceDouble` to yield | Done |
| `features/game/events/feedChicken.ts` | 4 | Apply `feedCostReduction` | Done |
| `features/game/events/feedCow.ts` | 4 | Apply `feedCostReduction` | Done |
| `features/game/events/feedSheep.ts` | 4 | Apply `feedCostReduction` | Done |
| `features/animals/lib/useChickenState.ts` | 4 | Accept `bonus` param, apply `produceSpeed` + `reHungerMultiplier` | Done |
| `features/animals/lib/useCowState.ts` | 4 | Accept `bonus` param, apply `produceSpeed` + `reHungerMultiplier` | Done |
| `features/animals/lib/useSheepState.ts` | 4 | Accept `bonus` param, apply `produceSpeed` + `reHungerMultiplier` | Done |
| `features/animals/components/Chicken.tsx` | 4 | Pass `state.bonus` to `useChickenState` | Done |
| `features/animals/components/Cow.tsx` | 4 | Pass `state.bonus` to `useCowState` | Done |
| `features/animals/components/Sheep.tsx` | 4 | Pass `state.bonus` to `useSheepState` | Done |

---

## Open Questions

1. **Re-hunger delay values** — The proposed 4–6 hour windows are generous to avoid frustrating players. Should they be shorter (e.g. 1–2 hours) to encourage more active play?
2. **Lost produce on re-hunger** — When the window expires and the animal goes hungry, should the uncollected produce be silently lost (current proposal), or should it be auto-added to inventory as a "barn floor drop"?
3. **Coop vs Barn for chickens** — Chickens currently use a separate visual area from cows/sheep. Should the hungry HUD indicator link to separate areas, or one combined "animals" scroll target?
4. **Husbandry skill bonus values** — Are the produce bonus values (+1, +2) and feed cost reduction (-25%) appropriate for the game's economy?
