/**
 * features/farm-action/farm-action.test.ts
 *
 * Consolidated unit tests for farm-action validators across sprints 2.2–2.4.
 *
 * §2.2-B  buildServerGameState
 * §2.2-D  inventoryDiff
 * §2.3-A  serverPlant
 * §2.3-B  serverHarvest
 * §2.3-C  serverChop / serverMineStone / serverMineIron / serverMineGold
 * §2.3-D  applyStaminaRegen
 * §2.3-E  field unlock gate
 * §2.4-A  serverFeedChicken / serverFeedCow / serverFeedSheep
 * §2.4-B  serverCollectEgg / serverCollectMilk / serverCollectWool
 * §2.4-C  serverCatchFish
 * §2.4-D  serverStartCooking / serverCollectCooked
 *
 * No MongoDB or DOM dependencies — all tests operate on plain objects.
 */

import { describe, it, expect, beforeEach } from "vitest";
import Decimal from "decimal.js-light";
import { buildServerGameState } from "./build-state";
import { inventoryDiff } from "./persist";
import {
  applyStaminaRegen,
  serverPlant,
  serverHarvest,
  serverChop,
  serverMineStone,
  serverMineIron,
  serverMineGold,
  serverFeedChicken,
  serverFeedCow,
  serverFeedSheep,
  serverCollectEgg,
  serverCollectMilk,
  serverCollectWool,
  serverCatchFish,
  serverStartCooking,
  serverCollectCooked,
} from "@/features/farm-action/validate";
import type { GameState } from "@/features/types/gameplay/game";
import { INITIAL_SKILLS } from "@/features/types/gameplay/skills";
import { totalXpForLevel } from "@/features/game/skills";
import { ANIMALS_CONFIG } from "@/features/game/animals";
import { FISHING_BASE_COOLDOWN_MS } from "@/features/game/fishing";
import {
  TREE_RECOVERY_SECONDS,
  STONE_RECOVERY_SECONDS,
  IRON_RECOVERY_SECONDS,
  GOLD_RECOVERY_SECONDS,
} from "@/features/game/resources";
import type {
  IFarm,
  FieldNode,
  ResourceNode,
  AnimalNode,
  FishingState,
  StaminaState,
} from "@/lib/modules/farms/types.server";
import type { IInventory } from "@/lib/modules/inventories/types.server";
import type { IPlayer } from "@/lib/modules/players/types.server";
import type { PlayerSkills } from "@/features/types/players";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const HOUR_MS = 60 * 60 * 1000;
const NOW     = 1_700_000_000_000; // fixed epoch for deterministic tests

// ---------------------------------------------------------------------------
// Helpers — build minimal stubs (§2.2)
// ---------------------------------------------------------------------------

function makeFarm(overrides: Partial<IFarm> = {}): IFarm {
  return {
    playerId:  "wallet123",
    fields:    {},
    trees:     {},
    stones:    {},
    iron:      {},
    gold:      {},
    chickens:  {},
    cows:      {},
    sheep:     {},
    fishing:   { lastCastAt: 0, lastCaughtFish: null } as FishingState,
    cooking:   null,
    stamina:   { current: 100, max: 100, lastRegenAt: 1000000 } as StaminaState,
    milestones: {},
    createdAt:  new Date(),
    updatedAt:  new Date(),
    ...overrides,
  } as unknown as IFarm;
}

function makeInventory(overrides: Partial<IInventory> = {}): IInventory {
  return {
    playerId:  "wallet123",
    items:     {},
    balance:   0,
    updatedAt: new Date(),
    ...overrides,
  } as unknown as IInventory;
}

function makePlayer(skillsOverride: Partial<PlayerSkills> = {}): IPlayer {
  return {
    wallet:   "wallet123",
    username: "TestFarmer",
    skills: {
      farming: 0, woodcutting: 0, mining: 0, fishing: 0,
      cooking: 0, crafting: 0, husbandry: 0, combat: 0,
      ...skillsOverride,
    },
  } as unknown as IPlayer;
}

// ---------------------------------------------------------------------------
// Helpers — build minimal GameState (§2.3 / §2.4)
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    id:                 undefined,
    username:           undefined,
    avatarUrl:          undefined,
    balance:            new Decimal(1000),
    fields:             {},
    trees:              {},
    stones:             {},
    iron:               {},
    gold:               {},
    chickens:           {},
    cows:               {},
    sheep:              {},
    inventory: {
      Chicken: new Decimal(2),
      Cow:     new Decimal(1),
      Sheep:   new Decimal(1),
      Wheat:   new Decimal(5),
      Kale:    new Decimal(5),
      Cabbage: new Decimal(5),
      Potato:  new Decimal(10),
      Wood:    new Decimal(10),
      Stone:   new Decimal(10),
      Iron:    new Decimal(10),
    },
    farmAddress:        undefined,
    skills:             { ...INITIAL_SKILLS, farming: totalXpForLevel(10) },
    stamina:            { current: 100, max: 100 },
    lastStaminaRegenAt: NOW,
    fishing:            { lastCastAt: 0, lastCaughtFish: null },
    cooking:            null,
    milestones:         {},
    ...overrides,
  } as unknown as GameState;
}

