"use client";

import type { InventoryItemName } from "features/game/types/game";

import { useGameStore } from "./useGameStore";

/**
 * Ergonomic, narrow selectors so components only re-render when the slice
 * they actually read changes. Each hook subscribes to a single field of
 * `GameState`, mirroring the granularity of the old XState `useActor`
 * `gameState.context.state.*` reads.
 */

export const useBalance = () => useGameStore((s) => s.state.balance);
export const useInventory = () => useGameStore((s) => s.state.inventory);

export const useFields = () => useGameStore((s) => s.state.fields);
export const useTrees = () => useGameStore((s) => s.state.trees);
export const useStones = () => useGameStore((s) => s.state.stones);
export const useIron = () => useGameStore((s) => s.state.iron);
export const useGold = () => useGameStore((s) => s.state.gold);

export const useSkills = () => useGameStore((s) => s.state.skills);
export const useBonus  = () => useGameStore((s) => s.state.bonus);

/** Read a single inventory entry. Returns `undefined` if the item is absent. */
export const useItemCount = (item: InventoryItemName) =>
  useGameStore((s) => s.state.inventory[item]);

/** Convenience for components that only need to dispatch. */
export const useDispatch = () => useGameStore((s) => s.dispatch);

/** True once the persisted save has been read from `localStorage`. */
export const useHydrated = () => useGameStore((s) => s.hydrated);
