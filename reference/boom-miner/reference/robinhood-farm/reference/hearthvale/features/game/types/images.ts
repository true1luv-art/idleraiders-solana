// CROPS
import potatoSeed from "assets/crops/potato/seed.png";
import potatoCrop from "assets/crops/potato/crop.png";
import pumpkinSeed from "assets/crops/pumpkin/seed.png";
import pumpkinCrop from "assets/crops/pumpkin/crop.png";
import carrotSeed from "assets/crops/carrot/seed.png";
import carrotCrop from "assets/crops/carrot/crop.png";
import cabbageSeed from "assets/crops/cabbage/seed.png";
import cabbageCrop from "assets/crops/cabbage/crop.png";
import beetrootSeed from "assets/crops/beetroot/seed.png";
import beetrootCrop from "assets/crops/beetroot/crop.png";
import cauliflowerSeed from "assets/crops/cauliflower/seed.png";
import cauliflowerCrop from "assets/crops/cauliflower/crop.png";
import parsnipSeed from "assets/crops/parsnip/seed.png";
import parsnipCrop from "assets/crops/parsnip/crop.png";
import radishSeed from "assets/crops/radish/seed.png";
import radishCrop from "assets/crops/radish/crop.png";
import wheatSeed from "assets/crops/wheat/seed.png";
import wheatCrop from "assets/crops/wheat/crop.png";
import kaleSeed from "assets/crops/kale/seed.png";
import kaleCrop from "assets/crops/kale/crop.png";

// Foods
import roastedPotato from "assets/foods/roasted_potato.png";
import carrotStew from "assets/foods/carrot_stew.png";
import cabbageRoll from "assets/foods/cabbage_roll.png";
import pumpkinSoup from "assets/foods/pumpkin_soup.png";
import beetrootSalad from "assets/foods/beetroot_salad.png";
import parsnipPorridge from "assets/foods/parsnip_porridge.png";
import radishSkewers from "assets/foods/radish_skewers.png";
import cauliflowerSandwich from "assets/foods/cauliflower_sandwich.png";
import wheatBread from "assets/foods/wheat_bread.png";
import kaleStirfry from "assets/foods/kale_stirfry.png";

// Resources
import stone from "assets/resources/stone.png";
import wood from "assets/resources/wood.png";
import egg from "assets/resources/egg.png";
import milk from "assets/resources/milk.png";
import wool from "assets/resources/wool.png";
import iron from "assets/resources/iron_ore.png";
import gold from "assets/resources/gold_ore.png";
import chicken from "assets/animals/chicken.png";
import cowIcon from "assets/animals/cow.png";
import sheepIcon from "assets/animals/sheep.png";
import { InventoryItemName } from "./game";
import { FOODS, WORKSHOP_RESOURCES } from "./craftables";
import { CROPS, SEEDS } from "./crops";
import { RESOURCES } from "./resources";
import { FishName } from "./fish";
import { getImageSrc } from "lib/utils/getImageSrc";

// Fish (all share the same sprite)
import fishImg from "assets/fish/fish.png";

// Workshop Resources (using resource images as placeholders)
import firewoodImg from "assets/resources/wood.png";
import brickImg from "assets/resources/stone.png";
import ironBarImg from "assets/resources/iron_ore.png";
import goldBarImg from "assets/resources/gold_ore.png";


export type ItemDetails = {
  description: string;
  image: string;
  secondaryImage?: string;
  section?: Section;
};

type Items = Record<InventoryItemName, ItemDetails>;

// Alias for the shared utility
const img = getImageSrc;

const FISH_NAMES: FishName[] = [
  "Anchovy", "Sardine", "Tilapia", "Herring", "Trout", "Sea Bass",
  "Mackerel", "Salmon", "Red Snapper", "Barracuda", "Tuna",
  "Swordfish", "Blue Marlin", "Oarfish",
];

const FISH_DESCRIPTIONS: Record<FishName, string> = {
  Anchovy:      "A small, oily fish found near the shore.",
  Sardine:      "Packed with flavour — a fisherman's staple.",
  Tilapia:      "A mild freshwater fish, easy to cook.",
  Herring:      "Schooling fish famous for its rich taste.",
  Trout:        "Prized for its delicate, pink flesh.",
  "Sea Bass":   "A refined fish with firm white meat.",
  Mackerel:     "Bold-flavoured and packed with omega-3.",
  Salmon:       "The king of river fish, prized by all.",
  "Red Snapper":"Deep-red scales and succulent flesh.",
  Barracuda:    "A fierce predator of the shallows.",
  Tuna:         "A powerful open-water fish.",
  Swordfish:    "Legendary for its speed and size.",
  "Blue Marlin":"The ultimate trophy catch.",
  Oarfish:      "A rare, serpentine deep-sea giant.",
};

const fishEntries = Object.fromEntries(
  FISH_NAMES.map((name) => [
    name,
    { description: FISH_DESCRIPTIONS[name], image: img(fishImg) } as ItemDetails,
  ])
) as Record<FishName, ItemDetails>;