function withSeeds(state: GameState, seedName: string, qty: number): GameState {
  return { ...state, inventory: { ...state.inventory, [seedName]: new Decimal(qty) } };
}

function withStamina(state: GameState, current: number): GameState {
  return { ...state, stamina: { ...state.stamina, current } };
}

// ============================================================================
// §2.2-B  buildServerGameState
// ============================================================================

describe("buildServerGameState", () => {
  it("returns a valid GameState from empty farm + inventory", () => {
    const state = buildServerGameState(makeFarm(), makeInventory(), makePlayer());
    expect(state.balance).toBeInstanceOf(Decimal);
    expect(state.balance.toNumber()).toBe(0);
    expect(state.fields).toEqual({});
    expect(state.inventory).toEqual({});
    expect(state.stamina.current).toBe(100);
    expect(state.stamina.max).toBe(100);
    expect(state.lastStaminaRegenAt).toBe(1000000);
    expect(state.skills.farming).toBe(0);
  });

  it("converts balance from MongoDB number to Decimal", () => {
    const state = buildServerGameState(makeFarm(), makeInventory({ balance: 42.5 }), makePlayer());
    expect(state.balance).toBeInstanceOf(Decimal);
    expect(state.balance.toNumber()).toBe(42.5);
  });

  it("converts items from MongoDB numbers to Decimal in inventory", () => {
    const inv   = makeInventory({ items: { Potato: 10, Wood: 5 } as Record<string, number> });
    const state = buildServerGameState(makeFarm(), inv, makePlayer());
    expect(state.inventory["Potato"]).toBeInstanceOf(Decimal);
    expect((state.inventory["Potato"] as Decimal).toNumber()).toBe(10);
    expect((state.inventory["Wood"] as Decimal).toNumber()).toBe(5);
  });

  it("excludes zero-quantity items from inventory", () => {
    const inv   = makeInventory({ items: { Potato: 0, Carrot: 3 } as Record<string, number> });
    const state = buildServerGameState(makeFarm(), inv, makePlayer());
    expect(state.inventory["Potato"]).toBeUndefined();
    expect((state.inventory["Carrot"] as Decimal).toNumber()).toBe(3);
  });

  it("maps fields from string keys to number keys", () => {
    const farm  = makeFarm({ fields: { "0": { name: "Potato", plantedAt: 1000 } as FieldNode, "5": { name: "Carrot", plantedAt: 2000 } as FieldNode } });
    const state = buildServerGameState(farm, makeInventory(), makePlayer());
    expect(state.fields[0].name).toBe("Potato");
    expect(state.fields[0].plantedAt).toBe(1000);
    expect(state.fields[5].name).toBe("Carrot");
  });

  it("maps trees with choppedAt from harvestedAt", () => {
    const farm  = makeFarm({ trees: { "0": { name: "Wood", harvestedAt: 9999 } as ResourceNode } });
    const state = buildServerGameState(farm, makeInventory(), makePlayer());
    expect(state.trees[0].choppedAt).toBe(9999);
  });

  it("maps ore nodes with minedAt from harvestedAt", () => {
    const farm  = makeFarm({ stones: { "1": { name: "Stone", harvestedAt: 8888 } as ResourceNode } });
    const state = buildServerGameState(farm, makeInventory(), makePlayer());
    expect(state.stones[1].minedAt).toBe(8888);
  });

  it("maps chickens from string keys to number keys", () => {
    const farm  = makeFarm({ chickens: { "0": { type: "Chicken", fedAt: 5000, multiplier: 1.2 } as AnimalNode } });
    const state = buildServerGameState(farm, makeInventory(), makePlayer());
    expect(state.chickens[0].fedAt).toBe(5000);
    expect(state.chickens[0].multiplier).toBe(1.2);
  });

  it("preserves woodcutting and farming skill XP", () => {
    const player = makePlayer({ woodcutting: 250, farming: 1500 });
    const state  = buildServerGameState(makeFarm(), makeInventory(), player);
    expect(state.skills.woodcutting).toBe(250);
    expect(state.skills.farming).toBe(1500);
  });

  it("sets fishing state from farm document", () => {
    const farm  = makeFarm({ fishing: { lastCastAt: 12345, lastCaughtFish: "Carp" } as FishingState });
    const state = buildServerGameState(farm, makeInventory(), makePlayer());
    expect(state.fishing.lastCastAt).toBe(12345);
    expect(state.fishing.lastCaughtFish).toBe("Carp");
  });

  it("sets cooking to null when farm.cooking is null", () => {
    const state = buildServerGameState(makeFarm({ cooking: null }), makeInventory(), makePlayer());
    expect(state.cooking).toBeNull();
  });

  it("returns default GameState when farm is null", () => {
    const state = buildServerGameState(null, makeInventory(), makePlayer());
    expect(state.fields).toEqual({});
    expect(state.stamina.current).toBe(100);
  });

  it("returns default GameState when inventory is null", () => {
    const state = buildServerGameState(makeFarm(), null, makePlayer());
    expect(state.balance.toNumber()).toBe(0);
    expect(state.inventory).toEqual({});
  });

  it("username is populated from player document", () => {
    const state = buildServerGameState(makeFarm(), makeInventory(), makePlayer());
    expect(state.username).toBe("TestFarmer");
  });
});

