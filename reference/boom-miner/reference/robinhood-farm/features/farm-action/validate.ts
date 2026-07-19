/**
 * lib/events/farm-action/validate.ts
 *
 * Server-safe crop and resource gathering validators. §2.3-A through §2.3-E
 *
 * Design rationale:
 * - The Phaser event handlers (plant.ts, harvest.ts, chop.ts, …) reference
 *   `screenTracker.calculate()` — a client-only anti-cheat heuristic that
 *   accesses the DOM. They cannot run on the server as-is.
 * - `processGameEvent` in events/index.ts catches all thrown errors silently,
 *   returning the original state instead of surfacing the error. The API
 *   route needs errors to propagate so they can be returned as HTTP 422.
 * - This module duplicates the *validation and state-transition* logic of the
 *   Phaser event handlers, minus `screenTracker` and minus the silent catch.
 *   It imports shared helpers (CROPS, skills, stamina, boosts, config) but
 *   never imports Phaser scene/DOM code.
 *
 * Stamina pre-step (§2.3-D):
 * - Every action first calls `applyStaminaRegen(state, createdAt)` to bring
 *   the server's stamina up to date before checking sufficiency.
 *   This mirrors the `staminaRegen` event that Phaser fires periodically.
 *
 * Reference: docs/implementation_plans/phase-02-farming-backend.md §2.3
 */

import Decimal from "decimal.js-light";
import type { GameState, GameNode } from "@/features/types/gameplay/game";
import { FOODS } from "@/features/types/gameplay/craftables";
import type { Food } from "@/features/types/gameplay/craftables";
import type { CookFoodAction } from "@/features/events/cooking/cookFood";
import { CROPS }                    from "@/features/types/gameplay/crops";
import type { CropName }            from "@/features/types/gameplay/crops";
import { INITIAL_DRAW } from "@/features/types/gameplay/skills";
import {
  getSkillXP,
  getHarvestXP,
  getFishXP,
  getSkillLevel,
  computeDraw,
} from "@/features/game/skills";
import { rollDraw } from "@/features/game/draw";

import {
  hasEnoughStamina,
  deductStamina,
  STAMINA_CONSTANTS,
} from "@/features/game/stamina";
import { trackMilestone } from "@/features/game/milestones";
import type { MilestoneName } from "@/features/types/gameplay/milestones";
import {
  isFieldUnlocked,
  getFieldLevelRequirement,
  TOTAL_FIELDS,
} from "@/features/game/fields";
import { CROPS_CONFIG } from "@/features/game/crops";

import {
  TREE_RECOVERY_SECONDS,
  STONE_RECOVERY_SECONDS,
  IRON_RECOVERY_SECONDS,
  GOLD_RECOVERY_SECONDS,
} from "@/features/game/resources";
import { FISH_TABLE, FISHING_BASE_COOLDOWN_MS } from "@/features/game/fishing";
import { ANIMALS_CONFIG } from "@/features/game/animals";
import { rollCatch } from "@/features/game/fishing";

// ---------------------------------------------------------------------------
// §2.3-D  Stamina regen pre-step
// ---------------------------------------------------------------------------

/**
 * Applies any pending stamina regeneration ticks to the state, using
 * `createdAt` as the "now" reference instead of `Date.now()`.
 *
 * This is the server-side equivalent of the Phaser `stamina.regenerate` event.
 * It is called at the top of every server-side action validator so the
 * server always works with current stamina before checking sufficiency.
 */
export function applyStaminaRegen(
  state:     GameState,
  createdAt: number,
): GameState {
  const maxStamina  = STAMINA_CONSTANTS.DEFAULT_MAX_STAMINA;
  const lastRegen   = state.lastStaminaRegenAt;
  const elapsed     = createdAt - lastRegen;
  const intervals   = Math.floor(elapsed / STAMINA_CONSTANTS.REGEN_INTERVAL_MS);

  if (intervals <= 0) return state;

  const capped     = Math.min(intervals, STAMINA_CONSTANTS.MAX_OFFLINE_REGEN_INTERVALS);
  const regenAmt   = Math.ceil(maxStamina * STAMINA_CONSTANTS.STAMINA_REGEN_PERCENT * capped);
  const newStamina = Math.min(state.stamina.current + regenAmt, maxStamina);
  const newRegenAt = lastRegen + capped * STAMINA_CONSTANTS.REGEN_INTERVAL_MS;

  return {
    ...state,
    stamina:            { current: newStamina, max: maxStamina },
    lastStaminaRegenAt: newRegenAt,
  };
}

