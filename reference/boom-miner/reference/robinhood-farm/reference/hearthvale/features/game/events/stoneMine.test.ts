import Decimal from "decimal.js-light";
import { INITIAL_FARM } from "../lib/constants";
import { computeBonus, totalXpForLevel } from "../lib/skills";
import { GameState } from "../types/game";
import { mineStone, StoneMineAction } from "./stoneMine";

const GAME_STATE: GameState = {
  ...INITIAL_FARM,
};

describe("mineStone", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  it("throws an error if stone does not exist", () => {
    expect(() =>
      mineStone({
        state: GAME_STATE,
        action: {
          type: "stone.mined",
          index: 3,
        },
      })
    ).toThrow("No rock");
  });

  expect(() =>
    mineStone({
      state: GAME_STATE,
      action: {
        type: "stone.mined",
        index: -1,
      },
    })
  ).toThrow("No rock");

  it("throws an error if stone is not ready", () => {
    const payload = {
      state: GAME_STATE,
      action: {
        type: "stone.mined",
        index: 0,
      } as StoneMineAction,
    };
    const game = mineStone(payload);

    expect(() =>
      mineStone({
        state: game,
        action: payload.action,
      })
    ).toThrow("Rock is still recovering");
  });

  it("mines stone", () => {
    // Stone[0] has amount 2 in INITIAL_STONE
    const game = mineStone({
      state: GAME_STATE,
      action: {
        type: "stone.mined",
        index: 0,
      } as StoneMineAction,
    });

    expect(game.inventory.Stone).toEqual(new Decimal(2));
  });

  it("mines multiple stone", () => {
    // Stone[0]=2, Stone[1]=3 → total 5
    let game = mineStone({
      state: GAME_STATE,
      action: {
        type: "stone.mined",
        index: 0,
      } as StoneMineAction,
    });

    game = mineStone({
      state: game,
      action: {
        type: "stone.mined",
        index: 1,
      } as StoneMineAction,
    });

    expect(game.inventory.Stone).toEqual(new Decimal(5));
  });

  it("mines stone after waiting", () => {
    const payload = {
      state: GAME_STATE,
      action: {
        type: "stone.mined",
        index: 0,
      } as StoneMineAction,
    };
    let game = mineStone(payload);

    jest.advanceTimersByTime(5 * 60 * 60 * 1000);
    game = mineStone({
      ...payload,
      state: game,
    });

    expect(game.inventory.Stone?.toNumber()).toBeGreaterThanOrEqual(4);
  });
});
