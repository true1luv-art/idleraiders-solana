import Decimal from "decimal.js-light";
import {
  ANIMALS,
  Craftable,
  CraftableName,
  CRAFTABLES,
  FOODS,
  WORKSHOP_RESOURCES,
} from "../types/craftables";
import { SeedName, SEEDS } from "../types/crops";
import { GameState, Inventory, InventoryItemName } from "../types/game";
import { isSeed } from "./plant";
import { getCookXP, getSkillLevel, computeBonus } from "../lib/skills";
import { INITIAL_BONUS } from "../types/skills";

export type CraftAction = {
  type: "item.crafted";
  item: CraftableName;
  amount: number;
};

const VALID_ITEMS = Object.keys({
  ...SEEDS(),
  ...FOODS(),
  ...ANIMALS,
  ...WORKSHOP_RESOURCES(),
}) as CraftableName[];

function isCraftable(item: CraftableName, names: CraftableName[]): item is CraftableName {
  return names.includes(item);
}

export function getBuyPrice(item: Craftable, _inventory: Inventory) {
  return item.price || new Decimal(0);
}

type Options = {
  state: GameState;
  action: CraftAction;
  available?: CraftableName[];
};

export function craft({ state, action, available }: Options) {
  if (!isCraftable(action.item, available || VALID_ITEMS)) {
    throw new Error(`This item is not craftable: ${action.item}`);
  }

  const item = CRAFTABLES()[action.item];
  if (item.disabled) throw new Error("This item is disabled");
  if (action.amount < 1) throw new Error("Invalid amount");

  const price         = getBuyPrice(item, state.inventory);
  const totalExpenses = price.mul(action.amount);

  if (new Decimal(state.balance).lessThan(totalExpenses)) {
    throw new Error("Insufficient tokens");
  }

  const subtractedInventory = item.ingredients.reduce(
    (inventory, ingredient) => {
      const count       = new Decimal(inventory[ingredient.item] || 0);
      const totalAmount = ingredient.amount.mul(action.amount);
      if (count.lessThan(totalAmount)) {
        throw new Error(`Insufficient ingredient: ${ingredient.item}`);
      }
      return { ...inventory, [ingredient.item]: count.sub(totalAmount) };
    },
    state.inventory
  );

  const oldAmount = new Decimal(state.inventory[action.item] || 0);

  // Route XP to cooking skill for food items
  const cookingXP = getCookXP(action.item) * action.amount;
  const newCookingXP = (state.skills.cooking ?? 0) + cookingXP;

  // Recompute bonus only if cooking skill levelled up at a multiple of 10
  const oldLevel = getSkillLevel(state.skills.cooking ?? 0);
  const newLevel = getSkillLevel(newCookingXP);
  const newBonus =
    newLevel > oldLevel && newLevel % 10 === 0
      ? computeBonus({ ...state.skills, cooking: newCookingXP })
      : (state.bonus ?? { ...INITIAL_BONUS });

  return {
    ...state,
    balance: new Decimal(state.balance).sub(totalExpenses),
    inventory: {
      ...subtractedInventory,
      [action.item]: oldAmount.add(action.amount),
    },
    skills: {
      ...state.skills,
      cooking: newCookingXP,
    },
    bonus: newBonus,
  };
}
