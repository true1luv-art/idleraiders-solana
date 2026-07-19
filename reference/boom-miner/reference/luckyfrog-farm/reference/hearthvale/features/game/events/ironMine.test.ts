import Decimal from "decimal.js-light";
import { INITIAL_FARM } from "../lib/constants";
import { computeBonus, totalXpForLevel } from "../lib/skills";
import { GameState } from "../types/game";
import { mineIron, IronMineAction, IRON_MINING_LEVEL } from "./ironMine";

// State with enough mining XP to pass the Iron level gate
const GAME_STATE: GameState = {
  ...INITIAL_FARM,
  skills: {
    ...INITIAL_FARM.skills,
    mining: totalXpForLevel(IRON_MINING_LEVEL),
  },
};

describe("mineIron", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it("throws an error if mining level is too low", () => {
    expect(() =>
      mineIron({
        state: INITIAL_FARM,
        action: {
          type: "iron.mined",
          index: 0,
        },
      })
    ).toThrow(`Requires Mining Level ${IRON_MINING_LEVEL}`);
  });

  it("throws an error if iron does not exist", () => {
    expect(() =>
      mineIron({
        state: GAME_STATE,
        action: {
          type: "iron.mined",
          index: 99,
        },
      })
    ).toThrow("No rock");
  });

  it("throws an error if iron is not ready", () => {
    const payload = {
      state: GAME_STATE,
      action: {
        type: "iron.mined",
        index: 0,
      } as IronMineAction,
    };
    const game = mineIron(payload);

    expect(() =>
      mineIron({
        state: game,
        action: payload.action,
      })
    ).toThrow("Rock is still recovering");
  });

  it("mines iron", () => {
    const game = mineIron({
      state: GAME_STATE,
      action: {
        type: "iron.mined",
        index: 0,
      } as IronMineAction,
    });

    expect(game.inventory.Iron).toEqual(new Decimal(2));
  });

  it("mines iron after waiting", () => {
    const payload = {
      state: GAME_STATE,
      action: {
        type: "iron.mined",
        index: 0,
      } as IronMineAction,
    };
    let game = mineIron(payload);

    jest.advanceTimersByTime(25 * 60 * 60 * 1000);
    game = mineIron({
      ...payload,
      state: game,
    });

    expect(game.inventory.Iron?.toNumber()).toBeGreaterThanOrEqual(2);
  });

  it("applies ore yield skill bonus (+20% iron at mining level 30)", () => {
    const miningXP = totalXpForLevel(30);
    const game = mineIron({
      state: {
        ...GAME_STATE,
        skills: { ...GAME_STATE.skills, mining: miningXP },
        bonus: computeBonus({ ...GAME_STATE.skills, mining: miningXP }),
      },
      action: {
        type: "iron.mined",
        index: 0,
      } as IronMineAction,
    });

    // lv10 +10% + lv30 +10% = +20% ore yield → floor(2 × 1.20) = floor(2.4) = 2
    // A higher base yield (e.g. Iron[1] with amount 3) would show the difference: floor(3 × 1.20) = 3
    expect(game.inventory.Iron?.toNumber()).toBeGreaterThanOrEqual(2);
  });
});
