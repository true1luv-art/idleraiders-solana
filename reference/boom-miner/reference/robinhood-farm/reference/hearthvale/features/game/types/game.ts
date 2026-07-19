import { GameEvent } from "../events";

import { CropName, SeedName } from "./crops";
import { CraftableName, Food } from "./craftables";
import { ResourceName } from "./resources";
import { FishName } from "./fish";
import { PlayerSkills, SkillBonus } from "./skills";
import { PlayerEquipment, EquipmentAttributes } from "./equipment";
import { Activity, AchievementName } from "./achievements";

export type Reward = {
  items: {
    name: InventoryItemName;
    amount: number;
  }[];
};

/**
 * Unified node type for all resource and farming plots.
 *
 * Fields use:   name (CropName), plantedAt, amount
 * Trees use:    name "Wood",     choppedAt, amount
 * Rocks use:    name "Stone" | "Iron" | "Gold", minedAt, amount
 */
export type GameNode = {
  name: CropName | "Wood" | "Stone" | "Iron" | "Gold";
  // Epoch time in milliseconds — each node type uses the relevant timestamp
  plantedAt?: number;  // fields
  choppedAt?: number;  // trees
  minedAt?:   number;  // stones / iron / gold
  amount:     number;  // base yield
  reward?:    Reward;  // optional bonus drop (fields only)
};

export type ChickenState = {
  // Epoch time in milliseconds when the chicken was fed
  fedAt?: number;
  // Multiplier for egg production (default 1)
  multiplier: number;
};

export type CowState = {
  // Epoch time in milliseconds when the cow was fed
  fedAt?: number;
  multiplier: number;
};

export type SheepState = {
  // Epoch time in milliseconds when the sheep was fed
  fedAt?: number;
  multiplier: number;
};

export type ChickenPosition = {
  top: number;
  right: number;
};

export type FishingState = {
  /** Epoch ms of the last successful cast — used for cooldown check. */
  lastCastAt: number;
  /** Fish caught in the most recent cast — read by Game.tsx for the result modal. */
  lastCaughtFish: FishName | null;
  /** Amount caught in the most recent cast. */
  lastCaughtAmount: number;
  /** Lifetime cast counter — for achievements. */
  totalCasts: number;
  /** Lifetime catch counter — for achievements. */
  totalCaught: number;
};

export type InventoryItemName =
  | CropName
  | SeedName
  | CraftableName
  | ResourceName
  | FishName;

export type Inventory = Partial<Record<InventoryItemName, Decimal>>;

export type Stamina = {
  current: number;
  max: number;
};

/**
 * The kitchen's single cooking slot.
 * Ingredients are deducted when cooking starts; the food item is added to
 * inventory only after `collectCooked` is dispatched once the timer expires.
 */
export type CookingSlot = {
  /** The food being cooked. */
  item: Food;
  /** Epoch ms when cooking was started. */
  startedAt: number;
  /** Effective cook duration in seconds (base cookTime × speed bonus reduction). */
  duration: number;
} | null;

type PastAction = GameEvent & {
  createdAt: Date;
};

export type GameState = {
  id?: number;
  username?: string;
  avatarUrl?: string;
  /**
   * In-game currency (coins). 1:1 with VTC token on Hive Engine.
   * VTC is the placeholder test token for blockchain integration.
   */
  balance: Decimal;
  fields: Record<number, GameNode>;

  trees: Record<number, GameNode>;
  stones: Record<number, GameNode>;
  iron: Record<number, GameNode>;
  gold: Record<number, GameNode>;
  chickens: Record<number, ChickenState>;
  cows: Record<number, CowState>;
  sheep: Record<number, SheepState>;

  inventory: Inventory;

  farmAddress?: string;

  /**
   * Equipped gear: avatar, weapon, armor, mount, accessory.
   * Each slot tracks the item reference, equipped state, and combat/utility attributes.
   */
  equipment: PlayerEquipment;

  /**
   * Root base stats — the player's intrinsic values before any gear is applied.
   * These are modified by levelling up, quests, or permanent bonuses.
   */
  baseStats: EquipmentAttributes;

  /**
   * Derived stats — computed as baseStats + sum of all equipped slot attributes.
   * Re-computed whenever equipment changes. Never store manual values here.
   */
  stats: EquipmentAttributes;

  /**
   * Per-skill XP: farming, forestry, mining, fishing, cooking, combat, husbandry.
   * Each skill levels independently (1–100) using the XP curve in lib/skills.ts.
   */
  skills: PlayerSkills;

  /**
   * Passive bonuses derived from skill levels. Recomputed by computeBonus()
   * whenever a skill crosses a multiple-of-10 level threshold and stored here
   * so event handlers can read them cheaply without recomputing each call.
   */
  bonus: SkillBonus;

  /**
   * Stamina system — limits farming and gathering actions.
   * Max stamina is fixed at 100.
   */
  stamina: Stamina;
  lastStaminaRegenAt: number; // timestamp in milliseconds

  /**
   * Fishing state — cooldown tracking, last catch, and lifetime counters.
   */
  fishing: FishingState;

  /**
   * The kitchen's single cooking slot.
   * null = kitchen is free. Non-null = food is being cooked.
   */
  cooking: CookingSlot;

  /**
   * Activity tracking for achievements
   * Records counts of various player actions
   */
  activity: Activity;

  /**
   * Claimed achievements with timestamps
   */
  achievements: Partial<Record<AchievementName, number>>;
};

export interface Context {
  state?: GameState;
  actions: PastAction[];
}
