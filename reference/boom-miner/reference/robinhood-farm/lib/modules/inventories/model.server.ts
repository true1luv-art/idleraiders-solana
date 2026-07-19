/**
 * lib/modules/inventories/model.server.ts
 *
 * MongoDB schema for the `inventories` collection. §redesign §4
 *
 * ONE DOCUMENT PER ITEM. `amount` is the USABLE quantity — units reserved for
 * sale are deducted from `amount` at list time. The lightweight `market`
 * sub-document is a back-reference to the active `listings` document; it is a
 * UI hint only and is never used for validation logic.
 *
 * `market` shape:
 *   { id: ObjectId, amount: Number } | null
 *   - id     → listings._id of the active listing for this item.
 *   - amount → units currently out on the market (display only).
 *
 * State transitions:
 *   List:         amount -= qty;  market = { id, amount: qty }
 *   Cancel:       amount += listing.quantity;  market = null
 *   Full sale:    market = null
 *   Partial fill: market.amount -= purchaseQty
 */

import mongoose, { Schema, Model, Types } from "mongoose";
import type { InventoryItemMarket, IInventoryItem, AggregatedInventory, IInventory } from "./types.server";

export type { InventoryItemMarket, IInventoryItem, AggregatedInventory, IInventory } from "./types.server";
export { getUsableAmount } from "./types.server";

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const InventoryItemMarketSchema = new Schema<InventoryItemMarket>(
  {
    id: { type: Types.ObjectId, required: true, ref: "listings" },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Schema — one document per item §9.24
// ---------------------------------------------------------------------------

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    owner: { type: String, required: true, index: true },
    item: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    // null = not listed; populated only while the item is on the marketplace.
    market: { type: InventoryItemMarketSchema, default: null },
  },
  {
    collection: "inventories",
    timestamps: true,
  },
);

// One document per (owner, item). Enables atomic upserts keyed by the pair.
InventoryItemSchema.index({ owner: 1, item: 1 }, { unique: true });

export const InventoryModel: Model<IInventoryItem> =
  mongoose.models.Inventory ??
  mongoose.model<IInventoryItem>("Inventory", InventoryItemSchema);
