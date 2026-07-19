import Decimal from "decimal.js-light";
import { GameState, InventoryItemName } from "./game";
import { getSkillLevel } from "../lib/skills";

// ============================================================================
// Activity Types - Track player actions for achievement progress
// ============================================================================

export type ActivityName =
  // Farming
  | "Crop Harvested"
  | "Potato Harvested"
  | "Carrot Harvested"
  | "Cabbage Harvested"
  | "Pumpkin Harvested"
  | "Beetroot Harvested"
  | "Parsnip Harvested"
  | "Radish Harvested"
  | "Cauliflower Harvested"
  | "Wheat Harvested"
  | "Kale Harvested"
  // Gathering
  | "Tree Chopped"
  | "Stone Mined"
  | "Iron Mined"
  | "Gold Mined"
  // Animals
  | "Animal Fed"
  | "Egg Collected"
  | "Milk Collected"
  | "Wool Collected"
  // Economy
  | "Coins Earned"
  | "Coins Spent";
  // Future: Fishing, Composting

export type Activity = Partial<Record<ActivityName, number>>;

// ============================================================================
// Achievement Types
// ============================================================================

export type AchievementCategory =
  | "farming"
  | "animals"
  | "gathering"
  | "economy"
  | "progression";
  // Future: "fishing" | "composting"

export type AchievementReward = {
  coins?: number;
  experience?: number;
  items?: {
    name: InventoryItemName;
    amount: number;
  }[];
};

export type Achievement = {
  name: string;
  description: string;
  category: AchievementCategory;
  progress: (state: GameState) => number;
  requirement: number;
  reward?: AchievementReward;
  hidden?: boolean;
  requires?: AchievementName[];
};

// ============================================================================
// Achievement Names
// ============================================================================

export type AchievementName =
  // Farming - Crop Milestones
  | "First Harvest"
  | "Budding Farmer"
  | "Field Worker"
  | "Crop Master"
  | "Harvest Legend"
  | "Eternal Farmer"
  // Farming - Specific Crops
  | "Spud Specialist"
  | "Carrot Commander"
  | "Cabbage Cultivator"
  | "Pumpkin Prince"
  | "Beet Baron"
  | "Wheat Whisperer"
  | "Kale King"
  | "All-Rounder"
  | "Crop Perfectionist"
  // Animals - General
  | "Animal Friend"
  | "Caretaker"
  | "Animal Whisperer"
  | "Barnyard Boss"
  // Animals - Produce
  | "Egg Collector"
  | "Egg Enthusiast"
  | "Egg Empire"
  | "Dairy Devotee"
  | "Milk Magnate"
  | "Wool Gatherer"
  | "Wool Wizard"
  // Gathering - Wood
  | "First Chop"
  | "Woodcutter"
  | "Lumberjack"
  | "Forest Fury"
  // Gathering - Stone
  | "Rock Breaker"
  | "Quarry Worker"
  | "Stone Seeker"
  | "Mountain Mover"
  // Gathering - Iron
  | "Iron Finder"
  | "Iron Worker"
  | "Iron Heart"
  // Gathering - Gold
  | "Gold Digger"
  | "Gold Rush"
  | "Golden Touch"
  // Economy
  | "First Sale"
  | "Merchant"
  | "Trader"
  | "Wealthy Farmer"
  | "Tycoon"
  | "Big Spender"
  | "High Roller"
  | "Coin Hoarder"
  // Progression — Farming skill (10 levels)
  | "Seedling"
  | "Sprouting"
  | "Green Thumb"
  | "Crop Tender"
  | "Field Hand"
  | "Farm Hand"
  | "Crop Expert"
  | "Harvest Master"
  | "Crop Veteran"
  | "Master Farmer"
  // Progression — Forestry skill (10 levels)
  | "Tree Hugger"
  | "Wood Gatherer"
  | "Axe Apprentice"
  | "Woodcutter Pro"
  | "Forest Worker"
  | "Timber Expert"
  | "Forest Ranger"
  | "Wood Master"
  | "Forest Veteran"
  | "Master Lumberjack"
  // Progression — Mining skill (10 levels)
  | "Pebble Picker"
  | "Stone Handler"
  | "Rock Breaker"
  | "Mine Apprentice"
  | "Ore Seeker"
  | "Mine Expert"
  | "Rock Veteran"
  | "Ore Master"
  | "Deep Miner"
  | "Master Miner"
  // Progression — Husbandry skill (10 levels)
  | "Animal Friend"
  | "Animal Apprentice"
  | "Animal Keeper"
  | "Animal Tender"
  | "Herd Handler"
  | "Animal Expert"
  | "Barn Manager"
  | "Herd Master"
  | "Animal Veteran"
  | "Master Herder"
  // Progression — Cooking skill (10 levels)
  | "First Meal"
  | "Home Cook"
  | "Kitchen Helper"
  | "Recipe Learner"
  | "Sous Chef"
  | "Line Cook"
  | "Head Chef"
  | "Culinary Expert"
  | "Master Chef"
  | "Legendary Chef"
  // Progression — Combat skill (10 levels)
  | "First Fight"
  | "Brawler"
  | "Street Fighter"
  | "Warrior Initiate"
  | "Battle Hardened"
  | "Combat Expert"
  | "Veteran Fighter"
  | "Elite Warrior"
  | "War Hero"
  | "Master Warrior"
  // Progression — Fishing skill (10 levels)
  | "First Cast"
  | "Pond Fisher"
  | "River Fisher"
  | "Patient Angler"
  | "Skilled Angler"
  | "Lake Fisher"
  | "Deep Sea Fisher"
  | "Expert Angler"
  | "Fishing Veteran"
  | "Master Angler"
  // Hidden
  | "Night Owl"
  | "Speed Farmer"
  | "Empty Pockets"
  | "Full Barn"
  | "Resource Millionaire";

