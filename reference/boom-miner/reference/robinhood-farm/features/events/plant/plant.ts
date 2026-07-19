import Decimal from "decimal.js-light";
import { screenTracker } from "@/features/utils/screen";
import { CropName, CROPS, SEEDS, SeedName } from "@/features/types/gameplay/crops";
import { GameState, Inventory, InventoryItemName } from "@/features/types/gameplay/game";
import { isFieldUnlocked, getFieldLevelRequirement } from "@/features/game/fields";
import { getSkillLevel } from "@/features/game/skills";

import { trackMilestone } from "@/features/game/milestones";

export type PlantAction = {
  type: "item.planted";
  item?: InventoryItemName;
  index: number;
};

const VALID_SEEDS: InventoryItemName[] = [
  "Potato Seed", "Carrot Seed", "Cabbage Seed", "Pumpkin Seed",
  "Beetroot Seed", "Parsnip Seed", "Radish Seed", "Cauliflower Seed",
  "Wheat Seed", "Kale Seed",
];

export function isSeed(crop: InventoryItemName): crop is SeedName {
  return VALID_SEEDS.includes(crop);
}

export const getCropTime = (crop: CropName, _inventory: Inventory) => CROPS()[crop].harvestSeconds;

type Options = { state: GameState; action: PlantAction; createdAt?: number };

export function plant({ state, action, createdAt = Date.now() }: Options): GameState {
  const fields = { ...state.fields };
  if (action.index < 0 || !Number.isInteger(action.index) || action.index > 29) throw new Error("Field does not exist");

  const farmingLevel = getSkillLevel(state.skills.farming);
  if (!isFieldUnlocked(action.index, farmingLevel)) {
    throw new Error(`Field requires Farming Level ${getFieldLevelRequirement(action.index)}`);
  }
  if (fields[action.index]) throw new Error("Crop is already planted");
  if (!action.item)         throw new Error("No seed selected");
  if (!isSeed(action.item)) throw new Error("Not a seed");

  const seedCount = new Decimal(state.inventory[action.item] || 0);
  if (seedCount.lessThan(1)) throw new Error("Not enough seeds");
  if (!screenTracker.calculate()) throw new Error("Invalid plant");

  const crop = action.item.split(" ")[0] as CropName;
  const seedLevelRequirement = SEEDS()[action.item].levelRequirement ?? 0;
  if (farmingLevel < seedLevelRequirement) {
    throw new Error(`Seed requires Farming Level ${seedLevelRequirement}`);
  }

  return {
    ...state,
    inventory: { ...state.inventory, [action.item]: seedCount.sub(1) },
    fields: {
      ...fields,
      [action.index]: {
        name:      crop,
        plantedAt: createdAt,
        amount:    1,
      },
    },
    milestones: trackMilestone(state.milestones, "Seed Planted", 1),
  } as GameState;
}
