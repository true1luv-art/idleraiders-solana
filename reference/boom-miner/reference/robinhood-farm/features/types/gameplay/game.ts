import Decimal from "decimal.js-light";
import type { GameEvent } from "@/features/events";
import { CropName, SeedName } from "@/features/types/gameplay/crops";
import { CraftableName, Food } from "@/features/types/gameplay/craftables";
import { ResourceName } from "@/features/types/gameplay/resources";
import { FishName } from "@/features/types/gameplay/fish";
import { PlayerSkills, SkillDraw } from "@/features/types/gameplay/skills";
import { Milestones } from "@/features/types/gameplay/milestones";
export type Reward = {
  items: { name: InventoryItemName; amount: number }[];
};

export type GameNode = {
  name: CropName | "Wood" | "Stone" | "Iron" | "Gold";
  plantedAt?: number;
  choppedAt?: number;
  minedAt?:   number;
  reward?:    Reward;
};

export type ChickenState = {
  fedAt?: number;
};

export type CowState = {
  fedAt?: number;
};

export type SheepState = {
  fedAt?: number;
};


export type FishingState = {
  lastCastAt:     number;
  lastCaughtFish: FishName | null;
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

type PastAction = GameEvent & { createdAt: Date };

export type GameState = {
  id?: number;
  username?: string;
  avatarUrl?: string;
  farmAddress?: string;
  balance: Decimal;
  fields:   Record<number, GameNode>;
  trees:    Record<number, GameNode>;
  stones:   Record<number, GameNode>;
  iron:     Record<number, GameNode>;
  gold:     Record<number, GameNode>;
  chickens: Record<number, ChickenState>;
  cows:     Record<number, CowState>;
  sheep:    Record<number, SheepState>;
  inventory: Inventory;
  skills: PlayerSkills;
  draw:   SkillDraw;
  stamina: Stamina;
  lastStaminaRegenAt: number;
  fishing: FishingState;
  milestones: Milestones;
};

export interface Context {
  state?: GameState;
  actions: PastAction[];
}