// ---------------------------------------------------------------------------
// §2.3-A  Server-side plant validator
// ---------------------------------------------------------------------------

const VALID_SEED_SUFFIXES = [
  "Potato Seed", "Carrot Seed", "Cabbage Seed", "Pumpkin Seed",
  "Beetroot Seed", "Parsnip Seed", "Radish Seed", "Cauliflower Seed",
  "Wheat Seed", "Kale Seed",
] as const;

function isSeed(item: string): boolean {
  return (VALID_SEED_SUFFIXES as readonly string[]).includes(item);
}

/**
 * Server-side plant — validates and applies an `item.planted` action.
 */
export function serverPlant(
  state:     GameState,
  action:    { type: "item.planted"; item?: string; index: number },
  createdAt: number = Date.now(),
): GameState {
  const s = applyStaminaRegen(state, createdAt);
  const fields = { ...s.fields };

  if (action.index < 0 || !Number.isInteger(action.index) || action.index >= TOTAL_FIELDS) {
    throw new Error("Field does not exist");
  }
  const farmingLevel = getSkillLevel(s.skills.farming);
  if (!isFieldUnlocked(action.index, farmingLevel)) {
    throw new Error(
      `Field requires Farming Level ${getFieldLevelRequirement(action.index)}`,
    );
  }
  if (fields[action.index]) throw new Error("Crop is already planted");
  if (!action.item)         throw new Error("No seed selected");
  if (!isSeed(action.item)) throw new Error("Not a seed");

  const seedCount = new Decimal(
    (s.inventory as Record<string, Decimal>)[action.item] ?? 0,
  );
  if (seedCount.lessThan(1)) throw new Error("Not enough seeds");

  const crop = action.item.split(" ")[0] as CropName;
  const crops = CROPS();
  if (!crops[crop]) throw new Error("Unknown crop");

  const seedLevelRequirement = CROPS_CONFIG[crop].farmingLevelRequired;
  if (farmingLevel < seedLevelRequirement) {
    throw new Error(`Seed requires Farming Level ${seedLevelRequirement}`);
  }

  const cropBase = crops[crop].harvestSeconds;
  const plantedAt = createdAt;

  return {
    ...s,
    inventory: {
      ...s.inventory,
      [action.item]: seedCount.sub(1),
    },
    fields: {
      ...fields,
      [action.index]: { name: crop, plantedAt },
    },
    milestones: trackMilestone(s.milestones, "Seed Planted", 1),
  };
}

// ---------------------------------------------------------------------------
// §2.3-B  Server-side harvest validator
// ---------------------------------------------------------------------------

/**
 * Server-side harvest — validates and applies an `item.harvested` action.
 */
export function serverHarvest(
  state:     GameState,
  action:    { type: "item.harvested"; index: number },
  createdAt: number = Date.now(),
): GameState {
  const s = applyStaminaRegen(state, createdAt);

  if (!hasEnoughStamina(s.stamina.current, "harvest_crop")) {
    throw new Error("Not enough stamina to harvest");
  }

  if (action.index < 0 || !Number.isInteger(action.index) || action.index >= TOTAL_FIELDS) {
    throw new Error("Field does not exist");
  }

  const field = s.fields[action.index];
  if (!field) throw new Error("Nothing was planted");

  const crops   = CROPS();
  const cropName = field.name as CropName;
  const crop     = crops[cropName];
  if (!crop) throw new Error("Not a crop field");

  if (createdAt - (field.plantedAt ?? 0) < crop.harvestSeconds * 1000) {
    throw new Error("Not ready");
  }

  const draw     = s.draw ?? { ...INITIAL_DRAW };
  const yieldAmt = rollDraw(draw.farmingDraw);

  const cropCount    = new Decimal(
    (s.inventory as Record<string, Decimal>)[field.name] ?? 0,
  );

  const harvestXP    = getHarvestXP(field.name);
  const newFarmingXP = (s.skills.farming ?? 0) + harvestXP;

  const oldLevel = getSkillLevel(s.skills.farming ?? 0);
  const newLevel = getSkillLevel(newFarmingXP);
  const levelUp  = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw({ ...s.skills, farming: newFarmingXP }) : draw;

  let milestones = trackMilestone(s.milestones, "Crop Harvested", 1);
  milestones     = trackMilestone(
    milestones,
    `${field.name} Harvested` as MilestoneName,
    1,
  );

  const newFields = { ...s.fields };
  delete newFields[action.index];

  return {
    ...s,
    fields:    newFields,
    inventory: { ...s.inventory, [field.name]: cropCount.add(yieldAmt) },
    skills:    { ...s.skills, farming: newFarmingXP },
    draw:      newDraw,
    stamina:    { ...s.stamina, current: deductStamina(s.stamina.current, "harvest_crop") },
    milestones,
  };
}

