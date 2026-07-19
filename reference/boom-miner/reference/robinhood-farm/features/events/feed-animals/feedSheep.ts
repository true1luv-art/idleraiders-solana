import Decimal from "decimal.js-light";
import { GameState } from "@/features/types/gameplay/game";
import { ANIMALS_CONFIG } from "@/features/game/animals";
import { trackMilestone } from "@/features/game/milestones";


export type FeedSheepAction = { type: "sheep.feed"; index: number };
type Options = { state: GameState; action: FeedSheepAction; createdAt?: number };

export function feedSheep({ state, action, createdAt = Date.now() }: Options): GameState {
  const sheep      = state.sheep[action.index];
  const isRehungry = sheep?.fedAt !== undefined &&
    createdAt - sheep.fedAt >= ANIMALS_CONFIG.Sheep.produceTimeMs + ANIMALS_CONFIG.Sheep.reHungerDelayMs;

  if (sheep?.fedAt && !isRehungry) throw new Error("Sheep is not hungry");

  const currentCabbage = state.inventory["Cabbage"] ?? new Decimal(0);
  if (new Decimal(currentCabbage).lt(1)) throw new Error("Not enough Cabbage to feed sheep");

  return {
    ...state,
    inventory: { ...state.inventory, Cabbage: new Decimal(currentCabbage).sub(1) },
    sheep: {
      ...state.sheep,
      [action.index]: {
        fedAt: createdAt,
      },
    },
    milestones: trackMilestone(state.milestones, "Animal Fed", 1),
  };
}
