import Decimal from "decimal.js-light";
import { INITIAL_FARM } from "../lib/constants";
import { SEEDS } from "../types/crops";
import { GameState } from "../types/game";
import { craft } from "./craft";

const GAME_STATE: GameState = INITIAL_FARM;

describe("craft", () => {
  it("throws an error if item is not craftable", () => {
    expect(() =>
      craft({
        state: GAME_STATE,
        action: {
          type: "item.crafted",
          item: "Hearthvale Statue",
          amount: 1,
        },
      })
    ).toThrow("This item is not craftable: Hearthvale");
  });

  it("does not craft item if there is not enough funds", () => {
    expect(() =>
      craft({
        state: {
          ...GAME_STATE,
          balance: new Decimal(0),
        },
        action: {
          type: "item.crafted",
          item: "Potato Seed",
          amount: 1,
        },
      })
    ).toThrow("Insufficient tokens");
  });

  it("crafts item with sufficient balance", () => {
    const state = craft({
      state: {
        ...GAME_STATE,
        balance: new Decimal(1),
      },
      action: {
        type: "item.crafted",
        item: "Potato Seed",
        amount: 1,
      },
    });

    expect(state.balance).toEqual(
      new Decimal(1).minus(SEEDS()["Potato Seed"].price)
    );
    expect(state.inventory["Potato Seed"]).toEqual(new Decimal(11));
  });

  it("does not craft an item with an unusual amount", () => {
    expect(() =>
      craft({
        state: {
          ...GAME_STATE,
          balance: new Decimal(1),
        },
        action: {
          type: "item.crafted",
          item: "Potato Seed",
          amount: 0.2,
        },
      })
    ).toThrow("Invalid amount");
  });

  it("does not craft item if there is insufficient ingredients", () => {
    expect(() =>
      craft({
        state: {
          ...GAME_STATE,
          balance: new Decimal(10),
          inventory: {},
        },
        action: {
          type: "item.crafted",
          item: "Firewood",
          amount: 1,
        },
      })
    ).toThrow("Insufficient ingredient: Wood");
  });

  it("crafts item with sufficient ingredients", () => {
    const state = craft({
      state: {
        ...GAME_STATE,
        balance: new Decimal(0),
        inventory: { Wood: new Decimal(10) },
      },
      action: {
        type: "item.crafted",
        item: "Firewood",
        amount: 1,
      },
    });

    expect(state.inventory["Firewood"]).toEqual(new Decimal(1));
    expect(state.inventory["Wood"]).toEqual(new Decimal(8));
  });

  it("crafts item in bulk given sufficient balance", () => {
    const state = craft({
      state: {
        ...GAME_STATE,
        balance: new Decimal(1),
      },
      action: {
        type: "item.crafted",
        item: "Potato Seed",
        amount: 10,
      },
    });

    expect(state.balance).toEqual(
      new Decimal(1).sub(SEEDS()["Potato Seed"].price.mul(10))
    );
    expect(state.inventory["Potato Seed"]).toEqual(new Decimal(20));
  });

  it("crafts item in bulk given sufficient ingredients", () => {
    const state = craft({
      state: {
        ...GAME_STATE,
        balance: new Decimal(0),
        inventory: { Wood: new Decimal(20) },
      },
      action: {
        type: "item.crafted",
        item: "Firewood",
        amount: 5,
      },
    });

    expect(state.inventory["Firewood"]).toEqual(new Decimal(5));
    expect(state.inventory["Wood"]).toEqual(new Decimal(10));
  });

  it("does not craft in bulk given insufficient ingredients", () => {
    expect(() =>
      craft({
        state: {
          ...GAME_STATE,
          balance: new Decimal(0),
          inventory: { Wood: new Decimal(3) },
        },
        action: {
          type: "item.crafted",
          item: "Firewood",
          amount: 5,
        },
      })
    ).toThrow("Insufficient ingredient: Wood");
  });
});
