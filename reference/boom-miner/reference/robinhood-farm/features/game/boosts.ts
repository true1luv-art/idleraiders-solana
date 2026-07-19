/**
 * features/game/boosts.ts
 *
 * Sell-price boost helpers used by the Market UI.
 * Boost items are reserved for a future feature; hasSellBoost always returns
 * false until a boost item is added to the inventory schema.
 */

import Decimal from "decimal.js-light";
import type { Inventory } from "@/features/types/gameplay/game";

/** Any object that carries a sell price — accepts both Crop and CropConfig. */
type WithSellPrice = { sellPrice: number | Decimal };

/**
 * Returns true if the player's inventory contains an active sell-price boost item.
 * Currently a stub — no boost items exist yet.
 */
export function hasSellBoost(_inventory: Inventory): boolean {
  return false;
}

/**
 * Returns the effective sell price for a crop as a Decimal.
 * Applies a 10% bonus when hasSellBoost is true.
 */
export function getSellPrice(crop: WithSellPrice, inventory: Inventory): Decimal {
  const base = new Decimal(crop.sellPrice);
  if (hasSellBoost(inventory)) {
    return base.mul(1.1);
  }
  return base;
}
