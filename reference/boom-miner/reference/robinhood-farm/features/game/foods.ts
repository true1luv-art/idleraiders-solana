/**
 * shared/game/foods.ts
 *
 * Isomorphic cooking / food definitions. §2.1-E
 */

export type FoodName =
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

export interface FoodIngredient {
  item: string;
  amount: number;
}

export interface FoodConfig {
  name: FoodName;
  description: string;
  /** Cook time in seconds. */
  cookTimeSeconds: number;
  /** Sell price in coins when selling to the game. */
  sellPrice: number;
  ingredients: FoodIngredient[];
}

export const FOODS_CONFIG: Record<FoodName, FoodConfig> = {
  "Roasted Potato": {
    name: "Roasted Potato", description: "Warm and crispy.", cookTimeSeconds: 30, sellPrice: 0.30,
    ingredients: [{ item: "Potato", amount: 2 }],
  },
  "Carrot Stew": {
    name: "Carrot Stew", description: "Hearty and filling.", cookTimeSeconds: 60, sellPrice: 1.20,
    ingredients: [{ item: "Carrot", amount: 3 }],
  },
  "Cabbage Roll": {
    name: "Cabbage Roll", description: "Savory wrapped delight.", cookTimeSeconds: 90, sellPrice: 2.10,
    ingredients: [{ item: "Cabbage", amount: 2 }, { item: "Carrot", amount: 1 }],
  },
  "Pumpkin Soup": {
    name: "Pumpkin Soup", description: "Creamy autumn flavor.", cookTimeSeconds: 120, sellPrice: 6.30,
    ingredients: [{ item: "Pumpkin", amount: 3 }, { item: "Cabbage", amount: 1 }],
  },
  "Beetroot Salad": {
    name: "Beetroot Salad", description: "Fresh and tangy.", cookTimeSeconds: 180, sellPrice: 12.60,
    ingredients: [{ item: "Beetroot", amount: 3 }, { item: "Pumpkin", amount: 1 }],
  },
  "Parsnip Porridge": {
    name: "Parsnip Porridge", description: "Warm and creamy.", cookTimeSeconds: 240, sellPrice: 27.00,
    ingredients: [{ item: "Parsnip", amount: 3 }, { item: "Beetroot", amount: 2 }],
  },
  "Radish Skewers": {
    name: "Radish Skewers", description: "Crispy and seasoned.", cookTimeSeconds: 300, sellPrice: 52.00,
    ingredients: [{ item: "Radish", amount: 4 }, { item: "Parsnip", amount: 1 }],
  },
  "Cauliflower Sandwich": {
    name: "Cauliflower Sandwich", description: "Hearty veggie bite.", cookTimeSeconds: 360, sellPrice: 100.00,
    ingredients: [{ item: "Cauliflower", amount: 4 }, { item: "Radish", amount: 2 }],
  },
  "Wheat Bread": {
    name: "Wheat Bread", description: "Fresh baked loaf.", cookTimeSeconds: 420, sellPrice: 196.00,
    ingredients: [{ item: "Wheat", amount: 5 }, { item: "Cauliflower", amount: 2 }],
  },
  "Kale Stir-fry": {
    name: "Kale Stir-fry", description: "Savory greens dish.", cookTimeSeconds: 480, sellPrice: 350.00,
    ingredients: [{ item: "Kale", amount: 5 }, { item: "Wheat", amount: 3 }],
  },
};