// ============================================================================
// §2.2-D  inventoryDiff
// ============================================================================

describe("inventoryDiff", () => {
  function inv(items: Record<string, number>) {
    const result: Record<string, Decimal> = {};
    for (const [k, v] of Object.entries(items)) result[k] = new Decimal(v);
    return result as unknown as import("@/features/types/gameplay/game").Inventory;
  }

  it("returns empty diffs when inventories are equal", () => {
    const { added, removed } = inventoryDiff(inv({ Potato: 5 }), inv({ Potato: 5 }));
    expect(added).toEqual({});
    expect(removed).toEqual({});
  });

  it("detects items added", () => {
    const { added, removed } = inventoryDiff(inv({}), inv({ Wood: 3 }));
    expect(added).toEqual({ Wood: 3 });
    expect(removed).toEqual({});
  });

  it("detects items removed", () => {
    const { added, removed } = inventoryDiff(inv({ Potato: 10 }), inv({ Potato: 7 }));
    expect(removed).toEqual({ Potato: 3 });
    expect(added).toEqual({});
  });

  it("handles item completely consumed", () => {
    const { added, removed } = inventoryDiff(inv({ "Potato Seed": 1 }), inv({}));
    expect(removed).toEqual({ "Potato Seed": 1 });
    expect(added).toEqual({});
  });

  it("handles multiple items simultaneously added and removed", () => {
    const { added, removed } = inventoryDiff(
      inv({ Potato: 5, Wood: 2, "Carrot Seed": 3 }),
      inv({ Potato: 8, Wood: 0, Carrot: 1 }),
    );
    expect(added).toEqual({ Potato: 3, Carrot: 1 });
    expect(removed).toEqual({ Wood: 2, "Carrot Seed": 3 });
  });

  it("handles empty old and new inventories", () => {
    const { added, removed } = inventoryDiff(inv({}), inv({}));
    expect(added).toEqual({});
    expect(removed).toEqual({});
  });

  it("treats fractional Decimal changes correctly", () => {
    const { added } = inventoryDiff(inv({ Gold: 1 }), inv({ Gold: 3 }));
    expect(added.Gold).toBe(2);
  });
});

// ============================================================================
// §2.3-D  applyStaminaRegen
// ============================================================================

describe("applyStaminaRegen", () => {
  it("does not regen when no interval has elapsed", () => {
    const state = makeState({ stamina: { current: 50, max: 100 }, lastStaminaRegenAt: NOW });
    const out   = applyStaminaRegen(state, NOW + 30_000);
    expect(out.stamina.current).toBe(50);
    expect(out.lastStaminaRegenAt).toBe(NOW);
  });

  it("regens one interval (5% of max) after 1 hour", () => {
    const state = makeState({ stamina: { current: 50, max: 100 }, lastStaminaRegenAt: NOW });
    const out   = applyStaminaRegen(state, NOW + HOUR_MS);
    expect(out.stamina.current).toBe(55);
    expect(out.lastStaminaRegenAt).toBe(NOW + HOUR_MS);
  });

  it("caps regen at max stamina", () => {
    const state = makeState({ stamina: { current: 98, max: 100 }, lastStaminaRegenAt: NOW });
    const out   = applyStaminaRegen(state, NOW + HOUR_MS * 3);
    expect(out.stamina.current).toBe(100);
  });

  it("caps offline regen at 8 intervals maximum", () => {
    const state = makeState({ stamina: { current: 0, max: 100 }, lastStaminaRegenAt: NOW });
    const out   = applyStaminaRegen(state, NOW + HOUR_MS * 24);
    expect(out.stamina.current).toBe(40);
  });

  it("advances lastStaminaRegenAt by capped intervals", () => {
    const state = makeState({ stamina: { current: 0, max: 100 }, lastStaminaRegenAt: NOW });
    const out   = applyStaminaRegen(state, NOW + HOUR_MS * 24);
    expect(out.lastStaminaRegenAt).toBe(NOW + HOUR_MS * 8);
  });
});

// ============================================================================
// §2.3-A / §2.3-E  serverPlant
// ============================================================================

