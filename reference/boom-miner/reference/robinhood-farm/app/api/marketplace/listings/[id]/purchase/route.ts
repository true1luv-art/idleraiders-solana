/**
 * POST /api/marketplace/listings/[id]/purchase
 *
 * Enqueues a marketplace purchase into `transactions_pending`. §redesign §2
 *
 * The route:
 *   1. Validates the listing exists and is purchasable (read-only pre-check).
 *   2. Inserts a `marketplace_purchase` row into `transactions_pending`.
 *   3. Returns 202 Accepted + the job _id.
 *
 * The transaction-worker picks up the row within ≤ 5 s and calls settlePurchase.
 * The buyer can poll GET /api/transactions to confirm completion.
 *
 * Auth: Authorization: Bearer <token> OR rhf_token cookie.
 */

import mongoose from "mongoose";
import { apiError } from "@/lib/api/error-response";
import { getWallet } from "@/lib/api/get-wallet";
import { buildPurchaseTransaction } from "@/lib/modules/listings/repository.server";
import { enqueueMarketplacePurchase } from "@/lib/modules/transactions-pending/repository.server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const buyerId = await getWallet(req);
  if (!buyerId) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  // ── Route param ────────────────────────────────────────────────────────────
  const { id: listingId } = await params;
  if (!listingId) return apiError("Listing ID is required", "MISSING_ID", 400);

  // ── Body parsing ───────────────────────────────────────────────────────────
  let quantity: number | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.quantity === "number") {
      quantity = body.quantity;
    }
  } catch {
    // quantity is optional — proceed with undefined (buy all available)
  }

  // ── Pre-check (read-only validation + cost breakdown) ────────────────────
  const check = await buildPurchaseTransaction(buyerId, listingId, quantity);

  switch (check.status) {
    case "listing-not-found":
      return apiError("Listing not found", "LISTING_NOT_FOUND", 404);
    case "listing-not-active":
      return apiError("This listing is no longer active", "LISTING_NOT_ACTIVE", 409);
    case "cannot-buy-own-listing":
      return apiError("You cannot purchase your own listing", "CANNOT_BUY_OWN_LISTING", 403);
    case "quantity-exceeds-available":
      return apiError(
        `Requested quantity ${check.requested} exceeds available ${check.available}`,
        "QUANTITY_EXCEEDS_AVAILABLE",
        422,
      );
    case "invalid-quantity":
      return apiError("Quantity must be a positive integer", "INVALID_QUANTITY", 400);
    case "insufficient-balance":
      return apiError(
        `Insufficient balance: you have ${check.available} but need ${check.required}`,
        "INSUFFICIENT_BALANCE",
        422,
      );
    case "build-error":
      return apiError(`Validation failed: ${check.detail}`, "BUILD_ERROR", 500);
  }

  // check.status === "ok" — enqueue the purchase
  const { purchaseQty, totalPrice, fee, sellerNet } = check;

  const job = await enqueueMarketplacePurchase({
    listingId:   new mongoose.Types.ObjectId(listingId),
    buyerWallet: buyerId,
    quantity:    purchaseQty,
  });

  return Response.json(
    {
      jobId:       job._id.toString(),
      listingId,
      purchaseQty,
      totalPrice,
      fee,
      sellerNet,
      message:     "Purchase queued. Poll GET /api/transactions to confirm completion.",
    },
    { status: 202 },
  );
}
