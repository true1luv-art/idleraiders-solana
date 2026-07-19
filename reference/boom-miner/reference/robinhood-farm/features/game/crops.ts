/**
 * shared/game/crops.ts
 *
 * Isomorphic crop and seed definitions. §2.1-E
 */

export type CropName =
  | "Potato"
  | "Carrot"
  | "Cabbage"
  | "Pumpkin"
  | "Beetroot"
  | "Parsnip"
  | "Radish"
  | "Cauliflower"
  | "Wheat"
  | "Kale";

export type SeedName = `${CropName} Seed`;

export interface CropConfig {
  name: CropName;
  /** Growth time in seconds. */
  harvestSeconds: number;
  /** Seed buy price in coins. */
  buyPrice: number;
  /** Sell price in coins when selling directly to the game. */
  sellPrice: number;
  /** Minimum farming skill level required to plant this crop. */
  farmingLevelRequired: number;
  description: string;
}

export const CROPS_CONFIG: Record<CropName, CropConfig> = {
  Potato: {
    name: "Potato",
    harvestSeconds: 60,
    buyPrice: 0.05,
    sellPrice: 0.065,
    farmingLevelRequired: 0,
    description: "Starchy and filling.",
  },
  Carrot: {
    name: "Carrot",
    harvestSeconds: 5 * 60,
    buyPrice: 0.125,
    sellPrice: 0.175,
    farmingLevelRequired: 1,
    description: "Crunchy and sweet.",
  },
  Cabbage: {
    name: "Cabbage",
    harvestSeconds: 10 * 60,
    buyPrice: 0.25,
    sellPrice: 0.375,
    farmingLevelRequired: 2,
    description: "Leafy and fresh.",
  },
  Pumpkin: {
    name: "Pumpkin",
    harvestSeconds: 30 * 60,
    buyPrice: 0.5,
    sellPrice: 0.8,
    farmingLevelRequired: 3,
    description: "Big and orange.",
  },
  Beetroot: {
    name: "Beetroot",
    harvestSeconds: 60 * 60,
    buyPrice: 0.875,
    sellPrice: 1.575,
    farmingLevelRequired: 5,
    description: "Sweet and earthy.",
  },
  Parsnip: {
    name: "Parsnip",
    harvestSeconds: 2 * 60 * 60,
    buyPrice: 1.5,
    sellPrice: 3,
    farmingLevelRequired: 6,
    description: "Pale and sweet.",
  },
  Radish: {
    name: "Radish",
    harvestSeconds: 3 * 60 * 60,
    buyPrice: 2.25,
    sellPrice: 4.95,
    farmingLevelRequired: 8,
    description: "Peppery crunch.",
  },
  Cauliflower: {
    name: "Cauliflower",
    harvestSeconds: 6 * 60 * 60,
    buyPrice: 3.5,
    sellPrice: 8.75,
    farmingLevelRequired: 10,
    description: "White and fluffy.",
  },
  Wheat: {
    name: "Wheat",
    harvestSeconds: 12 * 60 * 60,
    buyPrice: 5,
    sellPrice: 14,
    farmingLevelRequired: 12,
    description: "Golden grain.",
  },
  Kale: {
    name: "Kale",
    harvestSeconds: 24 * 60 * 60,
    buyPrice: 7.5,
    sellPrice: 22.5,
    farmingLevelRequired: 15,
    description: "Super greens.",
  },
};