describe("serverPlant", () => {
  it("plants a seed successfully", () => {
    const state = withSeeds(makeState(), "Potato Seed", 3);
    const next  = serverPlant(state, { type: "item.planted", item: "Potato Seed", index: 0 }, NOW);
    expect(next.fields[0].name).toBe("Potato");
    expect((next.inventory as Record<string, Decimal>)["Potato Seed"].toNumber()).toBe(2);
  });

  it("throws when field index is out of range", () => {
    const state = withSeeds(makeState(), "Potato Seed", 1);
    expect(() => serverPlant(state, { type: "item.planted", item: "Potato Seed", index: 72 }, NOW))
      .toThrow("Field does not exist");
  });

  it("throws when field is locked (requires higher farming level)", () => {
    const state = withSeeds(makeState({ skills: { ...INITIAL_SKILLS, farming: 0 } }), "Potato Seed", 1);
    expect(() => serverPlant(state, { type: "item.planted", item: "Potato Seed", index: 15 }, NOW))
      .toThrow("Farming Level");
  });

  it("allows planting when farming level is sufficient for the field", () => {
    const state = withSeeds(makeState({ skills: { ...INITIAL_SKILLS, farming: 1575 } }), "Potato Seed", 1);
    expect(serverPlant(state, { type: "item.planted", item: "Potato Seed", index: 6 }, NOW).fields[6]).toBeDefined();
  });

  it("throws when field is already occupied", () => {
    const state = withSeeds(makeState({ fields: { 0: { name: "Potato", plantedAt: NOW - 1000 } } }), "Potato Seed", 2);
    expect(() => serverPlant(state, { type: "item.planted", item: "Potato Seed", index: 0 }, NOW))
      .toThrow("already planted");
  });

  it("throws when no seed item is given", () => {
    expect(() => serverPlant(makeState(), { type: "item.planted", index: 0 }, NOW))
      .toThrow("No seed selected");
  });

  it("throws when a non-seed item is given", () => {
    const state = makeState({ inventory: { Wood: new Decimal(5) } } as Partial<GameState>);
    expect(() => serverPlant(state, { type: "item.planted", item: "Wood", index: 0 }, NOW))
      .toThrow("Not a seed");
  });

  it("throws when player does not have enough seeds", () => {
    const state = withSeeds(makeState(), "Potato Seed", 0);
    expect(() => serverPlant(state, { type: "item.planted", item: "Potato Seed", index: 0 }, NOW))
      .toThrow("Not enough seeds");
  });

  it("enforces seed farming level requirement", () => {
    const state = withSeeds(makeState({ skills: { ...INITIAL_SKILLS, farming: 0 } }), "Kale Seed", 1);
    expect(() => serverPlant(state, { type: "item.planted", item: "Kale Seed", index: 0 }, NOW))
      .toThrow("Seed requires Farming Level 15");
  });
});

// ============================================================================
// §2.3-B  serverHarvest
// ============================================================================

const POTATO_GROW_MS = 60 * 1000;

describe("serverHarvest", () => {
  function makeHarvestState(plantedAt: number, stamina = 100): GameState {
    return makeState({
      stamina:            { current: stamina, max: 100 },
      lastStaminaRegenAt: NOW,
      fields:             { 0: { name: "Potato", plantedAt } },
      inventory:          {},
    });
  }

  it("harvests a mature crop and adds to inventory", () => {
    const next = serverHarvest(makeHarvestState(NOW - POTATO_GROW_MS - 1000), { type: "item.harvested", index: 0 }, NOW);
    expect(next.fields[0]).toBeUndefined();
    expect((next.inventory as Record<string, Decimal>)["Potato"].greaterThan(0)).toBe(true);
  });

  it("deducts stamina after harvest", () => {
    const next = serverHarvest(makeHarvestState(NOW - POTATO_GROW_MS - 1000, 10), { type: "item.harvested", index: 0 }, NOW);
    expect(next.stamina.current).toBe(9);
  });

  it("awards farming XP", () => {
    const next = serverHarvest(makeHarvestState(NOW - POTATO_GROW_MS - 1000), { type: "item.harvested", index: 0 }, NOW);
    expect(next.skills.farming).toBeGreaterThan(0);
  });

  it("throws when crop is not yet mature", () => {
    expect(() => serverHarvest(makeHarvestState(NOW - POTATO_GROW_MS + 5000), { type: "item.harvested", index: 0 }, NOW))
      .toThrow("Not ready");
  });

  it("throws when stamina is insufficient", () => {
    const state = { ...withStamina(makeHarvestState(NOW - POTATO_GROW_MS - 1000), 0), lastStaminaRegenAt: NOW };
    expect(() => serverHarvest(state, { type: "item.harvested", index: 0 }, NOW))
      .toThrow("stamina");
  });

  it("throws when field is empty", () => {
    expect(() => serverHarvest(makeState(), { type: "item.harvested", index: 0 }, NOW))
      .toThrow("Nothing was planted");
  });

  it("regens stamina before checking sufficiency", () => {
    const state = { ...makeHarvestState(NOW - POTATO_GROW_MS - 1000, 0), lastStaminaRegenAt: NOW - HOUR_MS * 2 };
    expect(() => serverHarvest(state, { type: "item.harvested", index: 0 }, NOW)).not.toThrow();
  });
});

