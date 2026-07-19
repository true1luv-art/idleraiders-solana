"use client";

/**
 * PhaserModals — phaserv1
 *
 * Listens for `phaser-{key}-open` / `phaser-{key}-close` custom DOM events
 * dispatched by BuildingZone.ts and FarmScene.ts, then renders the matching
 * modal with the correct game panel inside.
 */

import { useEffect, useState } from "react";

import { BUILDING_KEYS, type BuildingKey } from "@/phaser/positions/buildingPositions";
import { BUILDING_CONFIG }                 from "@/lib/config/buildings";
import { BuildingStatusModal }             from "@/components/ui/BuildingStatusModal";
import { BarnModal }                       from "@/features/game-components/animals/BarnModal";
import { MarketModal }                     from "@/features/game-components/market/MarketModal";
import { KitchenModal }                    from "@/features/game-components/kitchen/KitchenModal";
import { ShrineBankModal }                 from "@/features/game-components/shrine/ShrineBankModal";
import { HouseModal }                      from "@/features/game-components/house/HouseModal";
import { QuestKeeperModal }                from "@/features/game-components/quests/QuestKeeperModal";

// ── Game modal keys ──────────────────────────────────────────────────────────

type GameModalKey =
  | "market" | "kitchen"
  | "barn"   | "barnsale" | "house";

const GAME_MODAL_KEYS: GameModalKey[] = [
  "market", "kitchen",
  "barn",   "barnsale", "house",
];

// ── SFX bridge ───────────────────────────────────────────────────────────────

type SfxWindow = Window & {
  __sfx?: {
    marketAudio?:   { play: () => void };
    kitchenAudio?:  { play: () => void };
    barnAudio?:     { play: () => void };
    homeDoorAudio?: { play: () => void };
  };
};

function playGameSfx(key: GameModalKey) {
  const sfx = (window as SfxWindow).__sfx;
  if (!sfx) return;
  switch (key) {
    case "market":
      sfx.marketAudio?.play();
      break;
    case "kitchen":
      sfx.kitchenAudio?.play();
      break;
    case "barn":
    case "barnsale":
      sfx.barnAudio?.play();
      break;
    case "house":
      sfx.homeDoorAudio?.play();
      break;
  }
}

// ── Modal state hook ─────────────────────────────────────────────────────────

function useGameModalState() {
  const [activeModal, setActiveModal] = useState<GameModalKey | null>(null);

  useEffect(() => {
    const handlers: [string, EventListener][] = [];

    for (const key of GAME_MODAL_KEYS) {
      const openHandler: EventListener = () => {
        playGameSfx(key);
        // Normalise barnsale → barn for modal rendering
        const normalised: GameModalKey = key === "barnsale" ? "barn" : key;
        setActiveModal(normalised);
      };
      const closeHandler: EventListener = () =>
        setActiveModal((curr) =>
          curr === key || (key === "barnsale" && curr === "barn") ? null : curr
        );

      window.addEventListener(`phaser-${key}-open`,  openHandler);
      window.addEventListener(`phaser-${key}-close`, closeHandler);
      handlers.push(
        [`phaser-${key}-open`,  openHandler],
        [`phaser-${key}-close`, closeHandler],
      );
    }

    return () => {
      handlers.forEach(([evt, fn]) => window.removeEventListener(evt, fn));
    };
  }, []);

  return { activeModal, closeModal: () => setActiveModal(null) };
}

// ── Component ────────────────────────────────────────────────────────────────

interface PhaserModalsProps {
  wallet: string;
}

export function PhaserModals({ wallet }: PhaserModalsProps) {
  const [activeBuildingKey, setActiveBuildingKey] = useState<BuildingKey | null>(null);
  const [shrineBankOpen,    setShrineBankOpen]    = useState(false);
  const [questKeeperOpen,   setQuestKeeperOpen]   = useState(false);
  const { activeModal, closeModal } = useGameModalState();

  useEffect(() => {
    const listeners = BUILDING_KEYS.flatMap((key) => {
      const open  = () => {
        if (key === "summoning_shrine") { setShrineBankOpen(true); return; }
        setActiveBuildingKey(key);
      };
      const close = () => {
        if (key === "summoning_shrine") { setShrineBankOpen(false); return; }
        setActiveBuildingKey((curr) => (curr === key ? null : curr));
      };

      window.addEventListener(`phaser-${key}-open`,  open);
      window.addEventListener(`phaser-${key}-close`, close);

      return [
        [`phaser-${key}-open`,  open ],
        [`phaser-${key}-close`, close],
      ] as [string, () => void][];
    });

    const openQuestKeeper  = () => setQuestKeeperOpen(true);
    const closeQuestKeeper = () => setQuestKeeperOpen(false);
    window.addEventListener("phaser-npc-quest-open",  openQuestKeeper);
    window.addEventListener("phaser-npc-quest-close", closeQuestKeeper);

    return () => {
      listeners.forEach(([evt, fn]) => window.removeEventListener(evt, fn));
      window.removeEventListener("phaser-npc-quest-open",  openQuestKeeper);
      window.removeEventListener("phaser-npc-quest-close", closeQuestKeeper);
    };
  }, []);

  return (
    <>
      {/* Building modals driven by BUILDING_CONFIG */}
      {BUILDING_KEYS.map((key) => {
        const cfg    = BUILDING_CONFIG[key];
        const isOpen = activeBuildingKey === key;

        if (!cfg?.enabled && cfg?.disabledMode === "hidden") return null;

        if (!cfg?.enabled && cfg?.disabledMode && cfg?.disabledMode !== "hidden") {
          return (
            <BuildingStatusModal
              key={key}
              open={isOpen}
              onClose={() => setActiveBuildingKey(null)}
              mode={cfg.disabledMode as "coming-soon" | "maintenance"}
              buildingName={cfg.displayName}
            />
          );
        }

        return null;
      })}

      {/* Game building modals */}
      <BarnModal
        show={activeModal === "barn"}
        onClose={closeModal}
      />
      <MarketModal
        show={activeModal === "market"}
        onClose={closeModal}
      />
      <KitchenModal
        show={activeModal === "kitchen"}
        onClose={closeModal}
      />
      <HouseModal
        open={activeModal === "house"}
        onClose={closeModal}
        wallet={wallet}
      />

      {/* Shrine bank */}
      <ShrineBankModal
        open={shrineBankOpen}
        onClose={() => setShrineBankOpen(false)}
      />

      {/* NPC modals */}
      <QuestKeeperModal
        show={questKeeperOpen}
        onClose={() => setQuestKeeperOpen(false)}
      />
    </>
  );
}
