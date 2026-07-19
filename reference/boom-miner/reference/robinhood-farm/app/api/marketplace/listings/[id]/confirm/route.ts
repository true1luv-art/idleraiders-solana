/**
 * GET /api/marketplace/listings/[id]/confirm
 *
 * Read-only status check for a listing. Used by the buyer after receiving a
 * `purchase_confirmed` socket event to confirm the listing is now sold.
 *
 * Since purchases are queued (202 Accepted) rather than synchronous, the
 * buyer can poll this endpoint to know when settlement is complete.
 *
 * Auth: not required — listing status is public.
 *
 * Response: { listingId, status: "active" | "sold" | "cancelled" | "not_found" }
 */

import { apiError } from "@/lib/api/error-response";
import { getListingById } from "@/lib/modules/listings/repository.server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listingId } = await params;
  if (!listingId) {
    return apiError("Listing ID is required", "MISSING_ID", 400);
  }

  const listing = await getListingById(listingId);

  if (!listing) {
    return Response.json({ listingId, status: "not_found" }, { status: 200 });
  }

  return Response.json({ listingId, status: listing.status }, { status: 200 });
}