// ============================================================================
// §2.3-C  serverChop
// ============================================================================

describe("serverChop", () => {
  const TREE_RECOVERED_AT = NOW - TREE_RECOVERY_SECONDS * 1000 - 1000;

  function makeChopState(choppedAt: number, stamina = 100): GameState {
    return makeState({ stamina: { current: stamina, max: 100 }, lastStaminaRegenAt: NOW, trees: { 0: { name: "Wood", choppedAt } } });
  }

  it("chops a recovered tree and adds Wood to inventory", () => {
    const next = serverChop(makeChopState(TREE_RECOVERED_AT), { type: "tree.chopped", index: 0 }, NOW);
    expect((next.inventory as Record<string, Decimal>)["Wood"]?.greaterThan(0)).toBe(true);
    expect(next.trees[0].choppedAt).toBe(NOW);
  });

  it("awards woodcutting XP", () => {
    const next = serverChop(makeChopState(TREE_RECOVERED_AT), { type: "tree.chopped", index: 0 }, NOW);
    expect(next.skills.woodcutting).toBeGreaterThan(0);
  });

  it("throws when tree is still growing", () => {
    expect(() => serverChop(makeChopState(NOW - 60_000), { type: "tree.chopped", index: 0 }, NOW))
      .toThrow("still growing");
  });

  it("throws when tree node does not exist", () => {
    expect(() => serverChop(makeState(), { type: "tree.chopped", index: 99 }, NOW))
      .toThrow("No tree");
  });

  it("throws when stamina is 0 and no regen pending", () => {
    const state = { ...makeChopState(TREE_RECOVERED_AT, 0), lastStaminaRegenAt: NOW };
    expect(() => serverChop(state, { type: "tree.chopped", index: 0 }, NOW))
      .toThrow("stamina");
  });
});

// ============================================================================
// §2.3-C  serverMineStone / serverMineIron / serverMineGold
// ============================================================================

describe("serverMineStone", () => {
  const RECOVERED_AT = NOW - STONE_RECOVERY_SECONDS * 1000 - 1000;

  it("mines a recovered stone and adds Stone to inventory", () => {
    const state = makeState({ stones: { 0: { name: "Stone", minedAt: RECOVERED_AT } }, stamina: { current: 100, max: 100 }, lastStaminaRegenAt: NOW });
    expect((serverMineStone(state, { type: "stone.mined", index: 0 }, NOW).inventory as Record<string, Decimal>)["Stone"]?.greaterThan(0)).toBe(true);
  });

  it("throws when stone is still recovering", () => {
    const state = makeState({ stones: { 0: { name: "Stone", minedAt: NOW - HOUR_MS } }, stamina: { current: 100, max: 100 }, lastStaminaRegenAt: NOW });
    expect(() => serverMineStone(state, { type: "stone.mined", index: 0 }, NOW)).toThrow("still recovering");
  });

  it("throws when no stone node exists", () => {
    expect(() => serverMineStone(makeState(), { type: "stone.mined", index: 0 }, NOW)).toThrow("No rock");
  });
});

describe("serverMineIron", () => {
  const RECOVERED_AT = NOW - IRON_RECOVERY_SECONDS * 1000 - 1000;

  it("mines recovered iron and awards mining XP", () => {
    const state = makeState({ iron: { 0: { name: "Iron", minedAt: RECOVERED_AT } }, stamina: { current: 100, max: 100 }, lastStaminaRegenAt: NOW });
    const next  = serverMineIron(state, { type: "iron.mined", index: 0 }, NOW);
    expect(next.skills.mining).toBeGreaterThan(0);
    expect((next.inventory as Record<string, Decimal>)["Iron"]?.greaterThan(0)).toBe(true);
  });

  it("throws when iron is still recovering", () => {
    const state = makeState({ iron: { 0: { name: "Iron", minedAt: NOW - HOUR_MS * 2 } }, stamina: { current: 100, max: 100 }, lastStaminaRegenAt: NOW });
    expect(() => serverMineIron(state, { type: "iron.mined", index: 0 }, NOW)).toThrow("still recovering");
  });
});

describe("serverMineGold", () => {
  const RECOVERED_AT = NOW - GOLD_RECOVERY_SECONDS * 1000 - 1000;

  it("mines recovered gold and adds Gold to inventory", () => {
    const state = makeState({ gold: { 0: { name: "Gold", minedAt: RECOVERED_AT } }, stamina: { current: 100, max: 100 }, lastStaminaRegenAt: NOW });
    expect((serverMineGold(state, { type: "gold.mined", index: 0 }, NOW).inventory as Record<string, Decimal>)["Gold"]?.greaterThan(0)).toBe(true);
  });

  it("throws when gold is still recovering", () => {
    const state = makeState({ gold: { 0: { name: "Gold", minedAt: NOW - HOUR_MS * 4 } }, stamina: { current: 100, max: 100 }, lastStaminaRegenAt: NOW });
    expect(() => serverMineGold(state, { type: "gold.mined", index: 0 }, NOW)).toThrow("still recovering");
  });
});

