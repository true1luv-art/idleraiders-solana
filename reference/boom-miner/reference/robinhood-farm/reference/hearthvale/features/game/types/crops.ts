import Decimal from "decimal.js-light";
import { Craftable } from "./craftables";

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

/**
 * Crops and their prices.
 *
 * Buy/sell prices are raw `Decimal` values — edit these directly to
 * rebalance the economy. There is no multiplier applied; the value
 * shown here is the value the player pays/receives.
 */
export const CROPS: () => Record<CropName, Crop> = () => ({
  Potato: {
    buyPrice: new Decimal(0.05),
    sellPrice: new Decimal(0.065),
    harvestSeconds: 60,
    name: "Potato",
    description: "Starchy and filling.",
  },
  Carrot: {
    buyPrice: new Decimal(0.125),
    sellPrice: new Decimal(0.175),
    harvestSeconds: 5 * 60,
    name: "Carrot",
    description: "Crunchy and sweet.",
  },
  Cabbage: {
    buyPrice: new Decimal(0.25),
    sellPrice: new Decimal(0.375),
    harvestSeconds: 10 * 60,
    name: "Cabbage",
    description: "Leafy and fresh.",
  },
  Pumpkin: {
    buyPrice: new Decimal(0.5),
    sellPrice: new Decimal(0.8),
    harvestSeconds: 30 * 60,
    name: "Pumpkin",
    description: "Big and orange.",
  },
  Beetroot: {
    buyPrice: new Decimal(0.875),
    sellPrice: new Decimal(1.575),
    harvestSeconds: 60 * 60,
    name: "Beetroot",
    description: "Sweet and earthy.",
  },
  Parsnip: {
    buyPrice: new Decimal(1.5),
    sellPrice: new Decimal(3),
    harvestSeconds: 2 * 60 * 60,
    name: "Parsnip",
    description: "Pale and sweet.",
  },
  Radish: {
    buyPrice: new Decimal(2.25),
    sellPrice: new Decimal(4.95),
    harvestSeconds: 3 * 60 * 60,
    name: "Radish",
    description: "Peppery crunch.",
  },
  Cauliflower: {
    buyPrice: new Decimal(3.5),
    sellPrice: new Decimal(8.75),
    harvestSeconds: 6 * 60 * 60,
    name: "Cauliflower",
    description: "White and fluffy.",
  },
  Wheat: {
    buyPrice: new Decimal(5),
    sellPrice: new Decimal(14),
    harvestSeconds: 12 * 60 * 60,
    name: "Wheat",
    description: "Golden grain.",
  },
  Kale: {
    buyPrice: new Decimal(7.5),
    sellPrice: new Decimal(22.5),
    harvestSeconds: 24 * 60 * 60,
    name: "Kale",
    description: "Super greens.",
  },
});

export type SeedName = `${CropName} Seed`;

export const SEEDS: () => Record<SeedName, Craftable> = () => ({
  // Tier 1: Starter crops (Level 0)
  "Potato Seed": {
    name: "Potato Seed",
    price: new Decimal(0.05),
    ingredients: [],
    description: "Grows in 1 min.",
    levelRequirement: 0,
  },
  "Carrot Seed": {
    name: "Carrot Seed",
    price: new Decimal(0.125),
    ingredients: [],
    description: "Grows in 5 min.",
    levelRequirement: 0,
  },
  "Cabbage Seed": {
    name: "Cabbage Seed",
    price: new Decimal(0.25),
    ingredients: [],
    description: "Grows in 10 min.",
    levelRequirement: 0,
  },
  "Pumpkin Seed": {
    name: "Pumpkin Seed",
    price: new Decimal(0.5),
    ingredients: [],
    description: "Grows in 30 min.",
    levelRequirement: 0,
  },
  // Tier 2: Level 5 crops
  "Beetroot Seed": {
    name: "Beetroot Seed",
    price: new Decimal(0.875),
    ingredients: [],
    description: "Grows in 1 hour.",
    levelRequirement: 5,
  },
  "Parsnip Seed": {
    name: "Parsnip Seed",
    price: new Decimal(1.5),
    ingredients: [],
    description: "Grows in 2 hours.",
    levelRequirement: 5,
  },
  "Radish Seed": {
    name: "Radish Seed",
    price: new Decimal(2.25),
    ingredients: [],
    description: "Grows in 3 hours.",
    levelRequirement: 5,
  },
  // Tier 3: Level 10 crops
  "Cauliflower Seed": {
    name: "Cauliflower Seed",
    price: new Decimal(3.5),
    ingredients: [],
    description: "Grows in 6 hours.",
    levelRequirement: 10,
  },
  "Wheat Seed": {
    name: "Wheat Seed",
    price: new Decimal(5),
    ingredients: [],
    description: "Grows in 12 hours.",
    levelRequirement: 10,
  },
  "Kale Seed": {
    name: "Kale Seed",
    price: new Decimal(7.5),
    ingredients: [],
    description: "Grows in 24 hours.",
    levelRequirement: 10,
  },
});
