/**
 * lib/modules/heroes/types.server.ts
 *
 * Pure TypeScript types for the `heroes` domain.
 * No mongoose runtime code — interfaces only.
 */

import type { Document } from "mongoose";
import type { HeroRarity, HeroType } from "@/features/types/HeroRarity";

export interface HeroAttributesDoc {
  power: number;
  speed: number;
  stamina: number;
  bombNumber: number;
  bombRange: number;
}

export interface HeroMarketDoc {
  listed: boolean;
  price: number;
  seller: string | null;
  created: number;
  sold: number;
}

export interface IHero extends Document {
  /** Wallet address of the owning player. Indexed. */
  ownerWallet: string;
  /** Sequential display number — unique, required, indexed. Used as #1234 in UI. */
  minted_number: number;
  name: string;
  type: HeroType;
  rarity: HeroRarity;
  level: number;
  attributes: HeroAttributesDoc;
  /** Current energy. Max = stamina * ENERGY_PER_STAMINA. */
  currentEnergy: number;
  /** Cached max energy. */
  maxEnergy: number;
  onMap: boolean;
  market: HeroMarketDoc;
  createdAt: Date;
  updatedAt: Date;
}
