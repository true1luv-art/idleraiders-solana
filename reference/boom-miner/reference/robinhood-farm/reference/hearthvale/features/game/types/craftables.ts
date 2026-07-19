import Decimal from "decimal.js-light";
import { SeedName, SEEDS } from "./crops";
import { InventoryItemName } from "./game";

export type CraftAction = {
  type: "item.crafted";
  item: InventoryItemName;
  amount: number;
};

export type CraftableName = SeedName | Food | Animal | WorkshopResource;

export type Craftable = {
  name: CraftableName;
  description: string;
  price?: Decimal;
  sellPrice?: Decimal;
  ingredients: {
    item: InventoryItemName;
    amount: Decimal;
  }[];
  limit?: number;
  supply?: number;
  disabled?: boolean;
  /**
   * Level requirement to unlock this item (unified player level)
   */
  levelRequirement?: number;
  /**
   * Base cook time in seconds. Only present on food items.
   * Actual duration is reduced by the cookingSpeed bonus.
   */
  cookTime?: number;
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

/**
 * Workshop resources - consolidated from Lumberyard and Foundry
 * Wood processing: Firewood (fuel)
 * Smelting: Brick, Iron Bar, Gold Bar
 */
export type WorkshopResource = "Firewood" | "Brick" | "Iron Bar" | "Gold Bar";

/**
 * Workshop resources - consolidated from Lumberyard and Foundry
 * Firewood replaces Coal as the fuel source
 */
export const WORKSHOP_RESOURCES: () => Record<
  WorkshopResource,
  Craftable
> = () => ({
  Firewood: {
    name: "Firewood",
    description: "Fuel for cooking and crafting. Made from wood.",
    price: new Decimal(0),
    ingredients: [
      {
        item: "Wood",
        amount: new Decimal(2),
      },
    ],
  },
  Brick: {
    name: "Brick",
    description: "Fired stone. Used for building walls and structures.",
    price: new Decimal(0),
    ingredients: [
      {
        item: "Stone",
        amount: new Decimal(2),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Iron Bar": {
    name: "Iron Bar",
    description: "Smelted iron. Used for tools and equipment.",
    price: new Decimal(0),
    ingredients: [
      {
        item: "Iron",
        amount: new Decimal(2),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Gold Bar": {
    name: "Gold Bar",
    description: "Refined gold. Used for advanced crafting and trade.",
    price: new Decimal(0),
    ingredients: [
      {
        item: "Gold",
        amount: new Decimal(2),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
});

export const FOODS: () => Record<Food, Craftable> = () => ({
  "Roasted Potato": {
    name: "Roasted Potato",
    description: "Warm and crispy.",
    sellPrice: new Decimal(0.09),
    cookTime: 30,
    ingredients: [
      {
        item: "Potato",
        amount: new Decimal(2),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Carrot Stew": {
    name: "Carrot Stew",
    description: "Hearty and filling.",
    sellPrice: new Decimal(0.45),
    cookTime: 60,
    ingredients: [
      {
        item: "Carrot",
        amount: new Decimal(3),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Cabbage Roll": {
    name: "Cabbage Roll",
    description: "Savory wrapped delight.",
    sellPrice: new Decimal(0.9),
    cookTime: 90,
    ingredients: [
      {
        item: "Cabbage",
        amount: new Decimal(2),
      },
      {
        item: "Carrot",
        amount: new Decimal(1),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Pumpkin Soup": {
    name: "Pumpkin Soup",
    description: "Creamy autumn flavor.",
    sellPrice: new Decimal(1.8),
    cookTime: 120,
    ingredients: [
      {
        item: "Pumpkin",
        amount: new Decimal(3),
      },
      {
        item: "Cabbage",
        amount: new Decimal(1),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Beetroot Salad": {
    name: "Beetroot Salad",
    description: "Fresh and tangy.",
    sellPrice: new Decimal(4.7),
    cookTime: 180,
    ingredients: [
      {
        item: "Beetroot",
        amount: new Decimal(3),
      },
      {
        item: "Pumpkin",
        amount: new Decimal(1),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Parsnip Porridge": {
    name: "Parsnip Porridge",
    description: "Warm and creamy.",
    sellPrice: new Decimal(8.1),
    cookTime: 240,
    ingredients: [
      {
        item: "Parsnip",
        amount: new Decimal(3),
      },
      {
        item: "Beetroot",
        amount: new Decimal(2),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Radish Skewers": {
    name: "Radish Skewers",
    description: "Crispy and seasoned.",
    sellPrice: new Decimal(16.2),
    cookTime: 300,
    ingredients: [
      {
        item: "Radish",
        amount: new Decimal(4),
      },
      {
        item: "Parsnip",
        amount: new Decimal(1),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Cauliflower Sandwich": {
    name: "Cauliflower Sandwich",
    description: "Hearty veggie bite.",
    sellPrice: new Decimal(25.2),
    cookTime: 360,
    ingredients: [
      {
        item: "Cauliflower",
        amount: new Decimal(4),
      },
      {
        item: "Radish",
        amount: new Decimal(2),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Wheat Bread": {
    name: "Wheat Bread",
    description: "Fresh baked loaf.",
    sellPrice: new Decimal(45),
    cookTime: 420,
    ingredients: [
      {
        item: "Wheat",
        amount: new Decimal(5),
      },
      {
        item: "Cauliflower",
        amount: new Decimal(2),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
  "Kale Stir-fry": {
    name: "Kale Stir-fry",
    description: "Savory greens dish.",
    sellPrice: new Decimal(90),
    cookTime: 480,
    ingredients: [
      {
        item: "Kale",
        amount: new Decimal(5),
      },
      {
        item: "Wheat",
        amount: new Decimal(3),
      },
      {
        item: "Firewood",
        amount: new Decimal(1),
      },
    ],
  },
});

/**
 * Animal purchase costs and level requirements
 * Based on BALANCE_PROPOSALS.md:
 * | Animal | Unlock Level | Purchase Cost (VTC) |
 * |--------|-------------|---------------------|
 * | Chicken | 3 | $5 |
 * | Cow | 6 | $50 |
 * | Sheep | 8 | $30 |
 * | Pig | 10 | $40 |
 */
export const ANIMALS: Record<Animal, Craftable> = {
  Chicken: {
    name: "Chicken",
    description: "Produces eggs. Eats Wheat.",
    price: new Decimal(5),
    ingredients: [],
    levelRequirement: 3,
  },
  Cow: {
    name: "Cow",
    description: "Produces milk. Eats Kale.",
    price: new Decimal(50),
    ingredients: [],
    levelRequirement: 6,
  },
  Sheep: {
    name: "Sheep",
    description: "Produces wool. Eats Cabbage.",
    price: new Decimal(30),
    ingredients: [],
    levelRequirement: 8,
  },
};

export const CRAFTABLES: () => Record<CraftableName, Craftable> = () => ({
  ...SEEDS(),
  ...FOODS(),
  ...ANIMALS,
  ...WORKSHOP_RESOURCES(),
});
