import Decimal from "decimal.js-light";
import type { Food } from "@/features/types/gameplay/craftables";
import { FOODS } from "@/features/types/gameplay/craftables";
import type { GameState } from "@/features/types/gameplay/game";
import { trackMilestone } from "@/features/game/milestones";
import type { MilestoneName } from "@/features/types/gameplay/milestones";

export type CookFoodAction = {
  type: "food.cook";
  food: Food;
  /** How many portions to cook in one action (default 1). */
  amount?: number;
};

/**
 * Instant cook — deducts ingredients and adds the food to inventory immediately.
 * No timer, no skill requirement. The player just needs the ingredients.
 */
export function cookFood(state: GameState, action: CookFoodAction): GameState {
  const { food, amount = 1 } = action;
  const recipe = FOODS()[food];

  if (!recipe) {
    throw new Error(`Unknown food: ${food}`);
  }
  if (amount < 1 || !Number.isInteger(amount)) {
    throw new Error("Amount must be a positive integer.");
  }

  let inventory = { ...state.inventory };

  // Check and deduct ingredients
  for (const { item, amount: needed } of recipe.ingredients) {
    const have = inventory[item] ?? new Decimal(0);
    const total = needed.mul(amount);
    if (have.lessThan(total)) {
      throw new Error(`Not enough ${item}. Need ${total}, have ${have}.`);
    }
    inventory[item] = have.minus(total);
  }

  // Add the cooked food
  const currentFood = inventory[food] ?? new Decimal(0);
  inventory[food] = currentFood.plus(amount);

  let milestones = trackMilestone(state.milestones, "Food Cooked", amount);
  milestones = trackMilestone(milestones, `${food} Cooked` as MilestoneName, amount);

  return {
    ...state,
    inventory,
    milestones,
  };
}
