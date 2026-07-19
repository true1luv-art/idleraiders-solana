import Decimal from "decimal.js-light";
import {
  GameNode,
  GameState,
  InventoryItemName,
} from "../types/game";

/**
 * Converts API response into a game state
 */
export function makeGame(farm: any): GameState {
  return {
    inventory: Object.keys(farm.inventory).reduce(
      (items, item) => ({
        ...items,
        [item]: new Decimal(farm.inventory[item]),
      }),
      {} as Record<InventoryItemName, Decimal>
    ),
    trees: Object.keys(farm.trees).reduce(
      (items, item) => ({
        ...items,
        [item]: {
          ...farm.trees[item],
          amount: Number(farm.trees[item].amount ?? farm.trees[item].wood ?? 3),
        },
      }),
      {} as Record<number, GameNode>
    ),
    stones: Object.keys(farm.stones).reduce(
      (items, item) => ({
        ...items,
        [item]: {
          ...farm.stones[item],
          amount: Number(farm.stones[item].amount),
        },
      }),
      {} as Record<number, GameNode>
    ),
    iron: Object.keys(farm.iron).reduce(
      (items, item) => ({
        ...items,
        [item]: {
          ...farm.iron[item],
          amount: Number(farm.iron[item].amount),
        },
      }),
      {} as Record<number, GameNode>
    ),
    gold: Object.keys(farm.gold).reduce(
      (items, item) => ({
        ...items,
        [item]: {
          ...farm.gold[item],
          amount: Number(farm.gold[item].amount),
        },
      }),
      {} as Record<number, GameNode>
    ),
    balance: new Decimal(farm.balance),
    fields: farm.fields,
    id: farm.id,
    // Stamina - with migration support for existing saves
    stamina: farm.stamina || { current: 100, max: 100 },
    lastStaminaRegenAt: farm.lastStaminaRegenAt || Date.now(),
  };
}

type Nodes = Record<number, GameNode>;

/**
 * Updates a node with the new amount from the server RNG response
 */
function updateNodes(oldNodes: Nodes, newNodes: Nodes): Nodes {
  return Object.keys(oldNodes).reduce((acc, id) => {
    const key = Number(id);
    return {
      ...acc,
      [key]: {
        ...oldNodes[key],
        amount: newNodes[key]?.amount ?? oldNodes[key].amount,
      } as GameNode,
    };
  }, {} as Record<number, GameNode>);
}

/**
 * Merge RNG from server
 */
export function updateGame(
  newGameState: GameState,
  oldGameState: GameState
): GameState {
  if (!newGameState) {
    return oldGameState;
  }

  // Only update random number values generated from the server
  try {
    return {
      ...oldGameState,
      // Update random reward on field nodes
      fields: Object.keys(oldGameState.fields).reduce((fields, fieldId) => {
        const id = Number(fieldId);
        const field = oldGameState.fields[id];
        return {
          ...fields,
          [id]: {
            ...field,
            reward: newGameState.fields[id]?.reward,
          },
        };
      }, {} as Record<number, GameNode>),
      // Update tree with the random amount from the server
      trees: updateNodes(oldGameState.trees, newGameState.trees),
      stones: updateNodes(oldGameState.stones, newGameState.stones),
      iron: updateNodes(oldGameState.iron, newGameState.iron),
      gold: updateNodes(oldGameState.gold, newGameState.gold),
      stamina: newGameState.stamina || oldGameState.stamina,
      lastStaminaRegenAt:
        newGameState.lastStaminaRegenAt || oldGameState.lastStaminaRegenAt,
    };
  } catch (e) {
    console.log({ e });
    return oldGameState;
  }
}