// ============================================================================
// Achievement Definitions
// ============================================================================

// Helper functions
const getActivity = (state: GameState, name: ActivityName): number =>
  state.activity?.[name] ?? 0;

const getCropsHarvested = (state: GameState): number =>
  getActivity(state, "Crop Harvested");

const getUniqueAnimalTypes = (state: GameState): number => {
  let count = 0;
  if (Object.keys(state.chickens).length > 0) count++;
  if (Object.keys(state.cows).length > 0) count++;
  if (Object.keys(state.sheep).length > 0) count++;
  return count;
};



const getCropTypesHarvested = (state: GameState): number => {
  const cropActivities: ActivityName[] = [
    "Potato Harvested", "Carrot Harvested", "Cabbage Harvested",
    "Pumpkin Harvested", "Beetroot Harvested", "Parsnip Harvested",
    "Radish Harvested", "Cauliflower Harvested", "Wheat Harvested", "Kale Harvested"
  ];
  return cropActivities.filter(name => getActivity(state, name) > 0).length;
};

const allCropsHarvested100 = (state: GameState): number => {
  const cropActivities: ActivityName[] = [
    "Potato Harvested", "Carrot Harvested", "Cabbage Harvested",
    "Pumpkin Harvested", "Beetroot Harvested", "Parsnip Harvested",
    "Radish Harvested", "Cauliflower Harvested", "Wheat Harvested", "Kale Harvested"
  ];
  const minHarvested = Math.min(
    ...cropActivities.map(name => getActivity(state, name))
  );
  return minHarvested;
};

const getTotalResources = (state: GameState): number => {
  let total = 0;
  for (const value of Object.values(state.inventory)) {
    if (value) {
      total += new Decimal(value).toNumber();
    }
  }
  return total;
};