// ---------------------------------------------------------------------------
// §2.3-C  Server-side tree chop validator
// ---------------------------------------------------------------------------

export function serverChop(
  state:     GameState,
  action:    { type: "tree.chopped"; index: number },
  createdAt: number = Date.now(),
): GameState {
  const s = applyStaminaRegen(state, createdAt);

  if (!hasEnoughStamina(s.stamina.current, "chop_tree")) {
    throw new Error("Not enough stamina to chop");
  }

  const tree = s.trees[action.index];
  if (!tree) throw new Error("No tree");
  if (createdAt - (tree.choppedAt ?? 0) <= TREE_RECOVERY_SECONDS * 1000) {
    throw new Error("Tree is still growing");
  }

  const draw     = s.draw ?? { ...INITIAL_DRAW };
  const woodDrop = rollDraw(draw.woodcuttingDraw);

  const woodAmt          = new Decimal(
    (s.inventory as Record<string, Decimal>)["Wood"] ?? 0,
  );
  const newWoodcuttingXP = (s.skills.woodcutting ?? 0) + getSkillXP("chop_tree");
  const oldLevel         = getSkillLevel(s.skills.woodcutting ?? 0);
  const newLevel         = getSkillLevel(newWoodcuttingXP);
  const levelUp          = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw({ ...s.skills, woodcutting: newWoodcuttingXP }) : draw;

  return {
    ...s,
    inventory: { ...s.inventory, Wood: woodAmt.add(woodDrop) },
    trees: {
      ...s.trees,
      [action.index]: {
        name: "Wood" as const,
        choppedAt: createdAt,
      },
    },
    skills:    { ...s.skills, woodcutting: newWoodcuttingXP },
    draw:      newDraw,
    stamina:   { ...s.stamina, current: deductStamina(s.stamina.current, "chop_tree") },
    milestones: trackMilestone(s.milestones, "Tree Chopped", 1),
  };
}

// ---------------------------------------------------------------------------
// §2.3-C  Server-side ore mining validators
// ---------------------------------------------------------------------------

function serverMineOre(
  state:      GameState,
  action:     { index: number },
  createdAt:  number,
  collection: "stones" | "iron" | "gold",
  itemName:   "Stone" | "Iron" | "Gold",
  staminaKey: "mine_stone" | "mine_iron" | "mine_gold",
  xpKey:      "mine_stone" | "mine_iron" | "mine_gold",
  recoverySec: number,
): GameState {
  const s = applyStaminaRegen(state, createdAt);

  if (!hasEnoughStamina(s.stamina.current, staminaKey)) {
    throw new Error(`Not enough stamina to mine`);
  }

  const nodes = s[collection] as Record<number, GameNode>;
  const rock  = nodes[action.index];
  if (!rock) throw new Error("No rock");
  if (createdAt - (rock.minedAt ?? 0) <= recoverySec * 1000) {
    throw new Error("Rock is still recovering");
  }

  const draw    = s.draw ?? { ...INITIAL_DRAW };
  const oreDrop = rollDraw(draw.miningDraw);

  const oreCurrent  = new Decimal(
    (s.inventory as Record<string, Decimal>)[itemName] ?? 0,
  );
  const newMiningXP = (s.skills.mining ?? 0) + getSkillXP(xpKey);

  const oldLevel = getSkillLevel(s.skills.mining ?? 0);
  const newLevel = getSkillLevel(newMiningXP);
  const levelUp  = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw({ ...s.skills, mining: newMiningXP }) : draw;

  const milestoneLabel =
    itemName === "Stone"
      ? ("Stone Mined" as MilestoneName)
      : itemName === "Iron"
        ? ("Iron Mined" as MilestoneName)
        : ("Gold Mined" as MilestoneName);

  return {
    ...s,
    inventory: { ...s.inventory, [itemName]: oreCurrent.add(oreDrop) },
    [collection]: {
      ...nodes,
      [action.index]: {
        name: itemName,
        minedAt: createdAt,
      },
    },
    skills:     { ...s.skills, mining: newMiningXP },
    draw:       newDraw,
    stamina:    { ...s.stamina, current: deductStamina(s.stamina.current, staminaKey) },
    milestones: trackMilestone(s.milestones, milestoneLabel, 1),
  };
}

