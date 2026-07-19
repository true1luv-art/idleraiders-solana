import { craft, CraftAction } from "./craft";
import { sell, SellAction } from "./sell";
import { sellFood, SellFoodAction } from "./sellFood";
import { sellProduce, SellProduceAction } from "./sellProduce";
import { plant, PlantAction } from "./plant";
import { harvest, HarvestAction } from "./harvest";
import { mineGold, GoldMineAction } from "./goldMine";
import { mineStone, StoneMineAction } from "./stoneMine";
import { mineIron, IronMineAction } from "./ironMine";
import { chop, ChopAction } from "./chop";
import { openReward, OpenRewardAction } from "./rewarded";
import { staminaRegen, StaminaRegenAction } from "./staminaRegen";
import { feedChicken, FeedChickenAction } from "./feedChicken";
import { collectEgg, CollectEggAction } from "./collectEgg";
import { feedCow, FeedCowAction } from "./feedCow";
import { collectMilk, CollectMilkAction } from "./collectMilk";
import { feedSheep, FeedSheepAction } from "./feedSheep";
import { collectWool, CollectWoolAction } from "./collectWool";
import { walletDeposit, walletWithdraw, WalletDepositAction, WalletWithdrawAction } from "./wallet";
import { claimAchievement, ClaimAchievementAction } from "./claimAchievement";
import { catchFish, CatchFishAction } from "./catchFish";
import { startCooking, StartCookingAction } from "./startCooking";
import { collectCooked, CollectCookedAction } from "./collectCooked";

import { GameState } from "../types/game";

export type GameEvent =
  | CraftAction
  | SellAction
  | SellFoodAction
  | SellProduceAction
  | PlantAction
  | HarvestAction
  | StoneMineAction
  | IronMineAction
  | GoldMineAction
  | ChopAction
  | OpenRewardAction
  | StaminaRegenAction
  | FeedChickenAction
  | CollectEggAction
  | FeedCowAction
  | CollectMilkAction
  | FeedSheepAction
  | CollectWoolAction
  | WalletDepositAction
  | WalletWithdrawAction
  | ClaimAchievementAction
  | CatchFishAction
  | StartCookingAction
  | CollectCookedAction;

type EventName = Extract<GameEvent, { type: string }>["type"];

/**
 * Type which enables us to map the event name to the payload containing that event name
 */
type Handlers = {
  [Name in EventName]: (options: {
    state: GameState;
    // Extract the correct event payload from the list of events
    action: Extract<GameEvent, { type: Name }>;
  }) => GameState;
};

export const EVENTS: Handlers = {
  "item.planted": plant,
  "item.harvested": harvest,
  "item.crafted": craft,
  "item.sell": sell,
  "food.sell": sellFood,
  "produce.sell": sellProduce,
  "stone.mined": mineStone,
  "iron.mined": mineIron,
  "gold.mined": mineGold,
  "tree.chopped": chop,
  "reward.opened": openReward,
  "stamina.regenerate": staminaRegen,
  "chicken.feed": feedChicken,
  "chicken.collectEgg": collectEgg,
  "cow.feed": feedCow,
  "cow.collectMilk": collectMilk,
  "sheep.feed": feedSheep,
  "sheep.collectWool": collectWool,
  "wallet.deposit": walletDeposit,
  "wallet.withdraw": walletWithdraw,
  "achievement.claimed": claimAchievement,
  "fish.caught": catchFish,
  "food.startCooking": startCooking,
  "food.collectCooked": collectCooked,
};