// ============================================================================
// §2.3-E  Field unlock gate
// ============================================================================

describe("field unlock gate (§2.3-E)", () => {
  const lockedCases: [number, number][] = [
    [6,  3],
    [9,  5],
    [15, 10],
    [24, 20],
    [27, 25],
  ];

  for (const [fieldIndex, requiredLevel] of lockedCases) {
    it(`blocks field ${fieldIndex} when farming level < ${requiredLevel}`, () => {
      const state = withSeeds(makeState({ skills: { ...INITIAL_SKILLS, farming: 0 } }), "Potato Seed", 5);
      expect(() => serverPlant(state, { type: "item.planted", item: "Potato Seed", index: fieldIndex }, NOW))
        .toThrow("Farming Level");
    });
  }

  it("fields 0–5 are always unlocked at level 1", () => {
    const state = withSeeds(makeState({ skills: { ...INITIAL_SKILLS, farming: 0 } }), "Potato Seed", 10);
    for (let i = 0; i <= 5; i++) {
      expect(() => serverPlant(state, { type: "item.planted", item: "Potato Seed", index: i }, NOW)).not.toThrow();
    }
  });
});

// ============================================================================
// §2.4-A  Animal feed
// ============================================================================

describe("serverFeedChicken (§2.4-A)", () => {
  it("feeds a hungry chicken and deducts Wheat", () => {
    const result = serverFeedChicken(makeState(), { type: "chicken.feed", index: 0 }, NOW);
    expect(result.chickens[0].fedAt).toBe(NOW);
    expect(new Decimal(result.inventory.Wheat!).toNumber()).toBe(4);
    expect(result.milestones["Animal Fed"]).toBe(1);
  });

  it("throws when chicken index is out of range", () => {
    expect(() => serverFeedChicken(makeState(), { type: "chicken.feed", index: 2 }, NOW))
      .toThrow("Chicken does not exist");
  });

  it("throws when chicken is already fed and not re-hungry", () => {
    const state = makeState({ chickens: { 0: { fedAt: NOW - 10_000, multiplier: 1 } } });
    expect(() => serverFeedChicken(state, { type: "chicken.feed", index: 0 }, NOW))
      .toThrow("Chicken is not hungry");
  });

  it("allows re-feeding when re-hunger delay has passed", () => {
    const fedAt  = NOW - ANIMALS_CONFIG.Chicken.produceTimeMs - ANIMALS_CONFIG.Chicken.reHungerDelayMs - 1000;
    const result = serverFeedChicken(makeState({ chickens: { 0: { fedAt, multiplier: 1 } } }), { type: "chicken.feed", index: 0 }, NOW);
    expect(result.chickens[0].fedAt).toBe(NOW);
  });

  it("throws when there is not enough Wheat", () => {
    const state = makeState({ inventory: { ...makeState().inventory, Wheat: new Decimal(0) } });
    expect(() => serverFeedChicken(state, { type: "chicken.feed", index: 0 }, NOW))
      .toThrow("Not enough Wheat");
  });
});

describe("serverFeedCow (§2.4-A)", () => {
  it("feeds a hungry cow and deducts Kale", () => {
    const result = serverFeedCow(makeState(), { type: "cow.feed", index: 0 }, NOW);
    expect(result.cows[0].fedAt).toBe(NOW);
    expect(new Decimal(result.inventory.Kale!).toNumber()).toBe(4);
  });

  it("throws when cow is already fed", () => {
    const state = makeState({ cows: { 0: { fedAt: NOW - 1000, multiplier: 1 } } });
    expect(() => serverFeedCow(state, { type: "cow.feed", index: 0 }, NOW)).toThrow("Cow is not hungry");
  });

  it("allows re-feeding after re-hunger delay", () => {
    const fedAt  = NOW - ANIMALS_CONFIG.Cow.produceTimeMs - ANIMALS_CONFIG.Cow.reHungerDelayMs - 1000;
    const result = serverFeedCow(makeState({ cows: { 0: { fedAt, multiplier: 1 } } }), { type: "cow.feed", index: 0 }, NOW);
    expect(result.cows[0].fedAt).toBe(NOW);
  });

  it("throws with insufficient Kale", () => {
    const state = makeState({ inventory: { ...makeState().inventory, Kale: new Decimal(0) } });
    expect(() => serverFeedCow(state, { type: "cow.feed", index: 0 }, NOW)).toThrow("Not enough Kale");
  });
});