export function serverMineStone(
  state:     GameState,
  action:    { type: "stone.mined"; index: number },
  createdAt: number = Date.now(),
): GameState {
  return serverMineOre(
    state, action, createdAt,
    "stones", "Stone", "mine_stone", "mine_stone",
    STONE_RECOVERY_SECONDS,
  );
}

export function serverMineIron(
  state:     GameState,
  action:    { type: "iron.mined"; index: number },
  createdAt: number = Date.now(),
): GameState {
  return serverMineOre(
    state, action, createdAt,
    "iron", "Iron", "mine_iron", "mine_iron",
    IRON_RECOVERY_SECONDS,
  );
}

export function serverMineGold(
  state:     GameState,
  action:    { type: "gold.mined"; index: number },
  createdAt: number = Date.now(),
): GameState {
  return serverMineOre(
    state, action, createdAt,
    "gold", "Gold", "mine_gold", "mine_gold",
    GOLD_RECOVERY_SECONDS,
  );
}

// ---------------------------------------------------------------------------
// §2.4-A  Server-side animal feed validators
// ---------------------------------------------------------------------------

export function serverFeedChicken(
  state:     GameState,
  action:    { type: "chicken.feed"; index: number },
  createdAt: number = Date.now(),
): GameState {
  const s = applyStaminaRegen(state, createdAt);

  const chickenCount = Number(s.inventory.Chicken ?? 0);
  if (action.index < 0 || action.index >= chickenCount) {
    throw new Error("Chicken does not exist");
  }

  const chicken  = s.chickens[action.index];
  const isRehungry =
    chicken?.fedAt !== undefined &&
    createdAt - chicken.fedAt >= ANIMALS_CONFIG.Chicken.produceTimeMs + ANIMALS_CONFIG.Chicken.reHungerDelayMs;
  if (chicken?.fedAt && !isRehungry) throw new Error("Chicken is not hungry");

  const wheat = new Decimal((s.inventory as Record<string, Decimal>).Wheat ?? 0);
  if (wheat.lt(1)) throw new Error("Not enough Wheat to feed chicken");

  return {
    ...s,
    inventory: { ...s.inventory, Wheat: wheat.sub(1) },
    chickens: {
      ...s.chickens,
      [action.index]: {
        fedAt: createdAt,
      },
    },
    milestones: trackMilestone(s.milestones, "Animal Fed", 1),
  };
}

export function serverFeedCow(
  state:     GameState,
  action:    { type: "cow.feed"; index: number },
  createdAt: number = Date.now(),
): GameState {
  const s = applyStaminaRegen(state, createdAt);

  const cow = s.cows[action.index];
  const isRehungry =
    cow?.fedAt !== undefined &&
    createdAt - cow.fedAt >= ANIMALS_CONFIG.Cow.produceTimeMs + ANIMALS_CONFIG.Cow.reHungerDelayMs;
  if (cow?.fedAt && !isRehungry) throw new Error("Cow is not hungry");

  const kale = new Decimal((s.inventory as Record<string, Decimal>).Kale ?? 0);
  if (kale.lt(1)) throw new Error("Not enough Kale to feed cow");

  return {
    ...s,
    inventory: { ...s.inventory, Kale: kale.sub(1) },
    cows: {
      ...s.cows,
      [action.index]: {
        fedAt: createdAt,
      },
    },
    milestones: trackMilestone(s.milestones, "Animal Fed", 1),
  };
}

export function serverFeedSheep(
  state:     GameState,
  action:    { type: "sheep.feed"; index: number },
  createdAt: number = Date.now(),
): GameState {
  const s = applyStaminaRegen(state, createdAt);

  const sheep = s.sheep[action.index];
  const isRehungry =
    sheep?.fedAt !== undefined &&
    createdAt - sheep.fedAt >= ANIMALS_CONFIG.Sheep.produceTimeMs + ANIMALS_CONFIG.Sheep.reHungerDelayMs;
  if (sheep?.fedAt && !isRehungry) throw new Error("Sheep is not hungry");

  const cabbage = new Decimal((s.inventory as Record<string, Decimal>).Cabbage ?? 0);
  if (cabbage.lt(1)) throw new Error("Not enough Cabbage to feed sheep");

  return {
    ...s,
    inventory: { ...s.inventory, Cabbage: cabbage.sub(1) },
    sheep: {
      ...s.sheep,
      [action.index]: {
        fedAt: createdAt,
      },
    },
    milestones: trackMilestone(s.milestones, "Animal Fed", 1),
  };
}

