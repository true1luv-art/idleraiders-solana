import { describe, it, expect } from "vitest";
import Decimal from "decimal.js-light";
import { catchFish } from "./catchFish";
import type { GameState } from "@/features/types/gameplay/game";
import { FISHING_BASE_COOLDOWN_MS } from "@/features/game/fishing";

const NOW          = 1_000_000_000;
const AFTER_COOLDOWN = NOW + FISHING_BASE_COOLDOWN_MS + 1;

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    balance:   new Decimal(0),
    inventory: {},
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
    stamina:   { current: 100, max: 100 },
    lastStaminaRegenAt: 0,
    skills:    { farming: 0, woodcutting: 0, forestry: 0, mining: 0, fishing: 0, cooking: 0, crafting: 0, husbandry: 0, combat: 0 },
    milestones: {},
    ...overrides,
  } as unknown as GameState;
}

describe("catchFish", () => {
  it("throws when not enough stamina", () => {
    const state = makeState({ stamina: { current: 0, max: 100 } });
    expect(() => catchFish({ state, action: { type: "fish.caught", createdAt: AFTER_COOLDOWN } })).toThrow("Not enough stamina to fish");
  });

  it("throws when fishing is on cooldown", () => {
    const state = makeState({ fishing: { lastCastAt: NOW, lastCaughtFish: null } });
    expect(() => catchFish({ state, action: { type: "fish.caught", createdAt: NOW + 1 } })).toThrow("Fishing is on cooldown");
  });

  it("adds a caught fish to inventory on success", () => {
    const state  = makeState();
    const result = catchFish({ state, action: { type: "fish.caught", createdAt: AFTER_COOLDOWN } });
    const fishInInventory = Object.values(result.inventory).some((v) => new Decimal(v ?? 0).toNumber() > 0);
    expect(fishInInventory).toBe(true);
  });

  it("updates lastCastAt and lastCaughtFish on success", () => {
    const state  = makeState();
    const result = catchFish({ state, action: { type: "fish.caught", createdAt: AFTER_COOLDOWN } });
    expect(result.fishing.lastCastAt).toBe(AFTER_COOLDOWN);
    expect(result.fishing.lastCaughtFish).not.toBeNull();
  });

  it("awards fishing XP and deducts stamina", () => {
    const state  = makeState();
    const result = catchFish({ state, action: { type: "fish.caught", createdAt: AFTER_COOLDOWN } });
    expect(result.skills.fishing).toBeGreaterThan(0);
    expect(result.stamina.current).toBeLessThan(100);
  });

  it("allows a cast exactly after the base cooldown elapses", () => {
    const state = makeState({ fishing: { lastCastAt: NOW, lastCaughtFish: null } });
    expect(() => catchFish({
      state,
      action: { type: "fish.caught", createdAt: NOW + FISHING_BASE_COOLDOWN_MS + 1 },
    })).not.toThrow();
  });
});
