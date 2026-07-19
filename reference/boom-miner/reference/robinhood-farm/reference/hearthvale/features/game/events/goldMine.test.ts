import Decimal from "decimal.js-light";
import { INITIAL_FARM } from "../lib/constants";
import { totalXpForLevel } from "../lib/skills";
import { GameState } from "../types/game";
import { mineGold, GoldMineAction, GOLD_MINING_LEVEL } from "./goldMine";

// State with enough mining XP to pass the Gold level gate
const GAME_STATE: GameState = {
  ...INITIAL_FARM,
  skills: {
    ...INITIAL_FARM.skills,
    mining: totalXpForLevel(GOLD_MINING_LEVEL),
  },
};

describe("mineGold", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it("throws an error if mining level is too low", () => {
    expect(() =>
      mineGold({
        state: INITIAL_FARM,
        action: {
          type: "gold.mined",
          index: 0,
        },
      })
    ).toThrow(`Requires Mining Level ${GOLD_MINING_LEVEL}`);
  });

  it("throws an error if Gold does not exist", () => {
    expect(() =>
      mineGold({
        state: GAME_STATE,
        action: {
          type: "gold.mined",
          index: 99,
        },
      })
    ).toThrow("No rock");
  });

  it("throws an error if Gold is not ready", () => {
    const payload = {
      state: GAME_STATE,
      action: {
        type: "gold.mined",
        index: 0,
      } as GoldMineAction,
    };
    const game = mineGold(payload);

    expect(() =>
      mineGold({
        state: game,
        action: payload.action,
      })
    ).toThrow("Rock is still recovering");
  });

  it("mines Gold", () => {
    const game = mineGold({
      state: GAME_STATE,
      action: {
        type: "gold.mined",
        index: 0,
      } as GoldMineAction,
    });

    expect(game.inventory.Gold).toEqual(new Decimal(2));
  });

  it("mines Gold after waiting", () => {
    const payload = {
      state: GAME_STATE,
      action: {
        type: "gold.mined",
        index: 0,
      } as GoldMineAction,
    };
    let game = mineGold(payload);

    jest.advanceTimersByTime(25 * 60 * 60 * 1000);
    game = mineGold({
      ...payload,
      state: game,
    });

    expect(game.inventory.Gold?.toNumber()).toBeGreaterThanOrEqual(2);
  });
});