// ---------------------------------------------------------------------------
// §2.4-B  Server-side animal produce validators
// ---------------------------------------------------------------------------

export function serverCollectEgg(
  state:     GameState,
  action:    { type: "chicken.collectEgg"; index: number },
  createdAt: number = Date.now(),
): GameState {
  const s = applyStaminaRegen(state, createdAt);

  const chickenCount = Number(s.inventory.Chicken ?? 0);
  if (action.index < 0 || action.index >= chickenCount) {
    throw new Error("Chicken does not exist");
  }

  const chicken = s.chickens[action.index];
  if (!chicken?.fedAt) throw new Error("Chicken has not been fed");
  if (createdAt - chicken.fedAt < ANIMALS_CONFIG.Chicken.produceTimeMs) throw new Error("Egg is not ready yet");

  const draw      = s.draw ?? { ...INITIAL_DRAW };
  const eggAmount = rollDraw(draw.husbandryDraw);

  const currentEggs  = new Decimal((s.inventory as Record<string, Decimal>).Egg ?? 0);
  const newHusbXP    = (s.skills.husbandry ?? 0) + getSkillXP("collect_egg");
  const newSkills    = { ...s.skills, husbandry: newHusbXP };
  const oldLevel     = getSkillLevel(s.skills.husbandry ?? 0);
  const newLevel     = getSkillLevel(newHusbXP);
  const levelUp      = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw(newSkills) : draw;

  return {
    ...s,
    inventory: { ...s.inventory, Egg: currentEggs.add(eggAmount) },
    chickens:  { ...s.chickens, [action.index]: { fedAt: undefined } },
    skills:    newSkills,
    draw:      newDraw,
    milestones: trackMilestone(s.milestones, "Egg Collected", eggAmount),
  };
}

export function serverCollectMilk(
  state:     GameState,
  action:    { type: "cow.collectMilk"; index: number },
  createdAt: number = Date.now(),
): GameState {
  const s = applyStaminaRegen(state, createdAt);

  const cowCount = Number(s.inventory.Cow ?? 0);
  if (action.index < 0 || action.index >= cowCount) throw new Error("Cow does not exist");

  const cow = s.cows[action.index];
  if (!cow?.fedAt) throw new Error("Cow has not been fed");
  if (createdAt - cow.fedAt < ANIMALS_CONFIG.Cow.produceTimeMs) throw new Error("Milk is not ready yet");

  const draw       = s.draw ?? { ...INITIAL_DRAW };
  const milkAmount = rollDraw(draw.husbandryDraw);

  const currentMilk  = new Decimal((s.inventory as Record<string, Decimal>).Milk ?? 0);
  const newHusbXP    = (s.skills.husbandry ?? 0) + getSkillXP("collect_milk");
  const newSkills    = { ...s.skills, husbandry: newHusbXP };
  const oldLevel     = getSkillLevel(s.skills.husbandry ?? 0);
  const newLevel     = getSkillLevel(newHusbXP);
  const levelUp      = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw(newSkills) : draw;

  return {
    ...s,
    inventory: { ...s.inventory, Milk: currentMilk.add(milkAmount) },
    cows:      { ...s.cows, [action.index]: { fedAt: undefined } },
    skills:    newSkills,
    draw:      newDraw,
    milestones: trackMilestone(s.milestones, "Milk Collected", milkAmount),
  };
}