describe("serverFeedSheep (§2.4-A)", () => {
  it("feeds a hungry sheep and deducts Cabbage", () => {
    const result = serverFeedSheep(makeState(), { type: "sheep.feed", index: 0 }, NOW);
    expect(result.sheep[0].fedAt).toBe(NOW);
    expect(new Decimal(result.inventory.Cabbage!).toNumber()).toBe(4);
  });

  it("throws when sheep is already fed", () => {
    const state = makeState({ sheep: { 0: { fedAt: NOW - 1000, multiplier: 1 } } });
    expect(() => serverFeedSheep(state, { type: "sheep.feed", index: 0 }, NOW)).toThrow("Sheep is not hungry");
  });

  it("allows re-feeding after re-hunger delay", () => {
    const fedAt  = NOW - ANIMALS_CONFIG.Sheep.produceTimeMs - ANIMALS_CONFIG.Sheep.reHungerDelayMs - 1000;
    const result = serverFeedSheep(makeState({ sheep: { 0: { fedAt, multiplier: 1 } } }), { type: "sheep.feed", index: 0 }, NOW);
    expect(result.sheep[0].fedAt).toBe(NOW);
  });
});

// ============================================================================
// §2.4-B  Animal produce collection
// ============================================================================

describe("serverCollectEgg (§2.4-B)", () => {
  it("collects egg when time has elapsed and resets chicken", () => {
    const fedAt  = NOW - ANIMALS_CONFIG.Chicken.produceTimeMs - 1000;
    const state  = makeState({ inventory: { ...makeState().inventory, Egg: new Decimal(0) }, chickens: { 0: { fedAt, multiplier: 1 } } });
    const result = serverCollectEgg(state, { type: "chicken.collectEgg", index: 0 }, NOW);
    expect(new Decimal(result.inventory.Egg!).toNumber()).toBeGreaterThanOrEqual(1);
    expect(result.chickens[0].fedAt).toBeUndefined();
    expect(result.skills.husbandry).toBeGreaterThan(0);
  });

  it("throws when chicken has not been fed", () => {
    expect(() => serverCollectEgg(makeState({ chickens: {} }), { type: "chicken.collectEgg", index: 0 }, NOW))
      .toThrow("Chicken has not been fed");
  });

  it("throws when egg is not ready yet", () => {
    const state = makeState({ chickens: { 0: { fedAt: NOW - 1000, multiplier: 1 } } });
    expect(() => serverCollectEgg(state, { type: "chicken.collectEgg", index: 0 }, NOW))
      .toThrow("Egg is not ready yet");
  });

  it("throws when chicken index is out of range", () => {
    const fedAt = NOW - ANIMALS_CONFIG.Chicken.produceTimeMs - 1000;
    const state = makeState({ chickens: { 0: { fedAt, multiplier: 1 } } });
    expect(() => serverCollectEgg(state, { type: "chicken.collectEgg", index: 5 }, NOW))
      .toThrow("Chicken does not exist");
  });
});

describe("serverCollectMilk (§2.4-B)", () => {
  it("collects milk when time has elapsed and resets cow", () => {
    const fedAt  = NOW - ANIMALS_CONFIG.Cow.produceTimeMs - 1000;
    const state  = makeState({ inventory: { ...makeState().inventory, Milk: new Decimal(0) }, cows: { 0: { fedAt, multiplier: 1 } } });
    const result = serverCollectMilk(state, { type: "cow.collectMilk", index: 0 }, NOW);
    expect(new Decimal(result.inventory.Milk!).toNumber()).toBeGreaterThanOrEqual(1);
    expect(result.cows[0].fedAt).toBeUndefined();
    expect(result.skills.husbandry).toBeGreaterThan(0);
  });

  it("throws when milk is not ready yet", () => {
    const state = makeState({ cows: { 0: { fedAt: NOW - 1000, multiplier: 1 } } });
    expect(() => serverCollectMilk(state, { type: "cow.collectMilk", index: 0 }, NOW)).toThrow("Milk is not ready yet");
  });

  it("throws when cow has not been fed", () => {
    expect(() => serverCollectMilk(makeState(), { type: "cow.collectMilk", index: 0 }, NOW)).toThrow("Cow has not been fed");
  });

  it("throws when cow index is out of range", () => {
    const fedAt = NOW - ANIMALS_CONFIG.Cow.produceTimeMs - 1000;
    const state = makeState({ cows: { 0: { fedAt, multiplier: 1 } } });
    expect(() => serverCollectMilk(state, { type: "cow.collectMilk", index: 3 }, NOW)).toThrow("Cow does not exist");
  });
});

