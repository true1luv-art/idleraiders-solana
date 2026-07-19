export type ResourceName =
  | "Wood"
  | "Stone"
  | "Iron"
  | "Gold"
  | "Egg"
  | "Milk"
  | "Wool"
  | "Chicken"
  // Fish
  | "Anchovy"
  | "Sardine"
  | "Tilapia"
  | "Herring"
  | "Trout"
  | "Sea Bass"
  | "Mackerel"
  | "Salmon"
  | "Red Snapper"
  | "Barracuda"
  | "Tuna"
  | "Swordfish"
  | "Blue Marlin"
  | "Oarfish";

export type Resource = {
  description: string;
  sellPrice?: number;
};

export const RESOURCES: Record<ResourceName, Resource> = {
  Wood: {
    description: "Used to craft items",
  },
  Stone: {
    description: "Used to craft items",
  },
  Iron: {
    description: "Used to craft items",
  },
  Gold: {
    description: "Used to craft items",
  },
  Egg: {
    description: "Produced by chickens. Sell at the Bazaar.",
    sellPrice: 0.08,
  },
  Milk: {
    description: "Produced by cows. Sell at the Bazaar.",
    sellPrice: 1.5,
  },
  Wool: {
    description: "Produced by sheep. Sell at the Bazaar.",
    sellPrice: 0.9,
  },
  Chicken: {
    description: "Used to lay eggs",
  },
  // Fish — caught by fishing at the shoreline
  Anchovy: {
    description: "A small, common saltwater fish. Sell at the Bazaar.",
    sellPrice: 0.30,
  },
  Sardine: {
    description: "A small schooling fish with a mild flavour. Sell at the Bazaar.",
    sellPrice: 0.35,
  },
  Tilapia: {
    description: "A freshwater fish that adapts easily. Sell at the Bazaar.",
    sellPrice: 0.40,
  },
  Herring: {
    description: "A silvery fish found near the shore. Sell at the Bazaar.",
    sellPrice: 0.45,
  },
  Trout: {
    description: "A speckled fish from clear streams. Sell at the Bazaar.",
    sellPrice: 0.60,
  },
  "Sea Bass": {
    description: "A firm-fleshed fish with a delicate taste. Sell at the Bazaar.",
    sellPrice: 0.80,
  },
  Mackerel: {
    description: "A fast-swimming fish with bold stripes. Sell at the Bazaar.",
    sellPrice: 1.00,
  },
  Salmon: {
    description: "A prized pink-fleshed fish. Sell at the Bazaar.",
    sellPrice: 1.20,
  },
  "Red Snapper": {
    description: "A striking red fish with a rich flavour. Sell at the Bazaar.",
    sellPrice: 1.80,
  },
  Barracuda: {
    description: "A fierce, elongated predator of the shallows. Sell at the Bazaar.",
    sellPrice: 2.50,
  },
  Tuna: {
    description: "A large, powerful ocean fish. Sell at the Bazaar.",
    sellPrice: 3.50,
  },
  Swordfish: {
    description: "A majestic billfish of the open sea. Sell at the Bazaar.",
    sellPrice: 5.00,
  },
  "Blue Marlin": {
    description: "A legendary deep-sea trophy fish. Sell at the Bazaar.",
    sellPrice: 8.00,
  },
  Oarfish: {
    description: "An enormously rare serpentine fish of the deep. Sell at the Bazaar.",
    sellPrice: 15.00,
  },
};
