import Decimal from "decimal.js-light";
import { GameState, Inventory } from "../types/game";
import { MAX_CHICKENS, CHICKEN_TIME_TO_EGG, CHICKEN_RE_HUNGER_DELAY } from "../lib/constants";
import { trackActivity } from "../lib/activity";

export type FeedChickenAction = {
  type: "chicken.feed";
  index: number;
};

type Options = {
  state: GameState;
  action: FeedChickenAction;
  createdAt?: number;
};

// Wheat required to feed a chicken
const WHEAT_REQUIRED = 1;

/**
 * Get the maximum number of chickens a player can have
 */
export function getMaxChickens(inventory: Inventory): number {
  // Could be expanded to check for Chicken Coop or other items
  return MAX_CHICKENS;
}

/**
 * Get the amount of Wheat required to feed a chicken
 */
export function getFeedRequiredToFeed(inventory: Inventory): number {
  // Could be expanded to check for items that reduce feed cost
  return WHEAT_REQUIRED;
}

export function feedChicken({ state, action, createdAt = Date.now() }: Options): GameState {
  const chickenCount = state.inventory.Chicken ?? 0;

  if (action.index < 0 || action.index >= chickenCount) {
    throw new Error("Chicken does not exist");
  }

  const chicken = state.chickens[action.index];

  // Allow re-feeding if the produce window expired (animal went hungry again)
  const isRehungry =
    chicken?.fedAt !== undefined &&
    createdAt - chicken.fedAt >= CHICKEN_TIME_TO_EGG + CHICKEN_RE_HUNGER_DELAY;

  // Check if chicken is already fed and still within produce window
  if (chicken?.fedAt && !isRehungry) {
    throw new Error("Chicken is not hungry");
  }

  const currentWheat = state.inventory["Wheat"] ?? new Decimal(0);

  if (new Decimal(currentWheat).lt(WHEAT_REQUIRED)) {
    throw new Error("Not enough Wheat to feed chicken");
  }

  // Deduct Wheat from inventory
  const newInventory: Inventory = {
    ...state.inventory,
    Wheat: new Decimal(currentWheat).sub(WHEAT_REQUIRED),
  };

  // Update chicken state
  const newChickens = {
    ...state.chickens,
    [action.index]: {
      fedAt: createdAt,
      multiplier: 1,
    },
  };

  // Track activity for achievements
  const activity = trackActivity(state.activity, "Animal Fed", 1);

  return {
    ...state,
    inventory: newInventory,
    chickens: newChickens,
    activity,
  };
}