describe("serverCollectWool (§2.4-B)", () => {
  it("collects wool when time has elapsed and resets sheep", () => {
    const fedAt  = NOW - ANIMALS_CONFIG.Sheep.produceTimeMs - 1000;
    const state  = makeState({ inventory: { ...makeState().inventory, Wool: new Decimal(0) }, sheep: { 0: { fedAt, multiplier: 1 } } });
    const result = serverCollectWool(state, { type: "sheep.collectWool", index: 0 }, NOW);
    expect(new Decimal(result.inventory.Wool!).toNumber()).toBeGreaterThanOrEqual(1);
    expect(result.sheep[0].fedAt).toBeUndefined();
    expect(result.skills.husbandry).toBeGreaterThan(0);
  });

  it("throws when wool is not ready yet", () => {
    const state = makeState({ sheep: { 0: { fedAt: NOW - 1000, multiplier: 1 } } });
    expect(() => serverCollectWool(state, { type: "sheep.collectWool", index: 0 }, NOW)).toThrow("Wool is not ready yet");
  });

  it("throws when sheep has not been fed", () => {
    expect(() => serverCollectWool(makeState(), { type: "sheep.collectWool", index: 0 }, NOW)).toThrow("Sheep has not been fed");
  });
});

// ============================================================================
// §2.4-C  Fishing
// ============================================================================

describe("serverCatchFish (§2.4-C)", () => {
  const castAt = NOW - FISHING_BASE_COOLDOWN_MS - 1000;

  it("catches a fish when off cooldown and has stamina", () => {
    const result = serverCatchFish(makeState({ fishing: { lastCastAt: castAt, lastCaughtFish: null } }), { type: "fish.caught", createdAt: NOW });
    expect(result.fishing.lastCastAt).toBe(NOW);
    expect(result.fishing.lastCaughtFish).not.toBeNull();
    expect(result.stamina.current).toBe(97);
    expect(result.skills.fishing).toBeGreaterThan(0);
  });

  it("throws when fishing is still on cooldown", () => {
    const state = makeState({ fishing: { lastCastAt: NOW - 5000, lastCaughtFish: null } });
    expect(() => serverCatchFish(state, { type: "fish.caught", createdAt: NOW })).toThrow("Fishing is on cooldown");
  });

  it("throws when there is not enough stamina", () => {
    const state = makeState({ stamina: { current: 2, max: 100 }, fishing: { lastCastAt: castAt, lastCaughtFish: null } });
    expect(() => serverCatchFish(state, { type: "fish.caught", createdAt: NOW })).toThrow("Not enough stamina");
  });

  it("only catches level-0 fish at fishing level 1", () => {
    const result = serverCatchFish(makeState({ fishing: { lastCastAt: castAt, lastCaughtFish: null } }), { type: "fish.caught", createdAt: NOW });
    expect(["Anchovy", "Sardine", "Tilapia", "Herring"]).toContain(result.fishing.lastCaughtFish);
  });
});

// ============================================================================
// §2.4-D  Cooking
// ============================================================================

describe("serverStartCooking (§2.4-D)", () => {
  it("starts cooking Roasted Potato and deducts ingredients", () => {
    const result = serverStartCooking(makeState(), { type: "food.startCooking", item: "Roasted Potato" }, NOW);
    expect(result.cooking!.item).toBe("Roasted Potato");
    expect(result.cooking!.startedAt).toBe(NOW);
    expect(new Decimal(result.inventory.Potato!).toNumber()).toBe(8);
    expect(result.skills.cooking).toBeGreaterThan(0);
  });

  it("throws when kitchen is already busy", () => {
    const state = makeState({ cooking: { item: "Roasted Potato", startedAt: NOW - 5000, duration: 30 } });
    expect(() => serverStartCooking(state, { type: "food.startCooking", item: "Carrot Stew" }, NOW))
      .toThrow("Kitchen is already busy");
  });

  it("throws with an unknown food item", () => {
    expect(() => serverStartCooking(makeState(), { type: "food.startCooking", item: "Mystery Dish" as never }, NOW))
      .toThrow("Unknown food item");
  });

  it("throws when ingredients are insufficient", () => {
    const state = makeState({ inventory: { ...makeState().inventory, Potato: new Decimal(0) } });
    expect(() => serverStartCooking(state, { type: "food.startCooking", item: "Roasted Potato" }, NOW))
      .toThrow("Not enough ingredients");
  });
});

describe("serverCollectCooked (§2.4-D)", () => {
  it("collects cooked food once duration has elapsed", () => {
    const state  = makeState({ inventory: { ...makeState().inventory, "Roasted Potato": new Decimal(0) }, cooking: { item: "Roasted Potato", startedAt: NOW - 31_000, duration: 30 } });
    const result = serverCollectCooked(state, { type: "food.collectCooked" }, NOW);
    expect(result.cooking).toBeNull();
    expect(new Decimal(result.inventory["Roasted Potato"]!).toNumber()).toBeGreaterThanOrEqual(1);
  });

  it("throws when nothing is cooking", () => {
    expect(() => serverCollectCooked(makeState(), { type: "food.collectCooked" }, NOW)).toThrow("Nothing is cooking");
  });

  it("throws when food is not ready yet", () => {
    const state = makeState({ cooking: { item: "Roasted Potato", startedAt: NOW - 5000, duration: 30 } });
    expect(() => serverCollectCooked(state, { type: "food.collectCooked" }, NOW)).toThrow("Food is not ready yet");
  });
});
