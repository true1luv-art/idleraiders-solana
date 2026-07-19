# Robinhood Farm — Complete Game Mechanics Documentation

> **Source:** Live codebase in `shared/`, `lib/events/`, `lib/modules/`, `lib/config/`, and `phaser/`.
>
> Robinhood Farm is a pure farming game. Players plant crops, raise animals, chop trees, mine ore, fish, cook food, complete quests, and trade on a player-to-player marketplace — all persisted to MongoDB via a Next.js API.

---

## Table of Contents

1. [Game State & Data Model](#1-game-state--data-model)
2. [Currency: Coins (HFARM)](#2-currency-coins-hfarm)
3. [Stamina System](#3-stamina-system)
4. [Skills & Experience](#4-skills--experience)
5. [Skill Bonuses](#5-skill-bonuses)
6. [Farming (Crops)](#6-farming-crops)
7. [Woodcutting](#7-woodcutting)
8. [Mining](#8-mining)
9. [Fishing](#9-fishing)
10. [Animal Husbandry](#10-animal-husbandry)
11. [Cooking](#11-cooking)
12. [Selling Items (NPC Market)](#12-selling-items-npc-market)
13. [Quests](#13-quests)
14. [Reputation & Ranks](#14-reputation--ranks)
15. [Achievements](#15-achievements)
16. [Player-to-Player Marketplace](#16-player-to-player-marketplace)
17. [Buildings](#17-buildings)
18. [Initial Farm State](#18-initial-farm-state)

---

## 1. Game State & Data Model

**Source:** `shared/types/gameplay/game.ts`

Every player's farm is a single `GameState` document stored in MongoDB.

```
GameState {
  id?:                number
  username?:          string
  avatarUrl?:         string
  balance:            Decimal          // coin balance (HFARM in-game)
  fields:             Record<number, GameNode>   // crop plots
  trees:              Record<number, GameNode>   // wood trees
  stones:             Record<number, GameNode>   // stone rocks
  iron:               Record<number, GameNode>   // iron rocks
  gold:               Record<number, GameNode>   // gold rocks
  chickens:           Record<number, ChickenState>
  cows:               Record<number, CowState>
  sheep:              Record<number, SheepState>
  inventory:          Partial<Record<InventoryItemName, Decimal>>
  skills:             PlayerSkills     // XP totals per skill category
  bonus:              SkillBonus       // computed multipliers from skill levels
  stamina:            { current, max }
  lastStaminaRegenAt: number           // Unix ms
  fishing:            FishingState
  cooking:            CookingSlot | null
  activity:           Activity         // lifetime action counters
  achievements:       Partial<Record<AchievementName, number>>
}
```

### GameNode (plots, trees, rocks)

```
GameNode {
  name:       CropName | "Wood" | "Stone" | "Iron" | "Gold"
  plantedAt?: number   // crop plots
  choppedAt?: number   // trees
  minedAt?:   number   // rocks
  amount:     number   // base yield
}
```

### InventoryItemName

All of: `CropName`, `SeedName`, `CraftableName` (seeds, foods, animals), `ResourceName` (Wood, Stone, Iron, Gold), `FishName`.

---

## 2. Currency: Coins (HFARM)

- **In-game name:** coins (`player.coins` / `state.balance`)
- **On-chain token:** HFARM on Robinhood Chain (Ethereum Layer 2)
- **Starting balance:** 1,000 coins
- **Earned by:** selling crops, animal produce, fish, and cooked food to the NPC market; completing quests; trading on the marketplace
- **Spent on:** buying seeds and animals from the shop; marketplace listing fees (5% of sale)
- **Stored as:** `Decimal` (decimal.js-light) to avoid floating-point errors

---

## 3. Stamina System

**Source:** `shared/game/stamina.ts`, `shared/data/farming.ts`

Stamina gates most actions on the farm. Running out prevents chopping, mining, harvesting, and fishing until stamina regenerates or food is eaten.

### Constants

| Constant | Value |
|---|---|
| Max Stamina | 100 |
| Regen Rate | 5% of max (5 points) per interval |
| Regen Interval | 1 hour |
| Max Offline Regen Intervals | 8 (capped at 8 hours of offline regen) |

### Stamina Costs per Action

| Action | Cost |
|---|---|
| Harvest crop | 1 |
| Chop tree | 1 |
| Mine stone | 1 |
| Mine iron | 1 |
| Mine gold | 1 |
| Harvest resource | 1 |
| Plant seed | 0 |
| Cast fishing line | 3 |

### Stamina Regeneration Formula

```
intervalsElapsed = floor((now - lastRegenAt) / REGEN_INTERVAL_MS)
capped           = min(intervalsElapsed, MAX_OFFLINE_REGEN_INTERVALS)
regenAmount      = ceil(maxStamina × 0.05 × capped)
newStamina       = min(currentStamina + regenAmount, maxStamina)
newRegenAt       = lastRegenAt + (capped × REGEN_INTERVAL_MS)
```

If the player was offline for 8+ hours they recover a full 40 stamina (40% of max) at next login.

### Restoring Stamina with Food

Cooked food can be eaten to instantly restore stamina. Each food restores a fixed amount (see [Cooking](#11-cooking) for per-item values), capped at the player's max stamina. Eating is blocked if stamina is already full.

---

## 4. Skills & Experience

**Source:** `shared/game/skills.ts`, `shared/game/experience.ts`

There are **6 skill categories**, each tracking cumulative XP independently:

| Skill | Gained by |
|---|---|
| `farming` | Harvesting crops |
| `woodcutting` | Chopping trees |
| `mining` | Mining stone, iron, gold |
| `fishing` | Catching fish |
| `cooking` | Starting a cook (XP granted at start) |
| `husbandry` | Collecting animal produce (eggs, milk, wool) |

### Level Formula

```
XP_for_level(L → L+1) = round(500 + 350×(L-1) + 25×(L-1)²)

Level 1 → 2:   500 XP
Level 5 → 6:   2,100 XP
Level 10 → 11: 5,350 XP
Level 25 → 26: 21,100 XP
Level 50 → 51: 74,100 XP
Level 100 → ∞: (max level is 100)
```

Level is computed dynamically from cumulative XP with `getSkillLevel(totalXP)`. Level starts at 1.

### XP Awarded per Action

| Action | Skill | XP |
|---|---|---|
| Chop tree | woodcutting | 25 |
| Mine stone | mining | 60 |
| Mine iron | mining | 100 |
| Mine gold | mining | 150 |
| Harvest Potato | farming | 10 |
| Harvest Carrot | farming | 15 |
| Harvest Cabbage | farming | 20 |
| Harvest Pumpkin | farming | 25 |
| Harvest Beetroot | farming | 35 |
| Harvest Parsnip | farming | 45 |
| Harvest Radish | farming | 55 |
| Harvest Cauliflower | farming | 70 |
| Harvest Wheat | farming | 90 |
| Harvest Kale | farming | 120 |
| Cook Roasted Potato | cooking | 25 |
| Cook Carrot Stew | cooking | 35 |
| Cook Cabbage Roll | cooking | 40 |
| Cook Pumpkin Soup | cooking | 50 |
| Cook Beetroot Salad | cooking | 60 |
| Cook Parsnip Porridge | cooking | 70 |
| Cook Radish Skewers | cooking | 80 |
| Cook Cauliflower Sandwich | cooking | 90 |
| Cook Wheat Bread | cooking | 100 |
| Cook Kale Stir-fry | cooking | 120 |
| Collect Egg | husbandry | 30 |
| Collect Milk | husbandry | 50 |
| Collect Wool | husbandry | 50 |
| Catch Fish | fishing | 35 |

---

## 5. Skill Bonuses

**Source:** `shared/game/skills.ts → computeBonus()`

Bonuses unlock at every 10 skill levels and are **additive rates** applied on top of the base value. `computeBonus()` recalculates the full `SkillBonus` object from current XP and is triggered automatically when the player levels up at a multiple of 10.

### Woodcutting Bonuses

| Level | Bonus |
|---|---|
| 10 | +10% wood yield |
| 20 | +10% wood yield |
| 30 | +10% wood recovery speed |
| 40 | +10% wood yield |
| 50 | +10% wood recovery speed |
| 60 | +10% wood yield |
| 70 | +10% wood recovery speed |
| 80 | +10% wood yield |
| 90 | +10% wood recovery speed |
| 100 | +25% wood yield, +15% double-drop chance |

### Mining Bonuses

| Level | Bonus |
|---|---|
| 10 | +10% ore yield |
| 20 | +10% ore yield |
| 30 | +10% ore recovery speed |
| 40 | +10% ore yield |
| 50 | +10% double-drop chance |
| 60 | +10% ore recovery speed |
| 70 | +20% ore yield |
| 80 | +10% ore recovery speed |
| 90 | +10% double-drop chance |
| 100 | +25% ore yield, +10% ore recovery speed |

### Farming Bonuses

| Level | Bonus |
|---|---|
| 10 | +5% crop growth speed |
| 20 | +5% crop growth speed |
| 30 | +10% crop yield |
| 40 | +5% crop growth speed |
| 50 | +10% crop yield |
| 60 | +5% crop growth speed |
| 70 | +10% double-drop chance |
| 80 | +15% crop yield |
| 90 | +5% crop growth speed |
| 100 | +15% crop yield, +10% double-drop chance |

### Husbandry Bonuses

| Level | Bonus |
|---|---|
| 10 | +10% produce speed |
| 20 | +10% produce speed |
| 30 | +10% produce yield |
| 40 | +10% produce speed |
| 50 | +10% double-drop chance |
| 60 | +10% produce yield |
| 70 | +10% produce speed |
| 80 | +10% produce yield |
| 90 | +10% double-drop chance |
| 100 | +10% produce speed, +20% produce yield |

### Fishing Bonuses

| Level | Bonus |
|---|---|
| 10 | +10% fish yield |
| 20 | +10% fish yield |
| 30 | +10% cooldown reduction |
| 40 | +10% fish yield |
| 50 | +10% double-drop chance |
| 60 | +10% cooldown reduction |
| 70 | +20% fish yield |
| 80 | +10% cooldown reduction |
| 90 | +10% double-drop chance |
| 100 | +25% fish yield, +15% double-drop chance |

### Cooking Bonuses

| Level | Bonus |
|---|---|
| 10 | +10% stamina restored per food |
| 20 | +10% stamina restored per food |
| 30 | +5% double-cook chance |
| 40 | +10% stamina restored per food |
| 50 | +10% cook speed |
| 60 | +5% double-cook chance |
| 70 | +10% stamina restored per food |
| 80 | +10% cook speed |
| 90 | +10% double-cook chance |
| 100 | +10% stamina restored per food, +10% cook speed |

### How Bonuses Apply

- **Yield bonuses** → `floor(base × (1 + bonusRate))`
- **Speed bonuses** → `max(0, baseDuration × (1 − bonusRate))` (faster growth/cook/recovery)
- **Double-drop chance** → `Math.random() < bonusRate` → if true, final yield × 2

---

## 6. Farming (Crops)

**Source:** `shared/data/farming.ts`, `lib/events/plant/plant.ts`, `lib/events/harvest/harvest.ts`

### Crop Table

| Crop | Grow Time | Seed Buy Price | Sell Price | Min Farming Level |
|---|---|---|---|---|
| Potato | 1 min | 0.05 coins | 0.065 coins | 0 |
| Carrot | 5 min | 0.125 | 0.175 | 1 |
| Cabbage | 10 min | 0.25 | 0.375 | 2 |
| Pumpkin | 30 min | 0.50 | 0.80 | 3 |
| Beetroot | 1 hr | 0.875 | 1.575 | 5 |
| Parsnip | 2 hr | 1.50 | 3.00 | 6 |
| Radish | 3 hr | 2.25 | 4.95 | 8 |
| Cauliflower | 6 hr | 3.50 | 8.75 | 10 |
| Wheat | 12 hr | 5.00 | 14.00 | 12 |
| Kale | 24 hr | 7.50 | 22.50 | 15 |

> All prices above are fixed base values.

### Planting Rules

- Costs 1 seed from inventory (deducted immediately)
- Field must be empty
- Player's Farming Level must meet the seed's `levelRequirement`
- Field index must be unlocked for the player's current Farming Level (see plot unlock table below)
- Planting does **not** cost stamina

### Plot Unlock Table

There are **72 plots total** (indices 0–71), laid out in 12 rows of 6. Rows unlock progressively:

| Plots | Farming Level Required |
|---|---|
| 0–5 (row 1) | 0 — always available |
| 6–11 (row 2) | 2 |
| 12–17 (row 3) | 4 |
| 18–23 (row 4) | 6 |
| 24–29 (row 5) | 8 |
| 30–35 (row 6) | 10 |
| 36–41 (row 7) | 12 |
| 42–47 (row 8) | 14 |
| 48–53 (row 9) | 16 |
| 54–59 (row 10) | 18 |
| 60–65 (row 11) | 21 |
| 66–71 (row 12) | 25 |

### Harvesting

1. Requires **1 stamina**
2. Crop must be past its `harvestSeconds` window (`now - plantedAt ≥ harvestSeconds × 1000`)
3. Yield = `floor(baseAmount × (1 + cropYield bonus))`, then doubled if `rollCropDouble()` hits
4. Grants Farming XP and removes the field entry from `fields`
5. Speed bonus is applied at plant time (via `getSnapshotTimestamp`) so the crop appears ready sooner on the client

---

## 7. Woodcutting

**Source:** `lib/events/chop/chop.ts`, `shared/data/farming.ts`

### Tree Nodes

- **5 trees** on the farm (indices 0–4)
- Base wood amount per tree: 3–5 (set on regeneration)
- **Recovery time:** 15 minutes (`TREE_RECOVERY_SECONDS = 900`)

### Chop Action

1. Requires **1 stamina**
2. Tree must have recovered (`now - choppedAt > recoverySeconds × 1000`)
3. Wood drop = `floor(treeAmount × (1 + woodYield))`, doubled if `rollWoodDouble()` hits
4. Tree resets with `choppedAt` backdated by `woodRecovery` bonus (faster re-availability)
5. Grants 25 Woodcutting XP

---

## 8. Mining

**Source:** `lib/events/mine/mine.ts`, `shared/data/farming.ts`

### Resource Nodes

| Resource | Initial Nodes | Base Amount | Recovery Time |
|---|---|---|---|
| Stone | 3 (indices 0–2) | 2–4 | 1 hour (3,600 s) |
| Iron | 2 (indices 0–1) | 2–3 | 12 hours (43,200 s) |
| Gold | 1 (index 0) | 2 | 24 hours (86,400 s) |

### Mine Action

1. Requires **1 stamina** (stone/iron/gold each cost 1)
2. Rock must have recovered (`now - minedAt > recoverySeconds × 1000`)
3. Ore drop = `floor(rockAmount × (1 + oreYield))`, doubled if `rollOreDouble()` hits
4. Rock resets with `minedAt` backdated by `oreRecovery` bonus
5. XP awarded: Stone 60, Iron 100, Gold 150

---

## 9. Fishing

**Source:** `lib/events/fishing/catchFish.ts`, `shared/game/fishing.ts`, `shared/data/farming.ts`

### Cooldown

| Constant | Value |
|---|---|
| Base cooldown | 30,000 ms (30 s) |
| Minimum cooldown | 15,000 ms (15 s) |

Effective cooldown = `max(15,000, 30,000 × (1 − fishSpeed bonus))`

### Fish Table (weighted random, level-gated)

| Fish | Weight | Min Fishing Level | Sell Price |
|---|---|---|---|
| Anchovy | 50 | 0 | 0.30 coins |
| Sardine | 45 | 0 | 0.35 |
| Tilapia | 40 | 0 | 0.40 |
| Herring | 35 | 0 | 0.45 |
| Trout | 28 | 10 | 0.60 |
| Sea Bass | 22 | 10 | 0.80 |
| Mackerel | 18 | 20 | 1.00 |
| Salmon | 15 | 20 | 1.20 |
| Red Snapper | 10 | 30 | 1.80 |
| Barracuda | 7 | 40 | 2.50 |
| Tuna | 5 | 50 | 3.50 |
| Swordfish | 3 | 60 | 5.00 |
| Blue Marlin | 1.5 | 70 | 8.00 |
| Oarfish | 0.5 | 90 | 15.00 |

Fish is selected by weighted random draw from the eligible pool (fish whose `minLevel ≤ playerFishingLevel`).

### Cast Action

1. Requires **3 stamina**
2. Must wait for `effectiveCooldown` since `lastCastAt`
3. Amount = `max(1, floor(1 × (1 + fishYield)))`, doubled if `rollFishDouble()` hits
4. Grants 35 Fishing XP

---

## 10. Animal Husbandry

**Source:** `lib/events/feed-animals/`, `lib/events/collect-produce/`, `shared/data/farming.ts`

### Animal Table

| Animal | Feed Item | Produce | Produce Time | Re-Hunger Delay | Max Count | Buy Price | Min Farming Level |
|---|---|---|---|---|---|---|---|
| Chicken | Wheat (1) | Egg | 1 min | 4 hours | 10 | 5 coins | 3 |
| Cow | Kale (1) | Milk | 1.5 min | 6 hours | 5 | 50 coins | 6 |
| Sheep | Cabbage (1) | Wool | 2 min | 6 hours | 5 | 30 coins | 8 |

### Feed Action

1. Animal must not already have pending produce (or must have become hungry again after `produceTime + reHungerDelay`)
2. Consumes 1 of the feed item from inventory
3. Sets `fedAt` timestamp (backdated by `produceSpeed` bonus)
4. No stamina cost

### Collect Produce Action

1. Produce must be ready (`now - fedAt ≥ produceTime`)
2. Amount = `floor(multiplier × (1 + produceYield))`, doubled if `rollProduceDouble()` hits
3. Clears `fedAt` (animal is now hungry again after `reHungerDelay`)
4. Grants Husbandry XP: Egg 30, Milk 50, Wool 50

### Animal Alerts

The HUD displays alerts for any animals that have produce ready to collect.

---

## 11. Cooking

**Source:** `lib/events/cooking/startCooking.ts`, `lib/events/cooking/collectCooked.ts`, `lib/events/consume/consumeFood.ts`, `shared/types/gameplay/craftables.ts`

The kitchen has a single cooking slot. Only one recipe can be active at a time.

### Recipe Table

| Recipe | Ingredients | Cook Time | Sell Price | Stamina Restored |
|---|---|---|---|---|
| Roasted Potato | 2× Potato | 30 s | 0.30 coins | 5 |
| Carrot Stew | 3× Carrot | 60 s | 1.20 coins | 10 |
| Cabbage Roll | 2× Cabbage, 1× Carrot | 90 s | 2.10 coins | 15 |
| Pumpkin Soup | 3× Pumpkin, 1× Cabbage | 120 s | 6.30 coins | 20 |
| Beetroot Salad | 3�� Beetroot, 1× Pumpkin | 180 s | 12.60 coins | 25 |
| Parsnip Porridge | 3× Parsnip, 2× Beetroot | 240 s | 27.00 coins | 30 |
| Radish Skewers | 4× Radish, 1× Parsnip | 300 s | 52.00 coins | 35 |
| Cauliflower Sandwich | 4× Cauliflower, 2�� Radish | 360 s | 100.00 coins | 40 |
| Wheat Bread | 5× Wheat, 2× Cauliflower | 420 s | 196.00 coins | 45 |
| Kale Stir-fry | 5× Kale, 3× Wheat | 480 s | 350.00 coins | 50 |

### Start Cooking

1. Kitchen slot must be empty
2. All ingredients are consumed from inventory immediately
3. `cookingSpeed` bonus reduces cook time: `effectiveDuration = round(cookTime × (1 − cookingSpeed))`
4. Cooking XP is awarded **at start**, not at collection

### Collect Cooked

1. `now - startedAt ≥ duration × 1000`
2. Adds 1 unit of the cooked food to inventory
3. Clears the cooking slot

### Consume Food (Eat)

1. Food must be in inventory
2. Stamina must be below max
3. Each unit restores `FOOD_STAMINA_RESTORE[item]` stamina (see Stamina Restored column above)
4. Multiple units can be consumed in one action

---

## 12. Selling Items (NPC Market)

**Source:** `lib/events/sell/sell.ts`, `lib/events/sell/sellFood.ts`, `lib/events/sell/sellProduce.ts`

Players can sell directly to the NPC for instant coins at fixed prices. No stamina cost.

| Category | What Can Be Sold | Price Source |
|---|---|---|
| Crops | Any harvested crop | `CROPS()[item].sellPrice` (from crop table) |
| Cooked food | Any recipe output | `FOODS()[item].sellPrice` (from recipe table) |
| Animal produce | Egg, Milk, Wool | Fixed per-produce sell prices |
| Fish | Any caught fish | `FISH_TABLE` sell prices |

> All NPC prices are fixed base values.

---

## 13. Quests

**Source:** `shared/quests/engine.ts`, `shared/data/quests.ts`, `shared/types/quests.ts`

Quests are **delivery quests** — the player must have the required quantity in their server inventory when they click Complete.

### Quest Structure

```
EmbeddedQuest {
  id:         string
  category:   QuestCategory   // farming | mining | woodcutting | fishing | cooking | husbandry
  difficulty: QuestDifficulty // easy | normal | hard | expert
  status:     "active" | "completed" | "expired"
  objective:  { resource: string; required: number }
  rewards:    { rewardRep: number; skillXp: number }
  generatedAt: number
  expiresAt:   number
  completedAt?: number
}
```

### Daily Quests

One quest per skill category is generated daily. There are **6 daily quests** total (one each for farming, mining, woodcutting, fishing, cooking, husbandry). They expire at **midnight UTC** the next day.

### Weekly Quest

One weekly quest is generated for the player's **highest-level skill**. The difficulty is boosted to at least "hard" regardless of level. Expires the following **Monday at midnight UTC**.

### Difficulty Based on Skill Level

| Skill Level | Quest Difficulty |
|---|---|
| < 10 | Easy |
| 10–24 | Normal |
| 25–49 | Hard |
| ≥ 50 | Expert |

### Quest Objectives

| Category | Easy | Normal | Hard | Expert |
|---|---|---|---|---|
| Farming | 20 Potatoes | 30 Carrots | 15 Cauliflowers | 10 Kale |
| Mining | 30 Stone | 20 Iron | 10 Gold | 25 Gold |
| Woodcutting | 30 Wood | 80 Wood | 150 Wood | 300 Wood |
| Fishing | 20 Sardines | 15 Trout | 10 Sea Bass | 5 Oarfish |
| Cooking | 15 Roasted Potato | 10 Carrot Stew | 5 Wheat Bread | 3 Kale Stir-fry |
| Husbandry | 20 Eggs | 15 Milk | 10 Wool | 5 Feathers |

### Quest Rewards

| Difficulty | Reputation Points | Skill XP |
|---|---|---|
| Easy | 50 | 50 |
| Normal | 100 | 150 |
| Hard | 200 | 400 |
| Expert | 400 | 1,000 |

Skill XP is awarded to the **matching skill category** (e.g. a farming quest grants Farming XP).

---

## 14. Reputation & Ranks

**Source:** `lib/utils/reputation.ts`

Reputation Points (RP) are earned by completing quests. Rank is purely cosmetic — no mechanics are gated behind it.

### Rank Thresholds

| Rank | RP Required |
|---|---|
| Newcomer | 0 |
| Farmhand | 500 |
| Settler | 1,500 |
| Cultivator | 4,000 |
| Artisan | 10,000 |
| Elder | 25,000 |
| Legend | 60,000 |

`getRank(rp)` returns the current rank name, the next threshold, and fractional progress toward the next rank.

---

## 15. Achievements

**Source:** `shared/types/gameplay/achievements.ts`

Achievements are unlocked by reaching lifetime activity thresholds. Many form chains (`requires: [previousAchievement]`). Categories: `farming`, `animals`, `gathering`, `economy`, `progression`.

### Selected Achievements by Category

**Farming**
- First Harvest → Budding Farmer (100) → Field Worker (500) → Crop Master (2,500) → Harvest Legend (10,000) → Eternal Farmer (100,000)
- Crop-specific: Spud Specialist (1,000 Potatoes), Carrot Commander (1,000 Carrots), Kale King (50 Kale)
- All-Rounder (harvest every crop type once) → Crop Perfectionist (100 of every type)

**Animals**
- Animal Friend → Caretaker (100 feeds) → Animal Whisperer (1,000 feeds)
- Barnyard Boss (own all 3 animal types)
- Egg Collector (100) → Egg Enthusiast (1,000) → Egg Empire (10,000)
- Dairy Devotee (500 Milk) → Milk Magnate (5,000)
- Wool Gatherer (500) → Wool Wizard (5,000)

**Gathering**
- Woodcutting chain: First Chop → Woodcutter (50) → Lumberjack (500) → Forest Fury (5,000)
- Stone chain: Rock Breaker → Quarry Worker (50) → Stone Seeker (500) → Mountain Mover (5,000)
- Iron: Iron Finder → Iron Worker (100) → Iron Heart (1,000)
- Gold: Gold Digger → Gold Rush (50) → Golden Touch (500)

**Economy**
- First Sale → Merchant (100 coins) → Trader (1,000) → Wealthy Farmer (10,000) → Tycoon (100,000)
- Big Spender (spend 1,000) → High Roller (spend 10,000)
- Coin Hoarder (hold 10,000 coins)

**Progression** (skill level milestones)
- Every 10 levels across all 6 skills: Farming Level 10–100, Woodcutting Level 10–100, Mining Level 10–100, Husbandry Level 10–100, Cooking Level 10–100, Fishing Level 10–100

---

## 16. Player-to-Player Marketplace

**Source:** `shared/data/marketplace.ts`, `lib/modules/marketplace/`

Players can list items for sale and purchase other players' listings.

### Tradable Asset Types

`resource`, `seed`, `food`, `fish`, `crafting_material`

All assets are stackable (partial fills and quantity selection supported).

### Marketplace Configuration

| Setting | Value |
|---|---|
| Marketplace fee | 5% of sale price (min 0.01, max 10,000) |
| Min listing duration | 1 hour (3,600 s) |
| Max listing duration | 7 days (604,800 s) |
| Default duration | 72 hours (259,200 s) |
| Min price per unit | 0.01 coins |
| Max price per unit | 10,000,000 coins |
| Max active listings per player | 20 |
| Listing cooldown | 1,000 ms between listings |
| Purchase cooldown | 500 ms between purchases |
| Lock timeout | 30,000 ms (listing held during purchase settlement) |

### Fee Formula

```
fee = clamp(totalPrice × 0.05, 0.01, 10_000)
```

The fee is deducted from the buyer's payment before the seller is credited.

### Listing Flow

1. Player creates listing → items escrowed from inventory
2. Buyer clicks purchase → listing locked for up to 30 s
3. Purchase settled → seller credited (95%), fee retained (5%), items transferred
4. If settlement fails → lock released, listing remains active
5. Expired listings → items returned to lister's inventory

### Price History

`GET /api/marketplace/history/prices` exposes price history per asset for charts and analytics.

---

## 17. Buildings

**Source:** `lib/config/buildings.ts`

Buildings on the map open their respective modals when clicked. Any building can be disabled via config to show a "coming soon" or "maintenance" status instead.

| Building | Enabled | Modal |
|---|---|---|
| House | Yes | Player profile, reputation, skills |
| Bank | Yes | Market sell modal |
| Market | Yes | Crop/seed market |
| Kitchen | Yes | Cooking interface |
| Barn | Yes | Animal management |
| Summoning Shrine | No (coming soon) | — |
| Hall of Fame | No (coming soon) | — |

---

## 18. Initial Farm State

**Source:** `shared/game/constants.ts`

Every new player starts with the following pre-populated farm:

```
balance:   1,000 coins
stamina:   100 / 100

inventory:
  Potato Seed: 10
  Potato:       5
  Carrot:      12
  Wheat:       25
  Kale:        10
  Cabbage:     10
  Chicken:      2
  Cow:          1
  Sheep:        1

fields (pre-planted):
  plot 0: Potato (plantedAt = 0, amount = 1)
  plot 1: Potato (plantedAt = 0, amount = 1)
  plot 2: Potato (plantedAt = 0, amount = 1)

trees:
  0: 3 Wood  |  1: 4 Wood  |  2: 5 Wood  |  3: 5 Wood  |  4: 3 Wood

stones:
  0: 2 Stone  |  1: 3 Stone  |  2: 4 Stone

iron:
  0: 2 Iron  |  1: 3 Iron

gold:
  0: 2 Gold

skills: all 0 XP (Level 1 in all categories)
```
