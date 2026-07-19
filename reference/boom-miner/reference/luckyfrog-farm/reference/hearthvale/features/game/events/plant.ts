import Decimal from "decimal.js-light";
import { screenTracker } from "lib/utils/screen";
import { CropName, CROPS, SeedName } from "../types/crops";
import { GameState, Inventory, InventoryItemName } from "../types/game";
import { isFieldUnlocked, getFieldLevelRequirement } from "../lib/experience";
import { getSkillLevel } from "../lib/skills";
import { getCropSpeedMultiplier } from "../lib/boosts";

export type PlantAction = {
  type: "item.planted";
  item?: InventoryItemName;
  index: number;
};

const VALID_SEEDS: InventoryItemName[] = [
  "Potato Seed",
  "Carrot Seed",
  "Cabbage Seed",
  "Pumpkin Seed",
  "Beetroot Seed",
  "Parsnip Seed",
  "Radish Seed",
  "Cauliflower Seed",
  "Wheat Seed",
  "Kale Seed",
];

export function isSeed(crop: InventoryItemName): crop is SeedName {
  return VALID_SEEDS.includes(crop);
}

type Options = {
  state: GameState;
  action: PlantAction;
  createdAt?: number;
};

/**
 * How long a crop takes to grow, reduced by the farming skill speed bonus.
 */
export const getCropTime = (crop: CropName, _inventory: Inventory, state?: GameState) => {
  let seconds = CROPS()[crop].harvestSeconds;

  if (state?.bonus) {
    seconds = seconds * getCropSpeedMultiplier(state.bonus);
  }

  return seconds;
};

type GetPlantedAtArgs = {
  crop: CropName;
  state: GameState;
  createdAt: number;
};

function getPlantedAt({ crop, state, createdAt }: GetPlantedAtArgs): number {
  const cropTime   = CROPS()[crop].harvestSeconds;
  const boostedTime = getCropTime(crop, state.inventory, state);
  const offset     = cropTime - boostedTime;
  return createdAt - offset * 1000;
}

export function plant({ state, action, createdAt = Date.now() }: Options) {
  const fields = { ...state.fields };

  if (action.index < 0)        throw new Error("Field does not exist");
  if (!Number.isInteger(action.index)) throw new Error("Field does not exist");
  if (action.index > 29)       throw new Error("Field does not exist");

  // Plot gating — driven by Farming skill level
  const farmingLevel = getSkillLevel(state.skills.farming);
  if (!isFieldUnlocked(action.index, farmingLevel)) {
    const requiredLevel = getFieldLevelRequirement(action.index);
    throw new Error(`Field requires Farming Level ${requiredLevel}`);
  }

  if (fields[action.index])   throw new Error("Crop is already planted");
  if (!action.item)           throw new Error("No seed selected");
  if (!isSeed(action.item))   throw new Error("Not a seed");

  const seedCount = new Decimal(state.inventory[action.item] || 0);
  if (seedCount.lessThan(1))  throw new Error("Not enough seeds");
  if (!screenTracker.calculate()) throw new Error("Invalid plant");

  const crop = action.item.split(" ")[0] as CropName;

  return {
    ...state,
    inventory: {
      ...state.inventory,
      [action.item]: seedCount.sub(1),
    },
    fields: {
      ...fields,
      [action.index]: {
        name: crop,
        plantedAt: getPlantedAt({ crop, state, createdAt }),
        amount: 1,
      },
    },
  } as GameState;
}
