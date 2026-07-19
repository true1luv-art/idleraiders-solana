import Decimal from "decimal.js-light";
import type { GameState } from "../types/game";

/**
 * Decimal-aware (de)serializer for the persisted game state.
 *
 * `decimal.js-light` instances stringify to `{}` by default, which would
 * silently corrupt every balance / inventory / skills entry on the first
 * page reload. We tag them on save and rehydrate on load.
 *
 * The shape of the tagged value (`{ __decimal: "123.45" }`) is private to
 * this module — nothing else should ever see it.
 */

const DECIMAL_TAG = "__decimal";

type TaggedDecimal = { [DECIMAL_TAG]: string };

const isTaggedDecimal = (value: unknown): value is TaggedDecimal =>
  typeof value === "object" &&
  value !== null &&
  DECIMAL_TAG in (value as Record<string, unknown>) &&
  typeof (value as Record<string, unknown>)[DECIMAL_TAG] === "string";

export const replacer = (_key: string, value: unknown): unknown => {
  if (value instanceof Decimal) {
    return { [DECIMAL_TAG]: value.toString() };
  }
  return value;
};

export const reviver = (_key: string, value: unknown): unknown => {
  if (isTaggedDecimal(value)) {
    return new Decimal(value[DECIMAL_TAG]);
  }
  return value;
};

export const serialize = (state: GameState): string =>
  JSON.stringify(state, replacer);

export const deserialize = (raw: string): GameState =>
  JSON.parse(raw, reviver) as GameState;
