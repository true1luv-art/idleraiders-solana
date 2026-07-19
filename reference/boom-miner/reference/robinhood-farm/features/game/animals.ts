/**
 * shared/game/animals.ts
 *
 * Isomorphic animal definitions. §2.1-E
 */

export type AnimalType = "Chicken" | "Cow" | "Sheep";

export interface AnimalConfig {
  type: AnimalType;
  /** Item consumed when feeding the animal. */
  feedItem: string;
  /** Item produced after a successful produce cycle. */
  produceItem: string;
  /** Time from feeding → produce ready (ms). */
  produceTimeMs: number;
  /** Cooldown before the animal is hungry again (ms). */
  reHungerDelayMs: number;
  /** Maximum allowed count of this animal on the farm. */
  maxCount: number;
  /** Buy price in coins. */
  price: number;
  /** Sell price of the produced item. */
  produceSellPrice: number;
}

export const ANIMALS_CONFIG: Record<AnimalType, AnimalConfig> = {
  Chicken: {
    type: "Chicken",
    feedItem: "Wheat",
    produceItem: "Egg",
    produceTimeMs: 60 * 1_000,             // 1 minute
    reHungerDelayMs: 4 * 60 * 60 * 1_000, // 4 hours
    maxCount: 10,
    price: 5,
    produceSellPrice: 0.08,
  },
  Cow: {
    type: "Cow",
    feedItem: "Kale",
    produceItem: "Milk",
    produceTimeMs: 90 * 1_000,             // 1.5 minutes
    reHungerDelayMs: 6 * 60 * 60 * 1_000, // 6 hours
    maxCount: 5,
    price: 50,
    produceSellPrice: 1.5,
  },
  Sheep: {
    type: "Sheep",
    feedItem: "Cabbage",
    produceItem: "Wool",
    produceTimeMs: 120 * 1_000,            // 2 minutes
    reHungerDelayMs: 6 * 60 * 60 * 1_000, // 6 hours
    maxCount: 5,
    price: 30,
    produceSellPrice: 0.9,
  },
};
