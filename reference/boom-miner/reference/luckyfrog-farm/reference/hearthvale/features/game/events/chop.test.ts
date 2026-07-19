import Decimal from "decimal.js-light";
import { INITIAL_FARM } from "../lib/constants";
import { GameState } from "../types/game";
import { chop, ChopAction } from "./chop";

const GAME_STATE: GameState = {
  ...INITIAL_FARM,
};

describe("chop", () => {
  it("throws an error if tree is not ready", () => {
    const payload = {
      state: GAME_STATE,
      action: {
        type: "tree.chopped",
        index: 0,
      } as ChopAction,
    };
    const game = chop(payload);

    expect(() =>
      chop({
        state: game,
        action: payload.action,
      })
    ).toThrow("Tree is still growing");
  });

  it("chops a tree", () => {
    // Tree[0] has amount 3 in INITIAL_TREES
    const game = chop({
      state: GAME_STATE,
      action: {
        type: "tree.chopped",
        index: 0,
      } as ChopAction,
    });

    expect(game.inventory.Wood).toEqual(new Decimal(3));
  });

  it("chops multiple trees", () => {
    // Tree[0] = 3 wood, Tree[1] = 4 wood → total 7
    let game = chop({
      state: GAME_STATE,
      action: {
        type: "tree.chopped",
        index: 0,
      } as ChopAction,
    });

    game = chop({
      state: game,
      action: {
        type: "tree.chopped",
        index: 1,
      } as ChopAction,
    });

    expect(game.inventory.Wood).toEqual(new Decimal(7));
  });
});