export function serverCollectWool(
  state:     GameState,
  action:    { type: "sheep.collectWool"; index: number },
  createdAt: number = Date.now(),
): GameState {
  const s = applyStaminaRegen(state, createdAt);

  const sheepCount = Number(s.inventory.Sheep ?? 0);
  if (action.index < 0 || action.index >= sheepCount) throw new Error("Sheep does not exist");

  const sheep = s.sheep[action.index];
  if (!sheep?.fedAt) throw new Error("Sheep has not been fed");
  if (createdAt - sheep.fedAt < ANIMALS_CONFIG.Sheep.produceTimeMs) throw new Error("Wool is not ready yet");

  const draw       = s.draw ?? { ...INITIAL_DRAW };
  const woolAmount = rollDraw(draw.husbandryDraw);

  const currentWool  = new Decimal((s.inventory as Record<string, Decimal>).Wool ?? 0);
  const newHusbXP    = (s.skills.husbandry ?? 0) + getSkillXP("collect_wool");
  const newSkills    = { ...s.skills, husbandry: newHusbXP };
  const oldLevel     = getSkillLevel(s.skills.husbandry ?? 0);
  const newLevel     = getSkillLevel(newHusbXP);
  const levelUp      = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw(newSkills) : draw;

  return {
    ...s,
    inventory: { ...s.inventory, Wool: currentWool.add(woolAmount) },
    sheep:     { ...s.sheep, [action.index]: { fedAt: undefined } },
    skills:    newSkills,
    draw:      newDraw,
    milestones: trackMilestone(s.milestones, "Wool Collected", woolAmount),
  };
}

// ---------------------------------------------------------------------------
// §2.4-C  Server-side fishing validator
// ---------------------------------------------------------------------------

export function serverCatchFish(
  state:     GameState,
  action:    { type: "fish.caught"; createdAt: number },
  _createdAt: number = Date.now(),
): GameState {
  const createdAt = action.createdAt;
  const s         = applyStaminaRegen(state, createdAt);

  if (!hasEnoughStamina(s.stamina.current, "fish_cast")) {
    throw new Error("Not enough stamina to fish");
  }

  if (createdAt - (s.fishing.lastCastAt ?? 0) < FISHING_BASE_COOLDOWN_MS) {
    throw new Error("Fishing is on cooldown");
  }

  const fishingXP    = s.skills.fishing ?? 0;
  const fishingLevel = getSkillLevel(fishingXP);

  const minRequired = Math.min(...FISH_TABLE.map((f) => f.minLevel));
  if (fishingLevel < minRequired) {
    throw new Error(`Requires Fishing Level ${minRequired} to fish`);
  }

  const caught = rollCatch(fishingLevel);

  const draw   = s.draw ?? { ...INITIAL_DRAW };
  const amount = rollDraw(draw.fishingDraw);

  const catchXP      = getFishXP(caught);
  const newFishingXP = fishingXP + catchXP;
  const oldLevel     = getSkillLevel(fishingXP);
  const newLevel     = getSkillLevel(newFishingXP);
  const levelUp      = newLevel > oldLevel;

  const newDraw  = levelUp ? computeDraw({ ...s.skills, fishing: newFishingXP }) : draw;

  const current = new Decimal((s.inventory as Record<string, Decimal>)[caught] ?? 0);

  return {
    ...s,
    inventory: { ...s.inventory, [caught]: current.add(amount) },
    skills:    { ...s.skills, fishing: newFishingXP },
    draw:      newDraw,
    stamina:   { ...s.stamina, current: deductStamina(s.stamina.current, "fish_cast") },
    fishing: {
      lastCastAt:     createdAt,
      lastCaughtFish: caught,
    },
    milestones: trackMilestone(
      trackMilestone(s.milestones, "Fish Caught", 1),
      `${caught} Caught` as MilestoneName,
      1,
    ),
  };
}

// ---------------------------------------------------------------------------
// §2.4-D (instant) — Cook food
// ---------------------------------------------------------------------------

export function serverCookFood(
  state: GameState,
  action: CookFoodAction,
  _createdAt: number,
): GameState {
  const s = applyStaminaRegen(state, _createdAt);
  const { food, amount = 1 } = action;
  const recipe = FOODS()[food as Food];

  if (!recipe) throw new Error(`Unknown food: ${food}`);
  if (amount < 1 || !Number.isInteger(amount)) throw new Error("Amount must be a positive integer.");

  let inventory = { ...s.inventory };

  for (const { item, amount: needed } of recipe.ingredients) {
    const have = inventory[item] ?? new Decimal(0);
    const total = needed.mul(amount);
    if (have.lessThan(total)) {
      throw new Error(`Not enough ${item}. Need ${total}, have ${have}.`);
    }
    inventory[item] = have.minus(total);
  }

  const currentFood = inventory[food] ?? new Decimal(0);
  inventory[food] = currentFood.plus(amount);

  let milestones = trackMilestone(s.milestones, "Food Cooked", amount);
  milestones = trackMilestone(milestones, `${food} Cooked` as MilestoneName, amount);

  return {
    ...s,
    inventory,
    milestones,
  };
}
