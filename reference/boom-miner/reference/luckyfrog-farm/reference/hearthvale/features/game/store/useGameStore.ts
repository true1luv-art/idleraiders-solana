"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { INITIAL_FARM } from "features/game/lib/constants";
import { INITIAL_SKILLS, INITIAL_BONUS } from "features/game/types/skills";
import { INITIAL_EQUIPMENT, INITIAL_BASE_STATS, computeStats } from "features/game/types/equipment";
import { computeBonus, getSkillLevel, getSkillXPForLevel } from "features/game/lib/skills";
import { getLevelFromExperience } from "features/game/lib/experience";
import { processEvent } from "features/game/lib/processEvent";
import { generateAvatarUrl } from "features/game/lib/avatar";
import type { GameEvent } from "features/game/events";
import type { GameState } from "features/game/types/game";

import { replacer, reviver } from "./serializer";

type PastAction = GameEvent & { createdAt: number };

export interface GameStore {
  /** The single source of truth for the farm. */
  state: GameState;
  /** Audit log of every dispatched event (useful for devtools / undo). */
  actions: PastAction[];
  /** Becomes `true` once Zustand has hydrated from `localStorage`. */
  hydrated: boolean;
  /** Apply a game event, identical in shape to the old XState `send`. */
  dispatch: (event: GameEvent) => void;
  /** Wipe progress and start a brand-new farm. */
  reset: () => void;
  /** Internal: mark hydration complete. */
  setHydrated: () => void;
  /** Set the player's username. */
  setUsername: (username: string) => void;
}

const STORAGE_KEY = "hearthvale:save";

/** Only the slice of the store that actually gets persisted. */
type PersistedGameStore = Pick<GameStore, "state" | "actions">;

/**
 * Avoid touching `localStorage` on the server. Next.js renders the layout
 * (and any non-`"use client"` boundary above this store) on the server, so
 * accessing `window` directly would crash the build. `createJSONStorage`
 * lazily resolves the storage on the client.
 */
