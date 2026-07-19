import Decimal from "decimal.js-light";
import { GameState, Inventory } from "../types/game";
import { COW_TIME_TO_MILK, COW_RE_HUNGER_DELAY } from "../lib/constants";
import { trackActivity } from "../lib/activity";

export type FeedCowAction = {
  type: "cow.feed";
  index: number;
};

type Options = {
  state: GameState;
  action: FeedCowAction;
  createdAt?: number;
};

const KALE_REQUIRED = 1;

export function getFeedRequiredToFeed(inventory: Inventory): number {
  return KALE_REQUIRED;
}

export function feedCow({ state, action, createdAt = Date.now() }: Options): GameState {
  const cow = state.cows[action.index];

  // Allow re-feeding if the produce window expired (animal went hungry again)
  const isRehungry =
    cow?.fedAt !== undefined &&
    createdAt - cow.fedAt >= COW_TIME_TO_MILK + COW_RE_HUNGER_DELAY;

  // Check if cow is already fed and still within produce window
  if (cow?.fedAt && !isRehungry) {
    throw new Error("Cow is not hungry");
  }

  const currentKale = state.inventory["Kale"] ?? new Decimal(0);

  if (new Decimal(currentKale).lt(KALE_REQUIRED)) {
    throw new Error("Not enough Kale to feed cow");
  }

  // Deduct Kale from inventory
  const newInventory: Inventory = {
    ...state.inventory,
    Kale: new Decimal(currentKale).sub(KALE_REQUIRED),
  };

  // Update cow state
  const newCows = {
    ...state.cows,
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
    cows: newCows,
    activity,
  };
}
