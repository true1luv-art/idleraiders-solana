import Decimal from "decimal.js-light";
import { GameState, InventoryItemName } from "@/features/types/gameplay/game";
import { FishName } from "@/features/types/gameplay/fish";
import { FISH_TABLE } from "@/features/game/fishing";
import { trackMilestone } from "@/features/game/milestones";

export type SellFishAction = { type: "fish.sell"; item: InventoryItemName; amount: number };

function isFish(item: InventoryItemName): item is FishName {
  return FISH_TABLE.some((f) => f.name === item);
}

type Options = { state: GameState; action: SellFishAction };

export function sellFish({ state, action }: Options): GameState {
  if (!isFish(action.item))  throw new Error("Not a fish item");
  if (action.amount <= 0)    throw new Error("Invalid amount");

  const entry = FISH_TABLE.find((f) => f.name === action.item)!;
  const count = new Decimal(state.inventory[action.item] ?? 0);
  if (count.lessThan(action.amount)) throw new Error("Insufficient fish to sell");

  const earned = new Decimal(entry.sellPrice).mul(action.amount);

  return {
    ...state,
    balance:    new Decimal(state.balance).add(earned),
    inventory:  { ...state.inventory, [action.item]: count.sub(action.amount) },
    milestones: trackMilestone(state.milestones, "Coins Earned", earned.toNumber()),
  };
}