const crops = CROPS();
const seeds = SEEDS();
export const ITEM_DETAILS: Items = {
  // Crops
  Potato: {
    ...crops.Potato,
    image: img(potatoCrop),
  },
  Pumpkin: {
    ...crops.Pumpkin,
    image: img(pumpkinCrop),
  },
  Carrot: {
    ...crops.Carrot,
    image: img(carrotCrop),
  },
  Cabbage: {
    ...crops.Cabbage,
    image: img(cabbageCrop),
  },
  Beetroot: {
    ...crops.Beetroot,
    image: img(beetrootCrop),
  },
  Cauliflower: {
    ...crops.Cauliflower,
    image: img(cauliflowerCrop),
  },
  Parsnip: {
    ...crops.Parsnip,
    image: img(parsnipCrop),
  },
  Radish: {
    ...crops.Radish,
    image: img(radishCrop),
  },
  Wheat: {
    ...crops.Wheat,
    image: img(wheatCrop),
  },
  Kale: {
    ...crops.Kale,
    image: img(kaleCrop),
  },

  // Seeds
  "Potato Seed": {
    ...seeds["Potato Seed"],
    image: img(potatoSeed),
    secondaryImage: potatoCrop,
  },
  "Pumpkin Seed": {
    ...seeds["Pumpkin Seed"],
    image: img(pumpkinSeed),
    secondaryImage: pumpkinCrop,
  },
  "Carrot Seed": {
    ...seeds["Carrot Seed"],
    image: img(carrotSeed),
    secondaryImage: carrotCrop,
  },
  "Cabbage Seed": {
    ...seeds["Cabbage Seed"],
    image: img(cabbageSeed),
    secondaryImage: cabbageCrop,
  },
  "Beetroot Seed": {
    ...seeds["Beetroot Seed"],
    image: img(beetrootSeed),
    secondaryImage: beetrootCrop,
  },
  "Cauliflower Seed": {
    ...seeds["Cauliflower Seed"],
    image: img(cauliflowerSeed),
    secondaryImage: cauliflowerCrop,
  },
  "Parsnip Seed": {
    ...seeds["Parsnip Seed"],
    image: img(parsnipSeed),
    secondaryImage: parsnipCrop,
  },
  "Radish Seed": {
    ...seeds["Radish Seed"],
    image: img(radishSeed),
    secondaryImage: radishCrop,
  },
  "Wheat Seed": {
    ...seeds["Wheat Seed"],
    image: img(wheatSeed),
    secondaryImage: wheatCrop,
  },
  "Kale Seed": {
    ...seeds["Kale Seed"],
    image: img(kaleSeed),
    secondaryImage: kaleCrop,
  },

  // Resources
  Wood: {
    ...RESOURCES["Wood"],
    image: img(wood),
  },
  Stone: {
    ...RESOURCES["Stone"],
    image: img(stone),
  },
  Iron: {
    ...RESOURCES["Iron"],
    image: img(iron),
  },
  Gold: {
    ...RESOURCES["Gold"],
    image: img(gold),
  },
  Egg: {
    ...RESOURCES["Egg"],
    image: img(egg),
  },
  Milk: {
    ...RESOURCES["Milk"],
    image: img(milk),
  },
  Wool: {
    ...RESOURCES["Wool"],
    image: img(wool),
  },
  Chicken: {
    ...RESOURCES["Chicken"],
    image: img(chicken),
  },
  Cow: {
    description: "Produces milk. Eats Kale.",
    image: img(cowIcon),
  },
  Sheep: {
    description: "Produces wool. Eats Cabbage.",
    image: img(sheepIcon),
  },

  // Foods
  "Roasted Potato": {
    ...FOODS()["Roasted Potato"],
    image: img(roastedPotato),
  },
  "Carrot Stew": {
    ...FOODS()["Carrot Stew"],
    image: img(carrotStew),
  },
  "Cabbage Roll": {
    ...FOODS()["Cabbage Roll"],
    image: img(cabbageRoll),
  },
  "Pumpkin Soup": {
    ...FOODS()["Pumpkin Soup"],
    image: img(pumpkinSoup),
  },
  "Beetroot Salad": {
    ...FOODS()["Beetroot Salad"],
    image: img(beetrootSalad),
  },
  "Parsnip Porridge": {
    ...FOODS()["Parsnip Porridge"],
    image: img(parsnipPorridge),
  },
  "Radish Skewers": {
    ...FOODS()["Radish Skewers"],
    image: img(radishSkewers),
  },
  "Cauliflower Sandwich": {
    ...FOODS()["Cauliflower Sandwich"],
    image: img(cauliflowerSandwich),
  },
  "Wheat Bread": {
    ...FOODS()["Wheat Bread"],
    image: img(wheatBread),
  },
  "Kale Stir-fry": {
    ...FOODS()["Kale Stir-fry"],
    image: img(kaleStirfry),
  },

  // Workshop Resources
  Firewood: {
    ...WORKSHOP_RESOURCES()["Firewood"],
    image: img(firewoodImg),
  },
  Brick: {
    ...WORKSHOP_RESOURCES()["Brick"],
    image: img(brickImg),
  },
  "Iron Bar": {
    ...WORKSHOP_RESOURCES()["Iron Bar"],
    image: img(ironBarImg),
  },
  "Gold Bar": {
    ...WORKSHOP_RESOURCES()["Gold Bar"],
    image: img(goldBarImg),
  },

  // Fish
  ...fishEntries,
};
