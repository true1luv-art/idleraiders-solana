"use client";

/**
 * MarketplaceModal — fullscreen marketplace mount
 * (docs/modal-redesign-plan.md §2.4, Phase C).
 *
 * Thin wrapper over MarketplaceScreen. This is the LIVE marketplace — it reads
 * real listings, analytics, and the player's balance from the API /
 * game store, and settles purchases via purchaseListingOnChain. The
 * layout itself is shared with the /test-modals mock shell.
 */

import React, { useCallback, useMemo } from "react";
import useSWR from "swr";
import Decimal from "decimal.js-light";
import {
  MarketplaceScreen,
  type MarketplaceListing,
  type MarketplaceCategory,
  type MarketplaceTopSale,
  type MarketplaceStats,
} from "@/features/game-components/marketplace/MarketplaceScreen";
import { ITEM_DETAILS } from "@/features/types/item-details";
import type { InventoryItemName } from "@/features/types/gameplay/game";
import { useGameStore } from "@/features/game-stores/useGameStore";

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

interface ApiListing {
  _id: string;
  assetType: MarketplaceCategory;
  assetName: string;
  sellerId: string;
  sellerName?: string;
  price: number;
  quantity: number;
  status: string;
}

interface ListingsResponse {
  listings: ApiListing[];
  total: number;
}

interface AnalyticsResponse {
  totalVolumeAllTime: number;
  activeListingCount: number;
  topAssets: { assetName: string; assetType: string; volume: number; trades: number; avgPrice: number }[];
}

interface MineResponse {
  summary?: { activeCount: number };
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_ICON: Record<string, string> = {
  resource:          "/assets/resources/stone.png",
  seed:              "/assets/icons/token.png",
  food:              "/assets/icons/token.png",
  fish:              "/assets/fish/fish.png",
  crafting_material: "/assets/resources/wood.png",
};

function resolveImage(l: ApiListing): string {
  const detail = ITEM_DETAILS[l.assetName as InventoryItemName];
  if (detail?.image) return detail.image;
  return CATEGORY_ICON[l.assetType] ?? "/assets/icons/token.png";
}

function compact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MarketplaceModalProps {
  show: boolean;
  onHide: () => void;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({ show, onHide }) => {
  // Only fetch while the modal is open.
  const { data: listingsData, mutate: mutateListings } = useSWR<ListingsResponse>(
    show ? "/api/marketplace/listings?limit=100&sort=newest" : null,
    fetcher,
  );
  const { data: analytics, mutate: mutateAnalytics } = useSWR<AnalyticsResponse>(
    show ? "/api/marketplace/analytics" : null,
    fetcher,
  );
  const { data: mine } = useSWR<MineResponse>(
    show ? "/api/marketplace/listings/mine?status=active" : null,
    fetcher,
  );

  const balanceRaw = useGameStore((s) => s.state.balance);
  const coinBalance = useMemo(() => {
    try {
      return new Decimal(balanceRaw ?? 0).toNumber();
    } catch {
      return 0;
    }
  }, [balanceRaw]);

  // Map API listings → screen listings.
  const listings: MarketplaceListing[] = useMemo(() => {
    const raw = listingsData?.listings ?? [];
    const mapped = raw.map((l) => ({
      id: String(l._id),
      name: l.assetName,
      category: l.assetType,
      price: l.price,
      usd: "",
      image: resolveImage(l),
      seller: l.sellerName || `${l.sellerId.slice(0, 4)}…${l.sellerId.slice(-4)}`,
      featured: false,
    }));

    // Feature the highest-priced active listings so the Featured tab is populated.
    const topIds = new Set(
      [...mapped].sort((a, b) => b.price - a.price).slice(0, 12).map((l) => l.id),
    );
    return mapped.map((l) => ({ ...l, featured: topIds.has(l.id) }));
  }, [listingsData]);

  // Top sales strip — derived from 30-day analytics top assets (real data).
  const topSales: MarketplaceTopSale[] = useMemo(() => {
    return (analytics?.topAssets ?? []).slice(0, 6).map((a) => ({
      item: a.assetName,
      buyer: `${a.trades.toLocaleString()} sold`,
      price: Math.round(a.avgPrice),
      usd: "",
    }));
  }, [analytics]);

  const stats: MarketplaceStats = useMemo(() => {
    const recentTrades = (analytics?.topAssets ?? []).reduce((sum, a) => sum + a.trades, 0);
    return {
      totalVolume: `${compact(analytics?.totalVolumeAllTime ?? 0)} coins`,
      totalTrades: compact(recentTrades),
      walletsHolding: (analytics?.activeListingCount ?? listings.length).toLocaleString(),
    };
  }, [analytics, listings.length]);

  const handleBuy = useCallback(
    async (listing: MarketplaceListing) => {
      try {
        const res = await fetch(`/api/marketplace/listings/${listing.id}/purchase`, {
          method:      "POST",
          headers:     { "Content-Type": "application/json" },
          credentials: "include",
          body:        JSON.stringify({ quantity: 1 }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          window.alert(data.error ?? "Purchase failed");
          return;
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Network error");
        return;
      }
      // Refresh the market view after a successful settlement.
      mutateListings();
      mutateAnalytics();
    },
    [mutateListings, mutateAnalytics],
  );

  return (
    <MarketplaceScreen
      show={show}
      onClose={onHide}
      listings={listings}
      topSales={topSales}
      stats={stats}
      coinBalance={coinBalance}
      myListingsCount={mine?.summary?.activeCount ?? 0}
      onBuy={handleBuy}
    />
  );
};
