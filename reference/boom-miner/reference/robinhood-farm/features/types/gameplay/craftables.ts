import Decimal from "decimal.js-light";
import { SeedName, SEEDS } from "@/features/types/gameplay/crops";
import { InventoryItemName } from "@/features/types/gameplay/game";

/**
 * Action dispatched when the player buys a seed or animal from the shop.
 * Renamed from CraftAction since there is no player-crafting system.
 */
export type PurchaseAction = {
  type: "item.crafted";
  item: InventoryItemName;
  amount: number;
};

/** @deprecated Use PurchaseAction instead */
export type CraftAction = PurchaseAction;

/**
 * Returns the effective buy price of a purchasable item.
 * Accepts an optional inventory argument (reserved for future boost lookups).
 */
export function getBuyPrice(item: { price?: Decimal }, _inventory?: unknown): Decimal {
  return item.price ?? new Decimal(0);
}

export type CraftableName = SeedName | Food | Animal;

export type Craftable = {
  name: CraftableName;
  description: string;
  price?: Decimal;
  sellPrice?: Decimal;
  ingredients: { item: InventoryItemName; amount: Decimal }[];
  limit?: number;
  supply?: number;
  disabled?: boolean;
  levelRequirement?: number;
};

export type Food =
  | "Roasted Potato"
  | "Carrot Stew"
  | "Cabbage Roll"
  | "Pumpkin Soup"
  | "Beetroot Salad"
  | "Parsnip Porridge"
  | "Radish Skewers"
  | "Cauliflower Sandwich"
  | "Wheat Bread"
  | "Kale Stir-fry";

export type Animal = "Chicken" | "Cow" | "Sheep";

/** Cooking recipes consume crops only. */
export const FOODS: () => Record<Food, Craftable> = () => ({
  "Roasted Potato": {
    name: "Roasted Potato", description: "Warm and crispy.", sellPrice: new Decimal(13),
    ingredients: [{ item: "Potato", amount: new Decimal(2) }],
  },
  "Carrot Stew": {
    name: "Carrot Stew", description: "Hearty and filling.", sellPrice: new Decimal(48),
    ingredients: [{ item: "Carrot", amount: new Decimal(3) }],
  },
  "Cabbage Roll": {
    name: "Cabbage Roll", description: "Savory wrapped delight.", sellPrice: new Decimal(72),
    ingredients: [{ item: "Cabbage", amount: new Decimal(2) }, { item: "Carrot", amount: new Decimal(1) }],
  },
  "Pumpkin Soup": {
    name: "Pumpkin Soup", description: "Creamy autumn flavor.", sellPrice: new Decimal(210),
    ingredients: [{ item: "Pumpkin", amount: new Decimal(3) }, { item: "Cabbage", amount: new Decimal(1) }],
  },
  "Beetroot Salad": {
    name: "Beetroot Salad", description: "Fresh and tangy.", sellPrice: new Decimal(430),
    ingredients: [{ item: "Beetroot", amount: new Decimal(3) }, { item: "Pumpkin", amount: new Decimal(1) }],
  },
  "Parsnip Porridge": {
    name: "Parsnip Porridge", description: "Warm and creamy.", sellPrice: new Decimal(950),
    ingredients: [{ item: "Parsnip", amount: new Decimal(3) }, { item: "Beetroot", amount: new Decimal(2) }],
  },
  "Radish Skewers": {
    name: "Radish Skewers", description: "Crispy and seasoned.", sellPrice: new Decimal(1800),
    ingredients: [{ item: "Radish", amount: new Decimal(4) }, { item: "Parsnip", amount: new Decimal(1) }],
  },
  "Cauliflower Sandwich": {
    name: "Cauliflower Sandwich", description: "Hearty veggie bite.", sellPrice: new Decimal(3500),
    ingredients: [{ item: "Cauliflower", amount: new Decimal(4) }, { item: "Radish", amount: new Decimal(2) }],
  },
  "Wheat Bread": {
    name: "Wheat Bread", description: "Fresh baked loaf.", sellPrice: new Decimal(6800),
    ingredients: [{ item: "Wheat", amount: new Decimal(5) }, { item: "Cauliflower", amount: new Decimal(2) }],
  },
  "Kale Stir-fry": {
    name: "Kale Stir-fry", description: "Savory greens dish.", sellPrice: new Decimal(12000),
    ingredients: [{ item: "Kale", amount: new Decimal(5) }, { item: "Wheat", amount: new Decimal(3) }],
  },
});

/**
 * FOOD_STAMINA_RESTORE — stamina restored per unit when a food is eaten.
 * Tiered 5 → 50 (+5 per recipe tier) so higher-tier (costlier, slower) foods
 * are more rewarding to consume. Max player stamina is 100 (STAMINA_CONFIG.max),
 * so a full stack of Kale Stir-fry can top a player off in two bites.
 */
export const FOOD_STAMINA_RESTORE: Record<Food, number> = {
  "Roasted Potato":       5,
  "Carrot Stew":          10,
  "Cabbage Roll":         15,
  "Pumpkin Soup":         20,
  "Beetroot Salad":       25,
  "Parsnip Porridge":     30,
  "Radish Skewers":       35,
  "Cauliflower Sandwich": 40,
  "Wheat Bread":          45,
  "Kale Stir-fry":        50,
};

export const ANIMALS: Record<Animal, Craftable> = {
  Chicken: { name: "Chicken", description: "Produces eggs. Eats Wheat.", price: new Decimal(5), ingredients: [], levelRequirement: 3 },
  Cow: { name: "Cow", description: "Produces milk. Eats Kale.", price: new Decimal(50), ingredients: [], levelRequirement: 6 },
  Sheep: { name: "Sheep", description: "Produces wool. Eats Cabbage.", price: new Decimal(30), ingredients: [], levelRequirement: 8 },
};

export const CRAFTABLES: () => Record<CraftableName, Craftable> = () => ({
  ...SEEDS(),
  ...FOODS(),
  ...ANIMALS,
});
