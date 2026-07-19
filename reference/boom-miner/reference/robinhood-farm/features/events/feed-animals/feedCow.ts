import Decimal from "decimal.js-light";
import { GameState } from "@/features/types/gameplay/game";
import { ANIMALS_CONFIG } from "@/features/game/animals";
import { trackMilestone } from "@/features/game/milestones";


export type FeedCowAction = { type: "cow.feed"; index: number };
type Options = { state: GameState; action: FeedCowAction; createdAt?: number };

export function feedCow({ state, action, createdAt = Date.now() }: Options): GameState {
  const cow        = state.cows[action.index];
  const isRehungry = cow?.fedAt !== undefined &&
    createdAt - cow.fedAt >= ANIMALS_CONFIG.Cow.produceTimeMs + ANIMALS_CONFIG.Cow.reHungerDelayMs;

  if (cow?.fedAt && !isRehungry) throw new Error("Cow is not hungry");

  const currentKale = state.inventory["Kale"] ?? new Decimal(0);
  if (new Decimal(currentKale).lt(1)) throw new Error("Not enough Kale to feed cow");

  return {
    ...state,
    inventory: { ...state.inventory, Kale: new Decimal(currentKale).sub(1) },
    cows: {
      ...state.cows,
      [action.index]: {
        fedAt: createdAt,
      },
    },
    milestones: trackMilestone(state.milestones, "Animal Fed", 1),
  };
}
