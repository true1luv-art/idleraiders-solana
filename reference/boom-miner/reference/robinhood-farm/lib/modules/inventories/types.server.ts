/**
 * lib/modules/inventories/types.server.ts
 *
 * Pure TypeScript types for the `inventories` domain.
 * No mongoose runtime code lives here.
 */

import type { Document, Types } from "mongoose";

// ---------------------------------------------------------------------------
// Sub-document — lightweight back-reference to the active listing §redesign §4
// ---------------------------------------------------------------------------

/**
 * UI-hint sub-document written when a player lists an item.
 * Null when the item is not listed.
 *
 * This is READ-ONLY for all game systems. `listings` is always the source of
 * truth. `market.amount` is updated on partial fills and cleared on full sale
 * or cancellation.
 *
 * Rules:
 *   List:         amount -= qty;  market = { id, amount: qty }
 *   Cancel:       amount += listing.quantity;  market = null
 *   Full sale:    market = null
 *   Partial fill: market.amount -= purchaseQty
 */
export interface InventoryItemMarket {
  /** _id of the active listing document. */
  id:     Types.ObjectId;
  /** Units currently out on the market (display only). */
  amount: number;
}

// ---------------------------------------------------------------------------
// Document interface — one document per (owner, item) §9.24
// ---------------------------------------------------------------------------

export interface IInventoryItem extends Document {
  /** Wallet address — matches players.wallet. */
  owner: string;

  /**
   * Canonical item name / key, e.g. "Potato Seed", "Iron Ore".
   * Unique per owner (compound index { owner, item }).
   */
  item: string;

  /**
   * USABLE quantity (non-negative integer). The quantity reserved for sale is
   * deducted from `amount` at list time — it is never kept separately. §9.7
   */
  amount: number;

  /**
   * Lightweight back-reference to the active listing for this item.
   * Null when the item is not listed. Read-only UI hint — never used for
   * validation. §redesign §4
   */
  market: InventoryItemMarket | null;

  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Aggregate view
// ---------------------------------------------------------------------------

/**
 * Aggregated, backward-compatible view of a player's whole inventory.
 */
export interface AggregatedInventory {
  /** Wallet address (kept as `playerId` for backward compatibility). */
  playerId: string;
  /** item name → usable quantity. */
  items: Record<string, number>;
  /** item name → active market back-reference (only items currently listed). */
  marketReservations: Record<string, InventoryItemMarket>;
  /** Game Balance = persisted in-game coins (players.coins). */
  balance: number;
}

/**
 * Backward-compatible alias.
 */
export type IInventory = AggregatedInventory;

// ---------------------------------------------------------------------------
// Pure helper
// ---------------------------------------------------------------------------

/**
 * Returns the usable quantity of an item document.
 */
export function getUsableAmount(doc: { amount?: number } | null | undefined): number {
  return doc?.amount ?? 0;
}
