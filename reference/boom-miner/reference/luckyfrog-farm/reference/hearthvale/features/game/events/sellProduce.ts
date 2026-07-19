import Decimal from "decimal.js-light";
import { RESOURCES } from "../types/resources";
import { GameState, InventoryItemName } from "../types/game";
import { trackActivity } from "../lib/activity";

export type ProduceName = "Egg" | "Milk" | "Wool";

export type SellProduceAction = {
  type: "produce.sell";
  item: InventoryItemName;
  amount: number;
};

function isProduce(item: InventoryItemName): item is ProduceName {
  return (item === "Egg" || item === "Milk" || item === "Wool");
}

type Options = {
  state: GameState;
  action: SellProduceAction;
};

export function sellProduce({ state, action }: Options): GameState {
  if (!isProduce(action.item)) {
    throw new Error("Not a produce item");
  }

  if (action.amount <= 0) {
    throw new Error("Invalid amount");
  }

  const resource = RESOURCES[action.item];
  const sellPrice = resource.sellPrice;

  if (!sellPrice) {
    throw new Error("This produce has no sell price");
  }

  const count = state.inventory[action.item] || new Decimal(0);
  const countDecimal = count instanceof Decimal ? count : new Decimal(count);

  if (countDecimal.lessThan(action.amount)) {
    throw new Error("Insufficient produce to sell");
  }

  const earned = new Decimal(sellPrice).mul(action.amount);
  const activity = trackActivity(state.activity, "Coins Earned", earned.toNumber());

  return {
    ...state,
    balance: new Decimal(state.balance).add(earned),
    inventory: {
      ...state.inventory,
      [action.item]: countDecimal.sub(action.amount),
    },
    activity,
  };
}
