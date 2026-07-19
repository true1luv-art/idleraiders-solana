import Decimal from "decimal.js-light";
import { Food, FOODS } from "../types/craftables";
import { GameState } from "../types/game";
import { getCookXP, getSkillLevel, computeBonus } from "../lib/skills";
import { INITIAL_BONUS } from "../types/skills";

export type StartCookingAction = {
  type: "food.startCooking";
  item: Food;
};

type Options = {
  state: GameState;
  action: StartCookingAction;
  createdAt?: number;
};

export enum START_COOKING_ERRORS {
  KITCHEN_BUSY      = "Kitchen is already busy",
  UNKNOWN_FOOD      = "Unknown food item",
  NOT_ENOUGH_INGREDIENTS = "Not enough ingredients",
}

export function startCooking({ state, action, createdAt = Date.now() }: Options): GameState {
  if (state.cooking !== null) {
    throw new Error(START_COOKING_ERRORS.KITCHEN_BUSY);
  }

  const foods = FOODS();
  const recipe = foods[action.item];
  if (!recipe) {
    throw new Error(START_COOKING_ERRORS.UNKNOWN_FOOD);
  }

  // Deduct ingredients from inventory immediately
  const subtractedInventory = recipe.ingredients.reduce(
    (inventory, ingredient) => {
      const have  = new Decimal(inventory[ingredient.item] ?? 0);
      const need  = ingredient.amount instanceof Decimal
        ? ingredient.amount
        : new Decimal(ingredient.amount);

      if (have.lessThan(need)) {
        throw new Error(
          `${START_COOKING_ERRORS.NOT_ENOUGH_INGREDIENTS}: ${ingredient.item}`
        );
      }
      return { ...inventory, [ingredient.item]: have.sub(need) };
    },
    state.inventory
  );

  // Apply cookingSpeed bonus — each point reduces time by up to 30%
  const speedBonus    = state.bonus?.cookingSpeed ?? 0;
  const speedFactor   = Math.max(0, 1 - speedBonus);
  const baseCookTime  = recipe.cookTime ?? 60;
  const effectiveDuration = Math.round(baseCookTime * speedFactor);

  // Award cooking XP when the player starts cooking (effort is when you cook)
  const cookXP       = getCookXP(action.item);
  const newCookingXP = (state.skills.cooking ?? 0) + cookXP;

  const oldLevel = getSkillLevel(state.skills.cooking ?? 0);
  const newLevel = getSkillLevel(newCookingXP);
  const newBonus =
    newLevel > oldLevel && newLevel % 10 === 0
      ? computeBonus({ ...state.skills, cooking: newCookingXP })
      : (state.bonus ?? { ...INITIAL_BONUS });

  return {
    ...state,
    inventory: subtractedInventory,
    cooking: {
      item: action.item,
      startedAt: createdAt,
      duration: effectiveDuration,
    },
    skills: {
      ...state.skills,
      cooking: newCookingXP,
    },
    bonus: newBonus,
  };
}
