import Decimal from "decimal.js-light";
import { Food, FOODS } from "../types/craftables";
import { GameState, InventoryItemName } from "../types/game";

export type SellFoodAction = {
  type: "food.sell";
  item: InventoryItemName;
  amount: number;
};

function isFood(item: InventoryItemName): item is Food {
  return item in FOODS();
}

type Options = {
  state: GameState;
  action: SellFoodAction;
};

export function sellFood({ state, action }: Options): GameState {
  if (!isFood(action.item)) {
    throw new Error("Not a food item");
  }

  if (action.amount <= 0) {
    throw new Error("Invalid amount");
  }

  const food = FOODS()[action.item];
  const sellPrice = food.sellPrice;

  if (!sellPrice) {
    throw new Error("Food has no sell price");
  }

  const foodCount = state.inventory[action.item] || 0;

  if (typeof foodCount === "number" && foodCount < action.amount) {
    throw new Error("Insufficient food to sell");
  }

  if (foodCount instanceof Decimal && foodCount.lessThan(action.amount)) {
    throw new Error("Insufficient food to sell");
  }

  const currentCount = foodCount instanceof Decimal ? foodCount.toNumber() : foodCount;

  return {
    ...state,
    balance: new Decimal(state.balance).add(sellPrice.mul(action.amount)),
    inventory: {
      ...state.inventory,
      [food.name]: currentCount - action.amount,
    },
  };
}
