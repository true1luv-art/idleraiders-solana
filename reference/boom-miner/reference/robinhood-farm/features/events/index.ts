/**
 * Central event dispatcher for the farming game.
 * All event functions use an Options struct: { state, action, createdAt? }.
 * The processGameEvent function bridges the Zustand store's send() calls.
 *
 * Event implementations live in lib/events/<folder>/ and are imported here.
 */
import type { GameState } from "@/features/types/gameplay";

// ---------------------------------------------------------------------------
// Action union
// ---------------------------------------------------------------------------
import type { PlantAction }            from "@/features/events/plant/plant";
import type { HarvestAction }          from "@/features/events/harvest/harvest";
import type { ChopAction }             from "@/features/events/chop/chop";
import type { SellAction }             from "@/features/events/sell/sell";
import type { MineAction }             from "@/features/events/mine/mine";
import type { SellFoodAction }         from "@/features/events/sell/sellFood";
import type { ConsumeFoodAction }      from "@/features/events/consume/consumeFood";
import type { SellProduceAction }      from "@/features/events/sell/sellProduce";
import type { FeedChickenAction }      from "@/features/events/feed-animals/feedChicken";
import type { CollectEggAction }       from "@/features/events/collect-produce/collectEgg";
import type { FeedCowAction }          from "@/features/events/feed-animals/feedCow";
import type { CollectMilkAction }      from "@/features/events/collect-produce/collectMilk";
import type { FeedSheepAction }        from "@/features/events/feed-animals/feedSheep";
import type { CollectWoolAction }      from "@/features/events/collect-produce/collectWool";
import type { CatchFishAction }        from "@/features/events/fishing/catchFish";
import type { StaminaRegenAction }     from "@/features/events/stamina/staminaRegen";
import type { OpenRewardAction }       from "@/features/events/reward/rewarded";
import type { PurchaseAction }         from "@/features/events/purchase/purchase";
import type { CookFoodAction }         from "@/features/events/cooking/cookFood";
import type { SellFishAction }         from "@/features/events/sell/sellFish";

export type GameAction =
  | PlantAction
  | HarvestAction
  | PurchaseAction
  | ChopAction
  | MineAction
  | SellAction
  | SellFoodAction
  | ConsumeFoodAction
  | SellProduceAction
  | FeedChickenAction
  | CollectEggAction
  | FeedCowAction
  | CollectMilkAction
  | FeedSheepAction
  | CollectWoolAction
  | CatchFishAction
  | CookFoodAction
  | SellFishAction
  | StaminaRegenAction
  | OpenRewardAction;

export interface GameEvent {
  action: GameAction;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Function re-exports
// ---------------------------------------------------------------------------
export { plant }            from "@/features/events/plant/plant";
export { harvest }          from "@/features/events/harvest/harvest";
export { chop }             from "@/features/events/chop/chop";
export { mine }             from "@/features/events/mine/mine";
export { sell }             from "@/features/events/sell/sell";
export { sellFood }         from "@/features/events/sell/sellFood";
export { consumeFood }      from "@/features/events/consume/consumeFood";
export { sellProduce }      from "@/features/events/sell/sellProduce";
export { feedChicken }      from "@/features/events/feed-animals/feedChicken";
export { collectEgg }       from "@/features/events/collect-produce/collectEgg";
export { feedCow }          from "@/features/events/feed-animals/feedCow";
export { collectMilk }      from "@/features/events/collect-produce/collectMilk";
export { feedSheep }        from "@/features/events/feed-animals/feedSheep";
export { collectWool }      from "@/features/events/collect-produce/collectWool";
export { catchFish }        from "@/features/events/fishing/catchFish";
export { staminaRegen }     from "@/features/events/stamina/staminaRegen";
export { openReward }       from "@/features/events/reward/rewarded";
export { cookFood }         from "@/features/events/cooking/cookFood";
export { sellFish }         from "@/features/events/sell/sellFish";

// ---------------------------------------------------------------------------
// Central dispatcher
// ---------------------------------------------------------------------------
import { plant }            from "@/features/events/plant/plant";
import { harvest }          from "@/features/events/harvest/harvest";
import { chop }             from "@/features/events/chop/chop";
import { mine }             from "@/features/events/mine/mine";
import { sell }             from "@/features/events/sell/sell";
import { sellFood }         from "@/features/events/sell/sellFood";
import { consumeFood }      from "@/features/events/consume/consumeFood";
import { sellProduce }      from "@/features/events/sell/sellProduce";
import { feedChicken }      from "@/features/events/feed-animals/feedChicken";
import { collectEgg }       from "@/features/events/collect-produce/collectEgg";
import { feedCow }          from "@/features/events/feed-animals/feedCow";
import { collectMilk }      from "@/features/events/collect-produce/collectMilk";
import { feedSheep }        from "@/features/events/feed-animals/feedSheep";
import { collectWool }      from "@/features/events/collect-produce/collectWool";
import { catchFish }        from "@/features/events/fishing/catchFish";
import { staminaRegen }     from "@/features/events/stamina/staminaRegen";
import { openReward }       from "@/features/events/reward/rewarded";
import { purchase }         from "@/features/events/purchase/purchase";
import { cookFood }         from "@/features/events/cooking/cookFood";
import { sellFish }         from "@/features/events/sell/sellFish";

export function processGameEvent(state: GameState, event: GameEvent): GameState {
  const { action, createdAt } = event;
  try {
    switch (action.type) {
      case "item.planted":
        return plant({ state, action, createdAt });
      case "item.harvested":
        return harvest({ state, action, createdAt });
      case "tree.chopped":
        return chop({ state, action, createdAt });
      case "stone.mined":
      case "iron.mined":
      case "gold.mined":
        return mine({ state, action, createdAt });
      case "item.sell":
        return sell({ state, action });
      case "food.cook":
        return cookFood(state, action);
      case "food.sell":
        return sellFood({ state, action });
      case "food.consume":
        return consumeFood({ state, action });
      case "produce.sell":
        return sellProduce({ state, action });
      case "fish.sell":
        return sellFish({ state, action });
      case "chicken.feed":
        return feedChicken({ state, action, createdAt });
      case "chicken.collectEgg":
        return collectEgg({ state, action, createdAt });
      case "cow.feed":
        return feedCow({ state, action, createdAt });
      case "cow.collectMilk":
        return collectMilk({ state, action, createdAt });
      case "sheep.feed":
        return feedSheep({ state, action, createdAt });
      case "sheep.collectWool":
        return collectWool({ state, action, createdAt });
      case "fish.caught":
        return catchFish({ state, action });
      case "stamina.regenerate":
        return staminaRegen({ state, action });
      case "item.crafted":
        return purchase({ state, action });
      case "reward.opened":
        return openReward({ state, action, createdAt });
      default:
        return state;
    }
  } catch (e) {
    console.error("[v0] processGameEvent error:", (e as Error).message, action);
    return state;
  }
}