const storage = createJSONStorage<PersistedGameStore>(
  () => {
    if (typeof window === "undefined") {
      // Return a no-op storage for SSR. Persist will skip writes.
      return {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      };
    }
    return window.localStorage;
  },
  { replacer, reviver },
);

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      state: INITIAL_FARM,
      actions: [],
      hydrated: false,
      dispatch: (event) =>
        set((store) => ({
          state: processEvent(store.state, event),
          actions: [...store.actions, { ...event, createdAt: Date.now() }],
        })),
      reset: () =>
        set(() => ({
          state: INITIAL_FARM,
          actions: [],
        })),
      setHydrated: () => set({ hydrated: true }),
      setUsername: (username: string) =>
        set((store) => ({
          state: { 
            ...store.state, 
            username,
            avatarUrl: generateAvatarUrl(username),
          },
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 19, // v19 — add kitchen cooking slot
      storage,
      // Only persist game data — never the `hydrated` flag or function refs.
      partialize: (store) => ({
        state: store.state,
        actions: store.actions,
      }),
      // Strip legacy fields from old saves and ensure starter seeds exist
      migrate: (persistedState, _version) => {
        const saved = persistedState as PersistedGameStore;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const legacyState = saved.state as any;

        // Strip fields that no longer exist on GameState
        const { relics, relicsCrafted, relicSupply, pigs, buildings, ...cleanState } = legacyState;

        // v16: strip tool items from saved inventories
        // v17: also strip Plank
        const {
          Axe,
          Pickaxe,
          "Stone Pickaxe": _stonePick,
          "Iron Pickaxe": _ironPick,
          Hammer,
          Rod,
          Plank,
          ...cleanInventory
        } = (cleanState.inventory ?? {}) as Record<string, unknown>;
        void Axe; void Pickaxe; void _stonePick; void _ironPick; void Hammer; void Rod; void Plank;
        cleanState.inventory = cleanInventory;

        // Ensure players always have at least 10 Potato Seeds to start with
        const existingSeeds = Number(cleanState.inventory?.["Potato Seed"] ?? 0);
        // v18: ensure feed crops and starter animals exist for existing saves
        const existingKale    = Number(cleanState.inventory?.["Kale"]    ?? 0);
        const existingCabbage = Number(cleanState.inventory?.["Cabbage"] ?? 0);
        const existingChicken = Number(cleanState.inventory?.["Chicken"] ?? 0);
        const existingCow     = Number(cleanState.inventory?.["Cow"]     ?? 0);
        const existingSheep   = Number(cleanState.inventory?.["Sheep"]   ?? 0);

        return {
          ...saved,
          state: {
            ...cleanState,
            activity:     cleanState.activity     ?? {},
            achievements: cleanState.achievements ?? {},
            inventory: {
              ...cleanState.inventory,
              "Potato Seed": Math.max(existingSeeds, 10),
              "Kale":        Math.max(existingKale,    10),
              "Cabbage":     Math.max(existingCabbage, 10),
              "Chicken":     Math.max(existingChicken,  2),
              "Cow":         Math.max(existingCow,      1),
              "Sheep":       Math.max(existingSheep,    1),
            },
            // v13: migrate old tree nodes that used `wood` instead of `amount`
            trees: Object.fromEntries(
              Object.entries(cleanState.trees ?? {}).map(([k, v]: [string, any]) => [
                k,
                v.name
                  ? v
                  : { name: "Wood", choppedAt: v.choppedAt ?? 0, amount: Number(v.wood ?? v.amount ?? 3) },
              ])
            ),
            stones: Object.fromEntries(
              Object.entries(cleanState.stones ?? {}).map(([k, v]: [string, any]) => [
                k,
                v.name ? v : { name: "Stone", minedAt: v.minedAt ?? 0, amount: Number(v.amount ?? 2) },
              ])
            ),
            iron: Object.fromEntries(
              Object.entries(cleanState.iron ?? {}).map(([k, v]: [string, any]) => [
                k,
                v.name ? v : { name: "Iron", minedAt: v.minedAt ?? 0, amount: Number(v.amount ?? 2) },
              ])
            ),
            gold: Object.fromEntries(
              Object.entries(cleanState.gold ?? {}).map(([k, v]: [string, any]) => [
                k,
                v.name ? v : { name: "Gold", minedAt: v.minedAt ?? 0, amount: Number(v.amount ?? 2) },
              ])
            ),
            fields: Object.fromEntries(
              Object.entries(cleanState.fields ?? {}).map(([k, v]: [string, any]) => [
                k,
                { name: v.name, plantedAt: v.plantedAt ?? 0, amount: v.amount ?? 1 },
              ])
            ),
            // v12: default baseStats and recompute derived stats
            baseStats: cleanState.baseStats ?? { ...INITIAL_BASE_STATS },
            stats: computeStats(
              cleanState.baseStats ?? INITIAL_BASE_STATS,
              cleanState.equipment ?? INITIAL_EQUIPMENT,
            ),
            // v14: rename equipment slot "special" -> "accessory"
            equipment: (() => {
              const eq = cleanState.equipment ?? { ...INITIAL_EQUIPMENT };
              if ((eq as any).special !== undefined && eq.accessory === undefined) {
                const { special, ...rest } = eq as any;
                return { ...rest, accessory: special };
              }
              return eq;
            })(),
            // v15: backfill farming XP from old state.experience for saves that
            //      predate the skills-first system. state.experience is dropped.
            skills: (() => {
              const base = cleanState.skills ?? { ...INITIAL_SKILLS };
              // If farming XP is still 0 and old experience exists, convert it
              if ((base.farming ?? 0) === 0 && cleanState.experience) {
                const farmingLevel = getLevelFromExperience(Number(cleanState.experience));
                base.farming = getSkillXPForLevel(Math.min(farmingLevel, 100));
              }
              return base;
            })(),
            // v15: compute bonus from migrated skills
            bonus: computeBonus(cleanState.skills ?? { ...INITIAL_SKILLS }),
            balance: cleanState.balance && Number(cleanState.balance) >= 1000
                       ? cleanState.balance
                       : new Decimal(1000),
            // v19: kitchen cooking slot — default to null for old saves
            cooking: cleanState.cooking ?? null,
          },
        };
      },
    },
  ),
);
