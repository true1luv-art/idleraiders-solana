import Decimal from "decimal.js-light";
import { GameState, Inventory } from "../types/game";
import { SHEEP_TIME_TO_WOOL, SHEEP_RE_HUNGER_DELAY } from "../lib/constants";
import { trackActivity } from "../lib/activity";

export type FeedSheepAction = {
  type: "sheep.feed";
  index: number;
};

type Options = {
  state: GameState;
  action: FeedSheepAction;
  createdAt?: number;
};

const CABBAGE_REQUIRED = 1;

export function getFeedRequiredToFeed(inventory: Inventory): number {
  return CABBAGE_REQUIRED;
}

export function feedSheep({ state, action, createdAt = Date.now() }: Options): GameState {
  const sheep = state.sheep[action.index];

  // Allow re-feeding if the produce window expired (animal went hungry again)
  const isRehungry =
    sheep?.fedAt !== undefined &&
    createdAt - sheep.fedAt >= SHEEP_TIME_TO_WOOL + SHEEP_RE_HUNGER_DELAY;

  // Check if sheep is already fed and still within produce window
  if (sheep?.fedAt && !isRehungry) {
    throw new Error("Sheep is not hungry");
  }

  const currentCabbage = state.inventory["Cabbage"] ?? new Decimal(0);

  if (new Decimal(currentCabbage).lt(CABBAGE_REQUIRED)) {
    throw new Error("Not enough Cabbage to feed sheep");
  }

  // Deduct Cabbage from inventory
  const newInventory: Inventory = {
    ...state.inventory,
    Cabbage: new Decimal(currentCabbage).sub(CABBAGE_REQUIRED),
  };

  // Update sheep state
  const newSheep = {
    ...state.sheep,
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
    sheep: newSheep,
    activity,
  };
}
