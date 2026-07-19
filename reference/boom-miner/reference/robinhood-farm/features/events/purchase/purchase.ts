import Decimal from "decimal.js-light";
import { ANIMALS, CraftableName, CRAFTABLES, FOODS } from "@/features/types/gameplay/craftables";
import { SEEDS } from "@/features/types/gameplay/crops";
import { GameState } from "@/features/types/gameplay/game";

export type PurchaseAction = { type: "item.crafted"; item: CraftableName; amount: number };

const VALID_ITEMS = Object.keys({ ...SEEDS(), ...FOODS(), ...ANIMALS }) as CraftableName[];

type Options = { state: GameState; action: PurchaseAction; available?: CraftableName[] };

/**
 * Handles shop-purchase of seeds, foods, and animals.
 * Deducts the coin balance and adds the purchased item to inventory.
 * No skill XP is awarded on purchase — cooking has been removed from the game.
 */
export function purchase({ state, action, available }: Options): GameState {
  const validItems = available || VALID_ITEMS;
  if (!validItems.includes(action.item)) throw new Error(`This item is not purchasable: ${action.item}`);

  const item = CRAFTABLES()[action.item];
  if (item.disabled)     throw new Error("This item is disabled");
  if (action.amount < 1) throw new Error("Invalid amount");

  const price         = item.price || new Decimal(0);
  const totalExpenses = price.mul(action.amount);

  if (new Decimal(state.balance).lessThan(totalExpenses)) throw new Error("Insufficient tokens");

  const subtractedInventory = item.ingredients.reduce(
    (inventory, ingredient) => {
      const count       = new Decimal(inventory[ingredient.item] || 0);
      const totalAmount = ingredient.amount.mul(action.amount);
      if (count.lessThan(totalAmount)) throw new Error(`Insufficient ingredient: ${ingredient.item}`);
      return { ...inventory, [ingredient.item]: count.sub(totalAmount) };
    },
    state.inventory,
  );

  const oldAmount = new Decimal(state.inventory[action.item] || 0);

  return {
    ...state,
    balance:   new Decimal(state.balance).sub(totalExpenses),
    inventory: { ...subtractedInventory, [action.item]: oldAmount.add(action.amount) },
  };
}