export const ACHIEVEMENTS: Record<AchievementName, Achievement> = {
  // ==========================================================================
  // FARMING - Crop Milestones
  // ==========================================================================
  "First Harvest": {
    name: "First Harvest",
    description: "Harvest your first crop",
    category: "farming",
    progress: getCropsHarvested,
    requirement: 1,
    reward: { experience: 5 },
  },
  "Budding Farmer": {
    name: "Budding Farmer",
    description: "Harvest 100 crops",
    category: "farming",
    progress: getCropsHarvested,
    requirement: 100,
    reward: { experience: 10 },
    requires: ["First Harvest"],
  },
  "Field Worker": {
    name: "Field Worker",
    description: "Harvest 500 crops",
    category: "farming",
    progress: getCropsHarvested,
    requirement: 500,
    reward: { experience: 25 },
    requires: ["Budding Farmer"],
  },
  "Crop Master": {
    name: "Crop Master",
    description: "Harvest 2,500 crops",
    category: "farming",
    progress: getCropsHarvested,
    requirement: 2500,
    reward: { experience: 50 },
    requires: ["Field Worker"],
  },
  "Harvest Legend": {
    name: "Harvest Legend",
    description: "Harvest 10,000 crops",
    category: "farming",
    progress: getCropsHarvested,
    requirement: 10000,
    reward: { experience: 100 },
    requires: ["Crop Master"],
  },
  "Eternal Farmer": {
    name: "Eternal Farmer",
    description: "Harvest 100,000 crops",
    category: "farming",
    progress: getCropsHarvested,
    requirement: 100000,
    reward: { experience: 250 },
    requires: ["Harvest Legend"],
  },

  // ==========================================================================
  // FARMING - Specific Crops
  // ==========================================================================
  "Spud Specialist": {
    name: "Spud Specialist",
    description: "Harvest 1,000 Potatoes",
    category: "farming",
    progress: (state) => getActivity(state, "Potato Harvested"),
    requirement: 1000,
    reward: { experience: 20 },
  },
  "Carrot Commander": {
    name: "Carrot Commander",
    description: "Harvest 1,000 Carrots",
    category: "farming",
    progress: (state) => getActivity(state, "Carrot Harvested"),
    requirement: 1000,
    reward: { experience: 20 },
  },
  "Cabbage Cultivator": {
    name: "Cabbage Cultivator",
    description: "Harvest 500 Cabbages",
    category: "farming",
    progress: (state) => getActivity(state, "Cabbage Harvested"),
    requirement: 500,
    reward: { experience: 25 },
  },
  "Pumpkin Prince": {
    name: "Pumpkin Prince",
    description: "Harvest 500 Pumpkins",
    category: "farming",
    progress: (state) => getActivity(state, "Pumpkin Harvested"),
    requirement: 500,
    reward: { experience: 30 },
  },
  "Beet Baron": {
    name: "Beet Baron",
    description: "Harvest 250 Beetroots",
    category: "farming",
    progress: (state) => getActivity(state, "Beetroot Harvested"),
    requirement: 250,
    reward: { experience: 35 },
  },
  "Wheat Whisperer": {
    name: "Wheat Whisperer",
    description: "Harvest 100 Wheat",
    category: "farming",
    progress: (state) => getActivity(state, "Wheat Harvested"),
    requirement: 100,
    reward: { experience: 40 },
  },
  "Kale King": {
    name: "Kale King",
    description: "Harvest 50 Kale",
    category: "farming",
    progress: (state) => getActivity(state, "Kale Harvested"),
    requirement: 50,
    reward: { experience: 50 },
  },
  "All-Rounder": {
    name: "All-Rounder",
    description: "Harvest every crop type at least once",
    category: "farming",
    progress: getCropTypesHarvested,
    requirement: 10,
    reward: { experience: 75 },
  },
  "Crop Perfectionist": {
    name: "Crop Perfectionist",
    description: "Harvest 100 of every crop type",
    category: "farming",
    progress: allCropsHarvested100,
    requirement: 100,
    reward: { experience: 200 },
    requires: ["All-Rounder"],
  },

  // ==========================================================================
  // ANIMALS - General
  // ==========================================================================
  "Animal Friend": {
    name: "Animal Friend",
    description: "Feed an animal for the first time",
    category: "animals",
    progress: (state) => getActivity(state, "Animal Fed"),
    requirement: 1,
    reward: { experience: 5 },
  },
  "Caretaker": {
    name: "Caretaker",
    description: "Feed animals 100 times",
    category: "animals",
    progress: (state) => getActivity(state, "Animal Fed"),
    requirement: 100,
    reward: { experience: 15 },
    requires: ["Animal Friend"],
  },
  "Animal Whisperer": {
    name: "Animal Whisperer",
    description: "Feed animals 1,000 times",
    category: "animals",
    progress: (state) => getActivity(state, "Animal Fed"),
    requirement: 1000,
    reward: { experience: 50 },
    requires: ["Caretaker"],
  },
  "Barnyard Boss": {
    name: "Barnyard Boss",
    description: "Own at least one of each animal type (Chicken, Cow, Sheep)",
    category: "animals",
    progress: getUniqueAnimalTypes,
    requirement: 3,
    reward: { experience: 75 },
  },

  // ==========================================================================
  // ANIMALS - Produce
  // ==========================================================================
  "Egg Collector": {
    name: "Egg Collector",
    description: "Collect 100 Eggs",
    category: "animals",
    progress: (state) => getActivity(state, "Egg Collected"),
    requirement: 100,
    reward: { experience: 10 },
  },
  "Egg Enthusiast": {
    name: "Egg Enthusiast",
    description: "Collect 1,000 Eggs",
    category: "animals",
    progress: (state) => getActivity(state, "Egg Collected"),
    requirement: 1000,
    reward: { experience: 30 },
    requires: ["Egg Collector"],
  },
  "Egg Empire": {
    name: "Egg Empire",
    description: "Collect 10,000 Eggs",
    category: "animals",
    progress: (state) => getActivity(state, "Egg Collected"),
    requirement: 10000,
    reward: { experience: 100 },
    requires: ["Egg Enthusiast"],
  },
  "Dairy Devotee": {
    name: "Dairy Devotee",
    description: "Collect 500 Milk",
    category: "animals",
    progress: (state) => getActivity(state, "Milk Collected"),
    requirement: 500,
    reward: { experience: 25 },
  },
  "Milk Magnate": {
    name: "Milk Magnate",
    description: "Collect 5,000 Milk",
    category: "animals",
    progress: (state) => getActivity(state, "Milk Collected"),
    requirement: 5000,
    reward: { experience: 75 },
    requires: ["Dairy Devotee"],
  },
  "Wool Gatherer": {
    name: "Wool Gatherer",
    description: "Collect 500 Wool",
    category: "animals",
    progress: (state) => getActivity(state, "Wool Collected"),
    requirement: 500,
    reward: { experience: 25 },
  },
  "Wool Wizard": {
    name: "Wool Wizard",
    description: "Collect 5,000 Wool",
    category: "animals",
    progress: (state) => getActivity(state, "Wool Collected"),
    requirement: 5000,
    reward: { experience: 75 },
    requires: ["Wool Gatherer"],
  },
  // ==========================================================================
  // GATHERING - Wood
  // ==========================================================================
  "First Chop": {
    name: "First Chop",
    description: "Chop your first tree",
    category: "gathering",
    progress: (state) => getActivity(state, "Tree Chopped"),
    requirement: 1,
    reward: { experience: 5 },
  },
  "Woodcutter": {
    name: "Woodcutter",
    description: "Chop 50 trees",
    category: "gathering",
    progress: (state) => getActivity(state, "Tree Chopped"),
    requirement: 50,
    reward: { experience: 15 },
    requires: ["First Chop"],
  },
  "Lumberjack": {
    name: "Lumberjack",
    description: "Chop 500 trees",
    category: "gathering",
    progress: (state) => getActivity(state, "Tree Chopped"),
    requirement: 500,
    reward: { experience: 40 },
    requires: ["Woodcutter"],
  },
  "Forest Fury": {
    name: "Forest Fury",
    description: "Chop 5,000 trees",
    category: "gathering",
    progress: (state) => getActivity(state, "Tree Chopped"),
    requirement: 5000,
    reward: { experience: 100 },
    requires: ["Lumberjack"],
  },

  // ==========================================================================
  // GATHERING - Stone
  // ==========================================================================
  "Rock Breaker": {
    name: "Rock Breaker",
    description: "Mine your first stone",
    category: "gathering",
    progress: (state) => getActivity(state, "Stone Mined"),
    requirement: 1,
    reward: { experience: 5 },
  },
  "Quarry Worker": {
    name: "Quarry Worker",
    description: "Mine 50 stone rocks",
    category: "gathering",
    progress: (state) => getActivity(state, "Stone Mined"),
    requirement: 50,
    reward: { experience: 15 },
    requires: ["Rock Breaker"],
  },
  "Stone Seeker": {
    name: "Stone Seeker",
    description: "Mine 500 stone rocks",
    category: "gathering",
    progress: (state) => getActivity(state, "Stone Mined"),
    requirement: 500,
    reward: { experience: 40 },
    requires: ["Quarry Worker"],
  },
  "Mountain Mover": {
    name: "Mountain Mover",
    description: "Mine 5,000 stone rocks",
    category: "gathering",
    progress: (state) => getActivity(state, "Stone Mined"),
    requirement: 5000,
    reward: { experience: 100 },
    requires: ["Stone Seeker"],
  },

  // ==========================================================================
  // GATHERING - Iron
  // ==========================================================================
  "Iron Finder": {
    name: "Iron Finder",
    description: "Mine your first iron",
    category: "gathering",
    progress: (state) => getActivity(state, "Iron Mined"),
    requirement: 1,
    reward: { experience: 10 },
  },
  "Iron Worker": {
    name: "Iron Worker",
    description: "Mine 100 iron rocks",
    category: "gathering",
    progress: (state) => getActivity(state, "Iron Mined"),
    requirement: 100,
    reward: { experience: 35 },
    requires: ["Iron Finder"],
  },
  "Iron Heart": {
    name: "Iron Heart",
    description: "Mine 1,000 iron rocks",
    category: "gathering",
    progress: (state) => getActivity(state, "Iron Mined"),
    requirement: 1000,
    reward: { experience: 80 },
    requires: ["Iron Worker"],
  },

  // ==========================================================================
  // GATHERING - Gold
  // ==========================================================================
  "Gold Digger": {
    name: "Gold Digger",
    description: "Mine your first gold",
    category: "gathering",
    progress: (state) => getActivity(state, "Gold Mined"),
    requirement: 1,
    reward: { experience: 15 },
  },
  "Gold Rush": {
    name: "Gold Rush",
    description: "Mine 50 gold rocks",
    category: "gathering",
    progress: (state) => getActivity(state, "Gold Mined"),
    requirement: 50,
    reward: { experience: 60 },
    requires: ["Gold Digger"],
  },
  "Golden Touch": {
    name: "Golden Touch",
    description: "Mine 500 gold rocks",
    category: "gathering",
    progress: (state) => getActivity(state, "Gold Mined"),
    requirement: 500,
    reward: { experience: 150 },
    requires: ["Gold Rush"],
  },

  // ==========================================================================
  // ECONOMY
  // ==========================================================================
  "First Sale": {
    name: "First Sale",
    description: "Sell your first item",
    category: "economy",
    progress: (state) => getActivity(state, "Coins Earned"),
    requirement: 1,
    reward: { experience: 5 },
  },
  "Merchant": {
    name: "Merchant",
    description: "Earn 100 coins total",
    category: "economy",
    progress: (state) => getActivity(state, "Coins Earned"),
    requirement: 100,
    reward: { experience: 10 },
    requires: ["First Sale"],
  },
  "Trader": {
    name: "Trader",
    description: "Earn 1,000 coins total",
    category: "economy",
    progress: (state) => getActivity(state, "Coins Earned"),
    requirement: 1000,
    reward: { experience: 30 },
    requires: ["Merchant"],
  },
  "Wealthy Farmer": {
    name: "Wealthy Farmer",
    description: "Earn 10,000 coins total",
    category: "economy",
    progress: (state) => getActivity(state, "Coins Earned"),
    requirement: 10000,
    reward: { experience: 75 },
    requires: ["Trader"],
  },
  "Tycoon": {
    name: "Tycoon",
    description: "Earn 100,000 coins total",
    category: "economy",
    progress: (state) => getActivity(state, "Coins Earned"),
    requirement: 100000,
    reward: { experience: 150 },
    requires: ["Wealthy Farmer"],
  },
  "Big Spender": {
    name: "Big Spender",
    description: "Spend 1,000 coins total",
    category: "economy",
    progress: (state) => getActivity(state, "Coins Spent"),
    requirement: 1000,
    reward: { experience: 25 },
  },
  "High Roller": {
    name: "High Roller",
    description: "Spend 10,000 coins total",
    category: "economy",
    progress: (state) => getActivity(state, "Coins Spent"),
    requirement: 10000,
    reward: { experience: 50 },
    requires: ["Big Spender"],
  },
  "Coin Hoarder": {
    name: "Coin Hoarder",
    description: "Have 10,000 coins at once",
    category: "economy",
    progress: (state) => state.balance.toNumber(),
    requirement: 10000,
    reward: { experience: 100 },
  },

  // ==========================================================================
  // PROGRESSION — Skill-level achievements (70 total, 7 skills × 10 levels)
  // Reward: coins added to balance at claim time (via claimAchievement event)
  // ==========================================================================

  // -- Farming --
  "Seedling":       { name: "Seedling",       description: "Reach Farming Level 10",  category: "progression", progress: (s) => getSkillLevel(s.skills.farming),   requirement: 10,  reward: { coins: 50   } },
  "Sprouting":      { name: "Sprouting",      description: "Reach Farming Level 20",  category: "progression", progress: (s) => getSkillLevel(s.skills.farming),   requirement: 20,  reward: { coins: 100  }, requires: ["Seedling"]   },
  "Green Thumb":    { name: "Green Thumb",    description: "Reach Farming Level 30",  category: "progression", progress: (s) => getSkillLevel(s.skills.farming),   requirement: 30,  reward: { coins: 200  }, requires: ["Sprouting"]  },
  "Crop Tender":    { name: "Crop Tender",    description: "Reach Farming Level 40",  category: "progression", progress: (s) => getSkillLevel(s.skills.farming),   requirement: 40,  reward: { coins: 350  }, requires: ["Green Thumb"] },
  "Field Hand":     { name: "Field Hand",     description: "Reach Farming Level 50",  category: "progression", progress: (s) => getSkillLevel(s.skills.farming),   requirement: 50,  reward: { coins: 500  }, requires: ["Crop Tender"] },
  "Farm Hand":      { name: "Farm Hand",      description: "Reach Farming Level 60",  category: "progression", progress: (s) => getSkillLevel(s.skills.farming),   requirement: 60,  reward: { coins: 700  }, requires: ["Field Hand"]  },
  "Crop Expert":    { name: "Crop Expert",    description: "Reach Farming Level 70",  category: "progression", progress: (s) => getSkillLevel(s.skills.farming),   requirement: 70,  reward: { coins: 1000 }, requires: ["Farm Hand"]  },
  "Harvest Master": { name: "Harvest Master", description: "Reach Farming Level 80",  category: "progression", progress: (s) => getSkillLevel(s.skills.farming),   requirement: 80,  reward: { coins: 1500 }, requires: ["Crop Expert"] },
  "Crop Veteran":   { name: "Crop Veteran",   description: "Reach Farming Level 90",  category: "progression", progress: (s) => getSkillLevel(s.skills.farming),   requirement: 90,  reward: { coins: 2000 }, requires: ["Harvest Master"] },
  "Master Farmer":  { name: "Master Farmer",  description: "Reach Farming Level 100", category: "progression", progress: (s) => getSkillLevel(s.skills.farming),   requirement: 100, reward: { coins: 3000 }, requires: ["Crop Veteran"] },

  // -- Forestry --
  "Tree Hugger":       { name: "Tree Hugger",       description: "Reach Forestry Level 10",  category: "progression", progress: (s) => getSkillLevel(s.skills.forestry),  requirement: 10,  reward: { coins: 50   } },
  "Wood Gatherer":     { name: "Wood Gatherer",     description: "Reach Forestry Level 20",  category: "progression", progress: (s) => getSkillLevel(s.skills.forestry),  requirement: 20,  reward: { coins: 100  }, requires: ["Tree Hugger"]    },
  "Axe Apprentice":    { name: "Axe Apprentice",    description: "Reach Forestry Level 30",  category: "progression", progress: (s) => getSkillLevel(s.skills.forestry),  requirement: 30,  reward: { coins: 200  }, requires: ["Wood Gatherer"]  },
  "Woodcutter Pro":    { name: "Woodcutter Pro",    description: "Reach Forestry Level 40",  category: "progression", progress: (s) => getSkillLevel(s.skills.forestry),  requirement: 40,  reward: { coins: 350  }, requires: ["Axe Apprentice"] },
  "Forest Worker":     { name: "Forest Worker",     description: "Reach Forestry Level 50",  category: "progression", progress: (s) => getSkillLevel(s.skills.forestry),  requirement: 50,  reward: { coins: 500  }, requires: ["Woodcutter Pro"] },
  "Timber Expert":     { name: "Timber Expert",     description: "Reach Forestry Level 60",  category: "progression", progress: (s) => getSkillLevel(s.skills.forestry),  requirement: 60,  reward: { coins: 700  }, requires: ["Forest Worker"]  },
  "Forest Ranger":     { name: "Forest Ranger",     description: "Reach Forestry Level 70",  category: "progression", progress: (s) => getSkillLevel(s.skills.forestry),  requirement: 70,  reward: { coins: 1000 }, requires: ["Timber Expert"]  },
  "Wood Master":       { name: "Wood Master",       description: "Reach Forestry Level 80",  category: "progression", progress: (s) => getSkillLevel(s.skills.forestry),  requirement: 80,  reward: { coins: 1500 }, requires: ["Forest Ranger"]  },
  "Forest Veteran":    { name: "Forest Veteran",    description: "Reach Forestry Level 90",  category: "progression", progress: (s) => getSkillLevel(s.skills.forestry),  requirement: 90,  reward: { coins: 2000 }, requires: ["Wood Master"]    },
  "Master Lumberjack": { name: "Master Lumberjack", description: "Reach Forestry Level 100", category: "progression", progress: (s) => getSkillLevel(s.skills.forestry),  requirement: 100, reward: { coins: 3000 }, requires: ["Forest Veteran"] },

  // -- Mining --
  "Pebble Picker":  { name: "Pebble Picker",  description: "Reach Mining Level 10",  category: "progression", progress: (s) => getSkillLevel(s.skills.mining),   requirement: 10,  reward: { coins: 50   } },
  "Stone Handler":  { name: "Stone Handler",  description: "Reach Mining Level 20",  category: "progression", progress: (s) => getSkillLevel(s.skills.mining),   requirement: 20,  reward: { coins: 100  }, requires: ["Pebble Picker"]  },
  "Rock Breaker":   { name: "Rock Breaker",   description: "Reach Mining Level 30",  category: "progression", progress: (s) => getSkillLevel(s.skills.mining),   requirement: 30,  reward: { coins: 200  }, requires: ["Stone Handler"]  },
  "Mine Apprentice":{ name: "Mine Apprentice",description: "Reach Mining Level 40",  category: "progression", progress: (s) => getSkillLevel(s.skills.mining),   requirement: 40,  reward: { coins: 350  }, requires: ["Rock Breaker"]   },
  "Ore Seeker":     { name: "Ore Seeker",     description: "Reach Mining Level 50",  category: "progression", progress: (s) => getSkillLevel(s.skills.mining),   requirement: 50,  reward: { coins: 500  }, requires: ["Mine Apprentice"] },
  "Mine Expert":    { name: "Mine Expert",    description: "Reach Mining Level 60",  category: "progression", progress: (s) => getSkillLevel(s.skills.mining),   requirement: 60,  reward: { coins: 700  }, requires: ["Ore Seeker"]     },
  "Rock Veteran":   { name: "Rock Veteran",   description: "Reach Mining Level 70",  category: "progression", progress: (s) => getSkillLevel(s.skills.mining),   requirement: 70,  reward: { coins: 1000 }, requires: ["Mine Expert"]    },
  "Ore Master":     { name: "Ore Master",     description: "Reach Mining Level 80",  category: "progression", progress: (s) => getSkillLevel(s.skills.mining),   requirement: 80,  reward: { coins: 1500 }, requires: ["Rock Veteran"]   },
  "Deep Miner":     { name: "Deep Miner",     description: "Reach Mining Level 90",  category: "progression", progress: (s) => getSkillLevel(s.skills.mining),   requirement: 90,  reward: { coins: 2000 }, requires: ["Ore Master"]     },
  "Master Miner":   { name: "Master Miner",   description: "Reach Mining Level 100", category: "progression", progress: (s) => getSkillLevel(s.skills.mining),   requirement: 100, reward: { coins: 3000 }, requires: ["Deep Miner"]     },

  // -- Husbandry --
  "Animal Friend":    { name: "Animal Friend",    description: "Reach Husbandry Level 10",  category: "progression", progress: (s) => getSkillLevel(s.skills.husbandry), requirement: 10,  reward: { coins: 50   } },
  "Animal Apprentice":{ name: "Animal Apprentice",description: "Reach Husbandry Level 20",  category: "progression", progress: (s) => getSkillLevel(s.skills.husbandry), requirement: 20,  reward: { coins: 100  }, requires: ["Animal Friend"]     },
  "Animal Keeper":    { name: "Animal Keeper",    description: "Reach Husbandry Level 30",  category: "progression", progress: (s) => getSkillLevel(s.skills.husbandry), requirement: 30,  reward: { coins: 200  }, requires: ["Animal Apprentice"] },
  "Animal Tender":    { name: "Animal Tender",    description: "Reach Husbandry Level 40",  category: "progression", progress: (s) => getSkillLevel(s.skills.husbandry), requirement: 40,  reward: { coins: 350  }, requires: ["Animal Keeper"]     },
  "Herd Handler":     { name: "Herd Handler",     description: "Reach Husbandry Level 50",  category: "progression", progress: (s) => getSkillLevel(s.skills.husbandry), requirement: 50,  reward: { coins: 500  }, requires: ["Animal Tender"]     },
  "Animal Expert":    { name: "Animal Expert",    description: "Reach Husbandry Level 60",  category: "progression", progress: (s) => getSkillLevel(s.skills.husbandry), requirement: 60,  reward: { coins: 700  }, requires: ["Herd Handler"]      },
  "Barn Manager":     { name: "Barn Manager",     description: "Reach Husbandry Level 70",  category: "progression", progress: (s) => getSkillLevel(s.skills.husbandry), requirement: 70,  reward: { coins: 1000 }, requires: ["Animal Expert"]     },
  "Herd Master":      { name: "Herd Master",      description: "Reach Husbandry Level 80",  category: "progression", progress: (s) => getSkillLevel(s.skills.husbandry), requirement: 80,  reward: { coins: 1500 }, requires: ["Barn Manager"]      },
  "Animal Veteran":   { name: "Animal Veteran",   description: "Reach Husbandry Level 90",  category: "progression", progress: (s) => getSkillLevel(s.skills.husbandry), requirement: 90,  reward: { coins: 2000 }, requires: ["Herd Master"]       },
  "Master Herder":    { name: "Master Herder",    description: "Reach Husbandry Level 100", category: "progression", progress: (s) => getSkillLevel(s.skills.husbandry), requirement: 100, reward: { coins: 3000 }, requires: ["Animal Veteran"]    },

  // -- Cooking --
  "First Meal":      { name: "First Meal",      description: "Reach Cooking Level 10",  category: "progression", progress: (s) => getSkillLevel(s.skills.cooking),   requirement: 10,  reward: { coins: 50   } },
  "Home Cook":       { name: "Home Cook",       description: "Reach Cooking Level 20",  category: "progression", progress: (s) => getSkillLevel(s.skills.cooking),   requirement: 20,  reward: { coins: 100  }, requires: ["First Meal"]      },
  "Kitchen Helper":  { name: "Kitchen Helper",  description: "Reach Cooking Level 30",  category: "progression", progress: (s) => getSkillLevel(s.skills.cooking),   requirement: 30,  reward: { coins: 200  }, requires: ["Home Cook"]       },
  "Recipe Learner":  { name: "Recipe Learner",  description: "Reach Cooking Level 40",  category: "progression", progress: (s) => getSkillLevel(s.skills.cooking),   requirement: 40,  reward: { coins: 350  }, requires: ["Kitchen Helper"]  },
  "Sous Chef":       { name: "Sous Chef",       description: "Reach Cooking Level 50",  category: "progression", progress: (s) => getSkillLevel(s.skills.cooking),   requirement: 50,  reward: { coins: 500  }, requires: ["Recipe Learner"]  },
  "Line Cook":       { name: "Line Cook",       description: "Reach Cooking Level 60",  category: "progression", progress: (s) => getSkillLevel(s.skills.cooking),   requirement: 60,  reward: { coins: 700  }, requires: ["Sous Chef"]       },
  "Head Chef":       { name: "Head Chef",       description: "Reach Cooking Level 70",  category: "progression", progress: (s) => getSkillLevel(s.skills.cooking),   requirement: 70,  reward: { coins: 1000 }, requires: ["Line Cook"]       },
  "Culinary Expert": { name: "Culinary Expert", description: "Reach Cooking Level 80",  category: "progression", progress: (s) => getSkillLevel(s.skills.cooking),   requirement: 80,  reward: { coins: 1500 }, requires: ["Head Chef"]       },
  "Master Chef":     { name: "Master Chef",     description: "Reach Cooking Level 90",  category: "progression", progress: (s) => getSkillLevel(s.skills.cooking),   requirement: 90,  reward: { coins: 2000 }, requires: ["Culinary Expert"] },
  "Legendary Chef":  { name: "Legendary Chef",  description: "Reach Cooking Level 100", category: "progression", progress: (s) => getSkillLevel(s.skills.cooking),   requirement: 100, reward: { coins: 3000 }, requires: ["Master Chef"]     },

  // -- Combat --
  "First Fight":      { name: "First Fight",      description: "Reach Combat Level 10",  category: "progression", progress: (s) => getSkillLevel(s.skills.combat),    requirement: 10,  reward: { coins: 50   } },
  "Brawler":          { name: "Brawler",          description: "Reach Combat Level 20",  category: "progression", progress: (s) => getSkillLevel(s.skills.combat),    requirement: 20,  reward: { coins: 100  }, requires: ["First Fight"]     },
  "Street Fighter":   { name: "Street Fighter",   description: "Reach Combat Level 30",  category: "progression", progress: (s) => getSkillLevel(s.skills.combat),    requirement: 30,  reward: { coins: 200  }, requires: ["Brawler"]         },
  "Warrior Initiate": { name: "Warrior Initiate", description: "Reach Combat Level 40",  category: "progression", progress: (s) => getSkillLevel(s.skills.combat),    requirement: 40,  reward: { coins: 350  }, requires: ["Street Fighter"]  },
  "Battle Hardened":  { name: "Battle Hardened",  description: "Reach Combat Level 50",  category: "progression", progress: (s) => getSkillLevel(s.skills.combat),    requirement: 50,  reward: { coins: 500  }, requires: ["Warrior Initiate"] },
  "Combat Expert":    { name: "Combat Expert",    description: "Reach Combat Level 60",  category: "progression", progress: (s) => getSkillLevel(s.skills.combat),    requirement: 60,  reward: { coins: 700  }, requires: ["Battle Hardened"] },
  "Veteran Fighter":  { name: "Veteran Fighter",  description: "Reach Combat Level 70",  category: "progression", progress: (s) => getSkillLevel(s.skills.combat),    requirement: 70,  reward: { coins: 1000 }, requires: ["Combat Expert"]   },
  "Elite Warrior":    { name: "Elite Warrior",    description: "Reach Combat Level 80",  category: "progression", progress: (s) => getSkillLevel(s.skills.combat),    requirement: 80,  reward: { coins: 1500 }, requires: ["Veteran Fighter"] },
  "War Hero":         { name: "War Hero",         description: "Reach Combat Level 90",  category: "progression", progress: (s) => getSkillLevel(s.skills.combat),    requirement: 90,  reward: { coins: 2000 }, requires: ["Elite Warrior"]   },
  "Master Warrior":   { name: "Master Warrior",   description: "Reach Combat Level 100", category: "progression", progress: (s) => getSkillLevel(s.skills.combat),    requirement: 100, reward: { coins: 3000 }, requires: ["War Hero"]        },

  // -- Fishing --
  "First Cast":       { name: "First Cast",       description: "Reach Fishing Level 10",  category: "progression", progress: (s) => getSkillLevel(s.skills.fishing),  requirement: 10,  reward: { coins: 50   } },
  "Pond Fisher":      { name: "Pond Fisher",      description: "Reach Fishing Level 20",  category: "progression", progress: (s) => getSkillLevel(s.skills.fishing),  requirement: 20,  reward: { coins: 100  }, requires: ["First Cast"]      },
  "River Fisher":     { name: "River Fisher",     description: "Reach Fishing Level 30",  category: "progression", progress: (s) => getSkillLevel(s.skills.fishing),  requirement: 30,  reward: { coins: 200  }, requires: ["Pond Fisher"]     },
  "Patient Angler":   { name: "Patient Angler",   description: "Reach Fishing Level 40",  category: "progression", progress: (s) => getSkillLevel(s.skills.fishing),  requirement: 40,  reward: { coins: 350  }, requires: ["River Fisher"]    },
  "Skilled Angler":   { name: "Skilled Angler",   description: "Reach Fishing Level 50",  category: "progression", progress: (s) => getSkillLevel(s.skills.fishing),  requirement: 50,  reward: { coins: 500  }, requires: ["Patient Angler"]  },
  "Lake Fisher":      { name: "Lake Fisher",      description: "Reach Fishing Level 60",  category: "progression", progress: (s) => getSkillLevel(s.skills.fishing),  requirement: 60,  reward: { coins: 700  }, requires: ["Skilled Angler"]  },
  "Deep Sea Fisher":  { name: "Deep Sea Fisher",  description: "Reach Fishing Level 70",  category: "progression", progress: (s) => getSkillLevel(s.skills.fishing),  requirement: 70,  reward: { coins: 1000 }, requires: ["Lake Fisher"]     },
  "Expert Angler":    { name: "Expert Angler",    description: "Reach Fishing Level 80",  category: "progression", progress: (s) => getSkillLevel(s.skills.fishing),  requirement: 80,  reward: { coins: 1500 }, requires: ["Deep Sea Fisher"] },
  "Fishing Veteran":  { name: "Fishing Veteran",  description: "Reach Fishing Level 90",  category: "progression", progress: (s) => getSkillLevel(s.skills.fishing),  requirement: 90,  reward: { coins: 2000 }, requires: ["Expert Angler"]   },
  "Master Angler":    { name: "Master Angler",    description: "Reach Fishing Level 100", category: "progression", progress: (s) => getSkillLevel(s.skills.fishing),  requirement: 100, reward: { coins: 3000 }, requires: ["Fishing Veteran"] },
  // ==========================================================================
  // HIDDEN ACHIEVEMENTS
  // ==========================================================================
  "Night Owl": {
    name: "Night Owl",
    description: "Play at 3 AM",
    category: "progression",
    progress: () => {
      const hour = new Date().getHours();
      return hour === 3 ? 1 : 0;
    },
    requirement: 1,
    reward: { experience: 25 },
    hidden: true,
  },
  "Speed Farmer": {
    name: "Speed Farmer",
    description: "Harvest 50 crops in 1 minute",
    category: "farming",
    progress: () => 0, // Tracked separately via timestamps
    requirement: 50,
    reward: { experience: 40 },
    hidden: true,
  },
  "Empty Pockets": {
    name: "Empty Pockets",
    description: "Have exactly 0 coins",
    category: "economy",
    progress: (state) => (state.balance.eq(0) ? 1 : 0),
    requirement: 1,
    reward: { experience: 15 },
    hidden: true,
  },
  "Full Barn": {
    name: "Full Barn",
    description: "Max out all animal slots",
    category: "animals",
    progress: (state) => {
      const chickens = Object.keys(state.chickens).length >= 10 ? 1 : 0;
      const cows = Object.keys(state.cows).length >= 5 ? 1 : 0;
      const sheep = Object.keys(state.sheep).length >= 5 ? 1 : 0;
      return chickens + cows + sheep;
    },
    requirement: 3,
    reward: { experience: 100 },
    hidden: true,
  },
  "Resource Millionaire": {
    name: "Resource Millionaire",
    description: "Have 1M total resources",
    category: "economy",
    progress: getTotalResources,
    requirement: 1000000,
    reward: { experience: 200 },
    hidden: true,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getAchievementsByCategory(
  category: AchievementCategory
): Achievement[] {
  return Object.values(ACHIEVEMENTS).filter((a) => a.category === category);
}

export function getUnlockedAchievements(
  achievements: Partial<Record<AchievementName, number>>
): AchievementName[] {
  return Object.keys(achievements) as AchievementName[];
}

export function isAchievementClaimable(
  state: GameState,
  name: AchievementName
): boolean {
  const achievement = ACHIEVEMENTS[name];
  if (!achievement) return false;

  // Already claimed
  if (state.achievements?.[name]) return false;

  // Check prerequisites
  if (achievement.requires) {
    for (const req of achievement.requires) {
      if (!state.achievements?.[req]) return false;
    }
  }

  // Check progress
  return achievement.progress(state) >= achievement.requirement;
}

export function getAchievementProgress(
  state: GameState,
  name: AchievementName
): { current: number; required: number; percentage: number } {
  const achievement = ACHIEVEMENTS[name];
  if (!achievement) {
    return { current: 0, required: 0, percentage: 0 };
  }

  const current = achievement.progress(state);
  const required = achievement.requirement;
  const percentage = Math.min((current / required) * 100, 100);

  return { current, required, percentage };
}

export function getTotalAchievementCount(): number {
  return Object.keys(ACHIEVEMENTS).length;
}

export function getClaimedAchievementCount(
  achievements: Partial<Record<AchievementName, number>>
): number {
  return Object.keys(achievements).length;
}
