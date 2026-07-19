import { describe, it, expect } from "vitest";
import Decimal from "decimal.js-light";
import { consumeFood } from "./consumeFood";
import type { GameState } from "@/features/types/gameplay/game";

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    balance:   new Decimal(100),
    inventory: { "Baked Potato": new Decimal(3) },
    fields:    {},
    trees:     {},
    stones:    {},
    iron:      {},
    gold:      {},
    chickens:  {},
    cows:      {},
    sheep:     {},
    fishing:   { lastCastAt: 0, lastCaughtFish: null },
    cooking:   null,
    stamina:   { current: 50, max: 100 },
    lastStaminaRegenAt: 0,
    skills:    { farming: 0, woodcutting: 0, forestry: 0, mining: 0, fishing: 0, cooking: 0, crafting: 0, husbandry: 0, combat: 0 },
    milestones: {},
    ...overrides,
  } as unknown as GameState;
}

describe("consumeFood", () => {
  it("restores stamina and deducts food from inventory", () => {
    const state  = makeState();
    const result = consumeFood({ state, action: { type: "food.consume", item: "Baked Potato", amount: 1 } });
    expect(result.stamina.current).toBeGreaterThan(50);
    expect(new Decimal(result.inventory["Baked Potato"]!).toNumber()).toBe(2);
  });

  it("caps stamina at max", () => {
    const state  = makeState({ stamina: { current: 99, max: 100 } });
    const result = consumeFood({ state, action: { type: "food.consume", item: "Baked Potato", amount: 1 } });
    expect(result.stamina.current).toBeLessThanOrEqual(100);
  });

  it("throws when item is not a food", () => {
    const state = makeState({ inventory: { Wood: new Decimal(5) } });
    expect(() =>
      consumeFood({ state, action: { type: "food.consume", item: "Wood" as never, amount: 1 } }),
    ).toThrow("Not a food item");
  });

  it("throws when amount is zero or negative", () => {
    const state = makeState();
    expect(() =>
      consumeFood({ state, action: { type: "food.consume", item: "Baked Potato", amount: 0 } }),
    ).toThrow("Invalid amount");
  });

  it("throws when not enough food in inventory", () => {
    const state = makeState({ inventory: { "Baked Potato": new Decimal(1) } });
    expect(() =>
      consumeFood({ state, action: { type: "food.consume", item: "Baked Potato", amount: 5 } }),
    ).toThrow("Insufficient food to eat");
  });

  it("throws when stamina is already full", () => {
    const state = makeState({ stamina: { current: 100, max: 100 } });
    expect(() =>
      consumeFood({ state, action: { type: "food.consume", item: "Baked Potato", amount: 1 } }),
    ).toThrow("Stamina is already full");
  });
});
