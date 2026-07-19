/**
 * Provides game context to consumer components.
 *
 * Phase 6 (Zustand Complete): All components now use `useGameStore`
 * directly for state and dispatch. This provider only handles:
 * - `shortcutItem`: Quick-select for inventory items
 * - `selectedItem`: Currently selected inventory item
 *
 * The `gameService` property has been removed — all state management
 * now goes through `useGameStore` selectors and `dispatch`.
 */
import { useState, useCallback } from "react";
import React from "react";

import { cacheShortcuts, getShortcuts } from "features/hud/lib/shortcuts";

import { InventoryItemName } from "./types/game";

interface GameContext {
  shortcutItem: (item: InventoryItemName) => void;
  selectedItem?: InventoryItemName;
}

export const Context = React.createContext<GameContext>({} as GameContext);

export const GameProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [shortcuts, setShortcuts] = useState<InventoryItemName[]>(
    getShortcuts(),
  );

  const shortcutItem = useCallback((item: InventoryItemName) => {
    const items = cacheShortcuts(item);
    setShortcuts(items);
  }, []);

  const selectedItem = shortcuts.length > 0 ? shortcuts[0] : undefined;

  return (
    <Context.Provider value={{ shortcutItem, selectedItem }}>
      {children}
    </Context.Provider>
  );
};
