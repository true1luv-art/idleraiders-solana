import { describe, it, expect } from "vitest";
import Decimal from "decimal.js-light";
import { mine } from "./mine";
import type { GameState } from "@/features/types/gameplay/game";
import {
  STONE_RECOVERY_SECONDS,
  IRON_RECOVERY_SECONDS,
  GOLD_RECOVERY_SECONDS,
} from "@/features/game/resources";

const FULL_STAMINA = 100;

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    balance:   new Decimal(0),
    inventory: {},
    fields:    {},
    trees:     {},
    stones:    { 0: { name: "Stone", minedAt: 0 } },
    iron:      { 0: { name: "Iron",  minedAt: 0 } },
    gold:      { 0: { name: "Gold",  minedAt: 0 } },
    chickens:  {},
    cows:      {},
    sheep:     {},
    fishing:   { lastCastAt: 0, lastCaughtFish: null },
    cooking:   null,
    stamina:   { current: FULL_STAMINA, max: FULL_STAMINA },
    lastStaminaRegenAt: 0,
    skills:    { farming: 0, woodcutting: 0, forestry: 0, mining: 0, fishing: 0, cooking: 0, crafting: 0, husbandry: 0, combat: 0 },
    draw:      { ...INITIAL_DRAW },
    milestones: {},
    ...overrides,
  } as unknown as GameState;
}

const PAST = -(STONE_RECOVERY_SECONDS * 1000 + 1);

describe("mine — stone", () => {
  it("yields Stone and records minedAt", () => {
    const state  = makeState();
    const now    = Date.now();
    const result = mine({ state, action: { type: "stone.mined", index: 0 }, createdAt: now });
    expect(new Decimal(result.inventory["Stone"] ?? 0).toNumber()).toBeGreaterThanOrEqual(1);
    expect((result.stones as Record<number, { minedAt: number }>)[0].minedAt).toBe(now);
  });

  it("throws when rock is still recovering", () => {
    const now   = Date.now();
    const state = makeState({ stones: { 0: { name: "Stone", minedAt: now } } });
    expect(() =>
      mine({ state, action: { type: "stone.mined", index: 0 }, createdAt: now }),
    ).toThrow("recovering");
  });

  it("throws when stamina is insufficient", () => {
    const state = makeState({ stamina: { current: 0, max: FULL_STAMINA } });
    expect(() =>
      mine({ state, action: { type: "stone.mined", index: 0 }, createdAt: Date.now() }),
    ).toThrow("stamina");
  });

  it("throws when rock index does not exist", () => {
    const state = makeState({ stones: {} });
    expect(() =>
      mine({ state, action: { type: "stone.mined", index: 99 }, createdAt: Date.now() }),
    ).toThrow("No rock");
  });

  it("increments mining skill XP", () => {
    const state  = makeState();
    const result = mine({ state, action: { type: "stone.mined", index: 0 }, createdAt: Date.now() });
    expect(result.skills.mining).toBeGreaterThan(0);
  });

  it("tracks Stone Mined milestone", () => {
    const state  = makeState();
    const result = mine({ state, action: { type: "stone.mined", index: 0 }, createdAt: Date.now() });
    expect(result.milestones["Stone Mined"]).toBeGreaterThanOrEqual(1);
  });
});

describe("mine — iron", () => {
  it("yields Iron after recovery period", () => {
    const state  = makeState();
    const result = mine({ state, action: { type: "iron.mined", index: 0 }, createdAt: Date.now() });
    expect(new Decimal(result.inventory["Iron"] ?? 0).toNumber()).toBeGreaterThanOrEqual(1);
  });

  it("throws when iron node is still recovering", () => {
    const now   = Date.now();
    const state = makeState({ iron: { 0: { name: "Iron", minedAt: now } } });
    expect(() =>
      mine({ state, action: { type: "iron.mined", index: 0 }, createdAt: now }),
    ).toThrow("recovering");
  });
});

describe("mine — gold", () => {
  it("yields Gold after recovery period", () => {
    const state  = makeState();
    const result = mine({ state, action: { type: "gold.mined", index: 0 }, createdAt: Date.now() });
    expect(new Decimal(result.inventory["Gold"] ?? 0).toNumber()).toBeGreaterThanOrEqual(1);
  });

  it("throws when gold node is still recovering", () => {
    const now   = Date.now();
    const state = makeState({ gold: { 0: { name: "Gold", minedAt: now } } });
    expect(() =>
      mine({ state, action: { type: "gold.mined", index: 0 }, createdAt: now }),
    ).toThrow("recovering");
  });
});
