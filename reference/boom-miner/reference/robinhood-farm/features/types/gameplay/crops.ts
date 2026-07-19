import Decimal from "decimal.js-light";
import { CROPS_CONFIG } from "@/features/game/crops";
import { Craftable } from "@/features/types/gameplay/craftables";

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

export type Crop = {
  buyPrice: Decimal;
  sellPrice: Decimal;
  harvestSeconds: number;
  name: CropName;
  description: string;
};

/** Client-side crop definitions with flat base prices. */
export const CROPS: () => Record<CropName, Crop> = () => ({
  Potato: {
    buyPrice: new Decimal(2.5),
    sellPrice: new Decimal(4),
    harvestSeconds: 60,
    name: "Potato",
    description: "Starchy and filling.",
  },
  Carrot: {
    buyPrice: new Decimal(6),
    sellPrice: new Decimal(10),
    harvestSeconds: 5 * 60,
    name: "Carrot",
    description: "Crunchy and sweet.",
  },
  Cabbage: {
    buyPrice: new Decimal(12),
    sellPrice: new Decimal(18),
    harvestSeconds: 10 * 60,
    name: "Cabbage",
    description: "Leafy and fresh.",
  },
  Pumpkin: {
    buyPrice: new Decimal(25),
    sellPrice: new Decimal(40),
    harvestSeconds: 30 * 60,
    name: "Pumpkin",
    description: "Big and orange.",
  },
  Beetroot: {
    buyPrice: new Decimal(45),
    sellPrice: new Decimal(80),
    harvestSeconds: 60 * 60,
    name: "Beetroot",
    description: "Sweet and earthy.",
  },
  Parsnip: {
    buyPrice: new Decimal(80),
    sellPrice: new Decimal(150),
    harvestSeconds: 2 * 60 * 60,
    name: "Parsnip",
    description: "Pale and sweet.",
  },
  Radish: {
    buyPrice: new Decimal(120),
    sellPrice: new Decimal(250),
    harvestSeconds: 3 * 60 * 60,
    name: "Radish",
    description: "Peppery crunch.",
  },
  Cauliflower: {
    buyPrice: new Decimal(180),
    sellPrice: new Decimal(440),
    harvestSeconds: 6 * 60 * 60,
    name: "Cauliflower",
    description: "White and fluffy.",
  },
  Wheat: {
    buyPrice: new Decimal(260),
    sellPrice: new Decimal(700),
    harvestSeconds: 12 * 60 * 60,
    name: "Wheat",
    description: "Golden grain.",
  },
  Kale: {
    buyPrice: new Decimal(400),
    sellPrice: new Decimal(1125),
    harvestSeconds: 24 * 60 * 60,
    name: "Kale",
    description: "Super greens.",
  },
});

export type SeedName = `${CropName} Seed`;

/** Client-side seed definitions with flat base prices. */
export const SEEDS: () => Record<SeedName, Craftable> = () => ({
  "Potato Seed": {
    name: "Potato Seed",
    price: new Decimal(2.5),
    ingredients: [],
    description: "Grows in 1 min.",
    levelRequirement: CROPS_CONFIG.Potato.farmingLevelRequired,
  },
  "Carrot Seed": {
    name: "Carrot Seed",
    price: new Decimal(6),
    ingredients: [],
    description: "Grows in 5 min.",
    levelRequirement: CROPS_CONFIG.Carrot.farmingLevelRequired,
  },
  "Cabbage Seed": {
    name: "Cabbage Seed",
    price: new Decimal(12),
    ingredients: [],
    description: "Grows in 10 min.",
    levelRequirement: CROPS_CONFIG.Cabbage.farmingLevelRequired,
  },
  "Pumpkin Seed": {
    name: "Pumpkin Seed",
    price: new Decimal(25),
    ingredients: [],
    description: "Grows in 30 min.",
    levelRequirement: CROPS_CONFIG.Pumpkin.farmingLevelRequired,
  },
  "Beetroot Seed": {
    name: "Beetroot Seed",
    price: new Decimal(45),
    ingredients: [],
    description: "Grows in 1 hour.",
    levelRequirement: CROPS_CONFIG.Beetroot.farmingLevelRequired,
  },
  "Parsnip Seed": {
    name: "Parsnip Seed",
    price: new Decimal(80),
    ingredients: [],
    description: "Grows in 2 hours.",
    levelRequirement: CROPS_CONFIG.Parsnip.farmingLevelRequired,
  },
  "Radish Seed": {
    name: "Radish Seed",
    price: new Decimal(120),
    ingredients: [],
    description: "Grows in 3 hours.",
    levelRequirement: CROPS_CONFIG.Radish.farmingLevelRequired,
  },
  "Cauliflower Seed": {
    name: "Cauliflower Seed",
    price: new Decimal(180),
    ingredients: [],
    description: "Grows in 6 hours.",
    levelRequirement: CROPS_CONFIG.Cauliflower.farmingLevelRequired,
  },
  "Wheat Seed": {
    name: "Wheat Seed",
    price: new Decimal(260),
    ingredients: [],
    description: "Grows in 12 hours.",
    levelRequirement: CROPS_CONFIG.Wheat.farmingLevelRequired,
  },
  "Kale Seed": {
    name: "Kale Seed",
    price: new Decimal(400),
    ingredients: [],
    description: "Grows in 24 hours.",
    levelRequirement: CROPS_CONFIG.Kale.farmingLevelRequired,
  },
});
