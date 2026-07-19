/**
 * POST /api/farm/inventory/sell
 *
 * Sells items from the player's farming inventory for in-game balance (coins). §2.2-A
 * This mirrors the Phaser `item.sell`, `food.sell`, `produce.sell` events but runs
 * fully server-side so the client cannot forge sell prices.
 *
 * Body: { items: Array<{ name: string; quantity: number }> }
 *
 * The sell price for each item is looked up from CROPS_CONFIG, FOODS_CONFIG, and
 * FISH_TABLE in shared/data/farming.ts. Unknown items (resources, etc.) use price 0.
 *
 * Response: { success: true, soldItems: ..., balanceAdded: number, newBalance: number }
 *
 * Auth: Bearer token or rhf_token cookie.
 */

import { getWallet }            from "@/lib/api/get-wallet";
import { apiError, apiOk }      from "@/lib/api/error-response";
import { getOrCreateInventory, deductItems } from "@/lib/modules/inventories/repository.server";
import { addBalance } from "@/lib/modules/players/repository.server";
import { FarmModel }             from "@/lib/modules/farms/model.server";
import { CROPS_CONFIG } from "@/features/game/crops";
import { FOODS_CONFIG } from "@/features/game/foods";
import { FISH_TABLE } from "@/features/game/fishing";

// ---------------------------------------------------------------------------
// Sell price resolver — matches Phaser sell logic in events/sell.ts etc.
// Prices are flat base values with no halving multiplier.
// ---------------------------------------------------------------------------
function getSellPrice(itemName: string): number {
  // Crops
  const cropEntry = Object.values(CROPS_CONFIG).find((c) => c.name === itemName);
  if (cropEntry) return cropEntry.sellPrice;

  // Food
  const foodEntry = FOODS_CONFIG[itemName as keyof typeof FOODS_CONFIG];
  if (foodEntry) return foodEntry.sellPrice;

  // Fish
  const fishEntry = FISH_TABLE.find((f) => f.name === itemName);
  if (fishEntry) return fishEntry.sellPrice;

  // Unknown / not sellable (resources, seeds etc. have no server sell price yet)
  return 0;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const wallet = await getWallet(req);
  if (!wallet) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  let body: { items?: Array<{ name: string; quantity: number }> };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_JSON", 400);
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return apiError("items array is required", "MISSING_ITEMS", 400);
  }

  // Validate sell prices and quantities
  const sellList = body.items.map((entry) => ({
    name:       entry.name,
    quantity:   Math.max(0, Math.floor(entry.quantity ?? 0)),
    unitPrice:  getSellPrice(entry.name),
    subtotal:   0,
  }));

  for (const item of sellList) {
    if (!item.name) return apiError("Each item must have a name", "INVALID_ITEM", 400);
    if (item.quantity <= 0) return apiError(`Quantity for ${item.name} must be > 0`, "INVALID_QUANTITY", 400);
    if (item.unitPrice === 0) return apiError(`${item.name} is not sellable`, "NOT_SELLABLE", 422);
    item.subtotal = item.unitPrice * item.quantity;
  }

  const totalEarned = sellList.reduce((sum, i) => sum + i.subtotal, 0);

  // Build deduction map
  const deductMap: Record<string, number> = {};
  for (const item of sellList) {
    deductMap[item.name] = (deductMap[item.name] ?? 0) + item.quantity;
  }

  // Verify holdings
  const inventory = await getOrCreateInventory(wallet);
  const currentItems = (inventory.items ?? {}) as Record<string, number>;
  for (const [name, qty] of Object.entries(deductMap)) {
    if ((currentItems[name] ?? 0) < qty) {
      return apiError(`Not enough ${name} in inventory`, "INSUFFICIENT_ITEMS", 422);
    }
  }

  // Atomically deduct items and credit balance
  await deductItems(wallet, deductMap);
  await addBalance(wallet, totalEarned);

  // §2.5-A — track "Coins Earned" on the farm document for milestone tracking.
  try {
    await FarmModel.findOneAndUpdate(
      { playerId: wallet },
      { $inc: { "milestones.Coins Earned": totalEarned } },
      { upsert: false },
    );
  } catch {
    // Non-fatal: milestone tracking failure must not block the sell response.
  }

  const updatedInventory = await getOrCreateInventory(wallet);

  return apiOk({
    soldItems:    sellList.map(({ name, quantity, unitPrice, subtotal }) => ({ name, quantity, unitPrice, subtotal })),
    balanceAdded: totalEarned,
    newBalance:   updatedInventory.balance,
  });
}
