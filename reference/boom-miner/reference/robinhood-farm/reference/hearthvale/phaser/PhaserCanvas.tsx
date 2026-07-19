"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Modal } from "react-bootstrap";
import lock from "assets/skills/lock.png";
import { TimeLeftPanel } from "components/ui/TimeLeftPanel";
import { InnerPanel } from "components/ui/Panel";
import { LIFECYCLE } from "features/crops/lib/plant";
import { CROPS, CropName } from "features/game/types/crops";
import { getTimeLeft, secondsToMidString } from "lib/utils/time";
import { getImageSrc } from "lib/utils/getImageSrc";
import { TREE_RECOVERY_SECONDS } from "features/game/events/chop";

import { GameProvider } from "features/game/GameProvider";
import { ToastProvider } from "features/game/toast/ToastQueueProvider";
import { Hud } from "features/hud/Hud";
import { ToastManager } from "features/game/toast/ToastManager";
import { MobileJoystick } from "./ui/MobileJoystick";
import { MobileActionButton } from "./ui/MobileActionButton";
import { LandscapeGate } from "components/ui/LandscapeGate";

import { MarketItems } from "features/crops/components/MarketItems";
import { Crafting as BlacksmithCrafting } from "features/blacksmith/components/Crafting";
import { Crafting as KitchenCrafting } from "features/kitchen/components/Crafting";
import { BazaarItems } from "features/bazaar/components/BazaarItems";
import { WalletModal } from "features/hud/components/WalletModal";
import { BarnSale } from "features/animals/components/BarnSale";
import { HouseContent } from "features/house/House";
import { Panel } from "components/ui/Panel";
import close from "assets/icons/close.png";
import { useGameStore } from "features/game/store/useGameStore";
import { screenTracker } from "lib/utils/screen";
import { FishCaughtModal } from "features/fishing/components/FishCaughtModal";
import { FishName } from "features/game/types/fish";

import {
  marketAudio,
  blacksmithAudio,
  kitchenAudio,
  homeDoorAudio,
  barnAudio,
  bankAudio,
  plantAudio,
  harvestAudio,
} from "lib/utils/sfx";

// ─── Plot Popover ─────────────────────────────────────────────────────────────

type PlotPopoverKind = "harvest" | "plant" | "locked" | null;

interface PlotPopoverState {
  kind: PlotPopoverKind;
  screenX: number;
  screenY: number;
  requiredLevel?: number;
  amount?: number;
}

const POPOVER_DURATION_MS = 1200;

/**
 * Floating popover that appears at the world-space position of a plot when:
 *  - A crop is harvested  → "+1" in green
 *  - A seed is planted    → "-1 seed" in white
 *  - A locked plot is clicked → lock icon + "Level X"
 *
 * Uses @floating-ui/react to position the tooltip relative to a virtual
 * reference element placed at the exact screen coordinates sent by FarmScene.
 */
function PlotPopover() {
  const [state, setState] = useState<PlotPopoverState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: PlotPopoverState) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState(next);
    timerRef.current = setTimeout(() => setState(null), POPOVER_DURATION_MS);
  }, []);

  useEffect(() => {
    const onHarvest = (e: Event) => {
      const { screenX, screenY, amount } = (e as CustomEvent).detail;
      show({ kind: "harvest", screenX, screenY, amount });
    };
    const onPlant = (e: Event) => {
      const { screenX, screenY } = (e as CustomEvent).detail;
      show({ kind: "plant", screenX, screenY });
    };
    const onLocked = (e: Event) => {
      const { screenX, screenY, requiredLevel } = (e as CustomEvent).detail;
      show({ kind: "locked", screenX, screenY, requiredLevel });
    };

    window.addEventListener("phaser-plot-harvest", onHarvest);
    window.addEventListener("phaser-plot-plant",   onPlant);
    window.addEventListener("phaser-plot-locked",  onLocked);
    return () => {
      window.removeEventListener("phaser-plot-harvest", onHarvest);
      window.removeEventListener("phaser-plot-plant",   onPlant);
      window.removeEventListener("phaser-plot-locked",  onLocked);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]);

  if (!state) return null;

  // Clamp to viewport so the popover never clips outside the canvas edges.
  const MARGIN = 8;
  const x = Math.max(MARGIN, Math.min(state.screenX, window.innerWidth  - MARGIN));
  const y = Math.max(MARGIN, Math.min(state.screenY, window.innerHeight - MARGIN));

  return (
    <div
      style={{
        position: "fixed",
        left: x,
        top: y,
        transform: "translate(-50%, -110%)",
        zIndex: 9999,
        pointerEvents: "none",
      }}
      className="flex flex-col items-center animate-bounce-once"
    >
      {state.kind === "harvest" && (
        <span className="text-sm font-bold text-yellow-300 drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">
          +{state.amount ?? 1}
        </span>
      )}
      {state.kind === "plant" && (
        <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          -1
        </span>
      )}
      {state.kind === "locked" && (
        <span className="flex items-center gap-1 text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,1)] leading-none">
          <img
            src={typeof lock === "string" ? lock : (lock as any).src}
            className="w-3.5 h-3.5"
            alt="Locked"
          />
          Level {state.requiredLevel}
        </span>
      )}
    </div>
  );
}

// ─── Node Tooltip ─────────────────────────────────────────────────────────────

interface NodeHoverState {
  kind: "depleted" | "growing" | "animal";
  screenX: number;
  screenY: number;
  // depleted
  nodeType?: string;
  choppedAt?: number;
  recoverySecs?: number;
  // growing
  cropName?: string;
  plantedAt?: number;
  harvestMs?: number;
  // animal — only shown while producing (countdown phase)
  animalType?: string;
  produceName?: string;
  produceIcon?: string;
  fedAt?: number;
  produceMs?: number;
}

// ─── Resource Drop Floater ────────────────────────────────────────────────────

const RESOURCE_COLORS: Record<string, string> = {
  tree:  "text-green-300",
  stone: "text-slate-300",
  iron:  "text-orange-300",
  gold:  "text-yellow-300",
};

interface ResourceDropState {
  nodeType: string;
  amount: number;
  screenX: number;
  screenY: number;
  id: number;
}

/**
 * Shows a "+N" floater at the node position when a resource node is depleted.
 * Each drop gets a unique id so multiple rapid hits each show their own label.
 */
function ResourceDropFloater() {
  const [drops, setDrops] = useState<ResourceDropState[]>([]);

  useEffect(() => {
    const onDrop = (e: Event) => {
      const { nodeType, amount, screenX, screenY } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setDrops((prev) => [...prev, { nodeType, amount, screenX, screenY, id }]);
      setTimeout(() => setDrops((prev) => prev.filter((d) => d.id !== id)), 1200);
    };
    window.addEventListener("phaser-resource-drop", onDrop);
    return () => window.removeEventListener("phaser-resource-drop", onDrop);
  }, []);

  return (
    <>
      {drops.map((drop) => {
        const color = RESOURCE_COLORS[drop.nodeType] ?? "text-white";
        const MARGIN = 8;
        const x = Math.max(MARGIN, Math.min(drop.screenX, window.innerWidth  - MARGIN));
        const y = Math.max(MARGIN, Math.min(drop.screenY, window.innerHeight - MARGIN));
        return (
          <span
            key={drop.id}
            style={{
              position: "fixed",
              left: x,
              top: y,
              transform: "translate(-50%, -110%)",
              zIndex: 9999,
              pointerEvents: "none",
            }}
            className={`text-sm font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,1)] animate-bounce-once ${color}`}
          >
            +{drop.amount}
          </span>
        );
      })}
    </>
  );
}

/**
 * Fixed-position tooltip layered over the Phaser canvas.
 * Polls window.__nodeTooltip (written every frame by FarmScene) every 200ms
 * so it never misses the state regardless of mount timing.
 * Reuses TimeLeftPanel (depleted nodes) and InnerPanel with LIFECYCLE image
 * (growing crops) — the exact same components used in the /game route.
 */
function NodeTooltip() {
  const [state, setState] = useState<NodeHoverState | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = (window as any).__nodeTooltip as NodeHoverState | null | undefined;
      setState(next ?? null);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  if (!state) return null;

  // Clamp to viewport so the tooltip never clips outside the canvas edges.
  const MARGIN = 8;
  const x = Math.max(MARGIN, Math.min(state.screenX, window.innerWidth  - MARGIN));
  const y = Math.max(MARGIN, Math.min(state.screenY, window.innerHeight - MARGIN));

  if (state.kind === "depleted") {
    const recoverySecs = state.recoverySecs ?? TREE_RECOVERY_SECONDS;
    const timeLeft = Math.max(
      0,
      getTimeLeft(state.choppedAt ?? 0, recoverySecs),
    );
    const label = state.nodeType === "tree" ? "Recovers in" : "Recovers in";
    return (
      <div
        style={{
          position: "fixed",
          left: x,
          top: y,
          transform: "translate(-50%, -110%)",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <TimeLeftPanel
          text={label}
          timeLeft={timeLeft}
          showTimeLeft={true}
        />
      </div>
    );
  }

  if (state.kind === "growing") {
    const cropName = state.cropName as CropName | undefined;
    if (!cropName) return null;
    const crop      = CROPS()[cropName];
    const lifecycle = LIFECYCLE[cropName];
    const timeLeft  = Math.max(0, getTimeLeft(state.plantedAt ?? 0, crop?.harvestSeconds ?? 60));
    return (
      <div
        style={{
          position: "fixed",
          left: x,
          top: y,
          transform: "translate(-50%, -110%)",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <InnerPanel className="whitespace-nowrap w-fit">
          <div className="flex flex-col text-xxs text-white text-shadow ml-2 mr-2 p-1">
            <div className="flex flex-1 items-center justify-center mb-0.5">
              <img
                src={getImageSrc(lifecycle?.ready)}
                className="w-4 mr-1"
                style={{ imageRendering: "pixelated" }}
              />
              <span>{cropName}</span>
            </div>
            <span className="flex-1">{secondsToMidString(timeLeft)}</span>
          </div>
        </InnerPanel>
      </div>
    );
  }

  if (state.kind === "animal") {
    // Only reached during the producing/countdown phase — hungry and ready states
    // are suppressed in FarmScene before this tooltip is ever set.
    const { produceName, produceIcon, fedAt, produceMs } = state;
    const timeLeftSecs = !fedAt
      ? 0
      : Math.max(0, Math.floor(((fedAt + (produceMs ?? 0)) - Date.now()) / 1000));

    return (
      <div
        style={{
          position: "fixed",
          left: x,
          top: y,
          transform: "translate(-50%, -110%)",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <InnerPanel className="whitespace-nowrap w-fit">
          <div className="flex flex-col text-xxs text-white text-shadow mx-2 my-1 gap-0.5">
            <div className="flex items-center gap-1">
              {produceIcon && (
                <img
                  src={`/${produceIcon}`}
                  alt={produceName}
                  className="w-4 h-4"
                  style={{ imageRendering: "pixelated" }}
                />
              )}
              <span>{produceName} ready in</span>
            </div>
            {timeLeftSecs > 0 && (
              <span className="text-center opacity-80">{secondsToMidString(timeLeftSecs)}</span>
            )}
          </div>
        </InnerPanel>
      </div>
    );
  }

  return null;
}

// Building types that can be opened via Phaser events
type BuildingModalType =
  | "house"
  | "market"
  | "bazaar"
  | "blacksmith"
  | "kitchen"
  | "bank"
  | "barn"
  | "barnsale"
  | null;

function PhaserModals() {
  const [activeModal, setActiveModal] = useState<BuildingModalType>(null);

  const close = () => setActiveModal(null);

  useEffect(() => {
    // FarmScene dispatches "phaser-{type}-open" on window with detail: { zone }
    const BUILDING_TYPES: BuildingModalType[] = [
      "house", "market", "bazaar", "blacksmith", "kitchen", "bank", "barn", "barnsale",
    ];

    const listeners: [string, EventListener][] = [];

    BUILDING_TYPES.forEach((type) => {
      // Open listener
      const openName = `phaser-${type}-open`;
      const openListener: EventListener = () => {
        // Play audio cues matching /game behaviour
        if (type === "market") marketAudio.play();
        if (type === "bazaar") marketAudio.play();
        if (type === "blacksmith") blacksmithAudio.play();
        if (type === "kitchen") kitchenAudio.play();
        if (type === "bank") bankAudio.play();
        if (type === "house") homeDoorAudio.play();
        if (type === "barnsale") barnAudio.play();

        setActiveModal(type);
      };
      window.addEventListener(openName, openListener);
      listeners.push([openName, openListener]);

      // Close listener — fired by FarmScene when player walks out of range
      const closeName = `phaser-${type}-close`;
      const closeListener: EventListener = () => {
        setActiveModal((current) => (current === type ? null : current));
      };
      window.addEventListener(closeName, closeListener);
      listeners.push([closeName, closeListener]);
    });

    // Workshop zone was removed from the map — redirect its event to blacksmith
    // so any old Phaser zones that haven't been stripped yet still work.
    const workshopRedirect: EventListener = () => {
      blacksmithAudio.play();
      setActiveModal("blacksmith");
    };
    window.addEventListener("phaser-workshop-open", workshopRedirect);

    return () => {
      listeners.forEach(([name, fn]) => window.removeEventListener(name, fn));
      window.removeEventListener("phaser-workshop-open", workshopRedirect);
    };
  }, []);

  return (
    <>
      {/* Market */}
      <Modal centered show={activeModal === "market"} onHide={close}>
        <MarketItems onClose={close} />
      </Modal>

      {/* Blacksmith */}
      <Modal centered show={activeModal === "blacksmith"} onHide={close}>
        <BlacksmithCrafting onClose={close} />
      </Modal>

      {/* Kitchen */}
      <Modal centered show={activeModal === "kitchen"} onHide={close}>
        <KitchenCrafting onClose={close} />
      </Modal>

      {/* Bazaar */}
      <Modal centered show={activeModal === "bazaar"} onHide={close}>
        <BazaarItems onClose={close} />
      </Modal>

      {/* Bank */}
      <Modal centered show={activeModal === "bank"} onHide={close}>
        <WalletModal onClose={close} />
      </Modal>

      {/* Barn Sale */}
      <Modal centered show={activeModal === "barnsale"} onHide={close}>
        <BarnSale onClose={close} />
      </Modal>

      {/* House */}
      <Modal centered show={activeModal === "house"} onHide={close}>
        <Panel className="relative">
          <img
            src={typeof close === "string" ? close : (close as { src: string })?.src}
            className="h-6 cursor-pointer top-3 right-4 absolute"
            onClick={close}
            alt="close"
          />
          <HouseContent />
        </Panel>
      </Modal>

    </>
  );
}

/**
 * PhaserCanvas
 * Mounts the Phaser engine and overlays React building modals.
 * The modals are driven by custom DOM events dispatched from FarmScene.
 */
/**
 * CropEventBridge
 * Listens for phaser-plot-plant and phaser-plot-harvest window events fired
 * by FarmScene and dispatches the matching Zustand actions.  Lives inside
 * PhaserCanvas so it has access to the store even on /phaser (where Game.tsx
 * is not rendered).
 *
 * Uses a ref for dispatch so the event listeners are registered once and never
 * go stale — they always read the latest state directly from the store.
 */
function CropEventBridge() {
  const dispatchRef = useRef(useGameStore.getState().dispatch);

  useEffect(() => {
    // Keep the ref current if dispatch ever changes identity
    dispatchRef.current = useGameStore.getState().dispatch;
  });

  useEffect(() => {
    const onPlant = (e: Event) => {
      const { fieldIndex, item } = (e as CustomEvent).detail;
      // Read live state — never use a stale closure snapshot
      const liveFields = useGameStore.getState().state.fields;
      if (liveFields[fieldIndex]) return; // Already planted — guard against double-fire
      // Reset the screenTracker so the bot-detection collinearity counter does
      // not accumulate across Phaser clicks (the tracker is never started on
      // the /phaser route, so its movements array is always empty which looks
      // collinear and would lock out actions after 4 clicks).
      screenTracker.reset();
      try { dispatchRef.current({ type: "item.planted", index: fieldIndex, item }); } catch { /* no seeds / locked */ }
    };
    const onHarvest = (e: Event) => {
      const { fieldIndex } = (e as CustomEvent).detail;
      // Read live state — guard against double-fire on the same field
      const liveFields = useGameStore.getState().state.fields;
      if (!liveFields[fieldIndex]) return; // Already harvested / empty
      // Same screenTracker reset as onPlant above.
      screenTracker.reset();
      try { dispatchRef.current({ type: "item.harvested", index: fieldIndex }); } catch { /* not ready */ }
    };
    window.addEventListener("phaser-plot-plant",   onPlant);
    window.addEventListener("phaser-plot-harvest", onHarvest);
    return () => {
      window.removeEventListener("phaser-plot-plant",   onPlant);
      window.removeEventListener("phaser-plot-harvest", onHarvest);
    };
  // Intentionally empty �� register once, read live state via ref/getState
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/**
 * ResourceEventBridge
 * Listens for phaser-resource-drop fired by FarmScene on the 3rd (depleting)
 * hit of a tree or stone node, then dispatches the matching game-store action
 * so the inventory (Wood / Stone / Iron / Gold) is updated.
 *
 * node types → action types:
 *   tree  → "tree.chopped"
 *   stone → "stone.mined"
 *   iron  → "iron.mined"
 *   gold  → "gold.mined"
 */
function ResourceEventBridge() {
  const dispatchRef = useRef(useGameStore.getState().dispatch);

  useEffect(() => {
    dispatchRef.current = useGameStore.getState().dispatch;
  });

  useEffect(() => {
    const onDrop = (e: Event) => {
      const { nodeType, nodeId } = (e as CustomEvent).detail as {
        nodeType: string;
        nodeId: string;
      };
      // nodeId format: "tree_01", "stone_02", "iron_01", "gold_02"
      // Store index is the numeric part minus 1 (1-based → 0-based)
      const index = parseInt(nodeId.replace(/\D/g, ""), 10) - 1;
      if (isNaN(index)) return;

      screenTracker.reset();
      try {
        if (nodeType === "tree") {
          dispatchRef.current({ type: "tree.chopped", index });
        } else if (nodeType === "stone") {
          dispatchRef.current({ type: "stone.mined", index });
        } else if (nodeType === "iron") {
          dispatchRef.current({ type: "iron.mined",  index });
        } else if (nodeType === "gold") {
          dispatchRef.current({ type: "gold.mined",  index });
        }
      } catch {
        // Not enough stamina or node already depleted — ignore
      }
    };

    window.addEventListener("phaser-resource-drop", onDrop);
    return () => window.removeEventListener("phaser-resource-drop", onDrop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

/**
 * FishingEventBridge
 * - phaser-fishing-open → dispatch fish.caught, show FishCaughtModal
 *
 * The casting progress bar and cooldown bar are handled entirely by
 * FishingCooldown (in the Hud), which listens to the same events.
 */
function FishingEventBridge() {
  const [fishResult, setFishResult] = useState<{ fish: FishName; amount: number } | null>(null);

  useEffect(() => {
    const onCaught = () => {
      screenTracker.reset();
      try {
        useGameStore.getState().dispatch({ type: "fish.caught", createdAt: Date.now() });
        const { fishing } = useGameStore.getState().state;
        if (fishing.lastCaughtFish) {
          setFishResult({ fish: fishing.lastCaughtFish, amount: fishing.lastCaughtAmount });
        }
      } catch {
        // Cooldown / stamina guard — animation already played, nothing to show
      }
    };

    window.addEventListener("phaser-fishing-open", onCaught);
    return () => {
      window.removeEventListener("phaser-fishing-open", onCaught);
    };
  }, []);

  return (
    <>
      {fishResult && (
        <FishCaughtModal
          fish={fishResult.fish}
          amount={fishResult.amount}
          onClose={() => setFishResult(null)}
        />
      )}
    </>
  );
}

export default function PhaserCanvas() {
  const gameRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    // Expose the Zustand store on window so the Phaser scene (plain JS) can
    // call window.__gameStore.getState() to read live field/crop state.
    // Also expose audio objects so FarmScene can play them after animations.
    if (typeof window !== "undefined") {
      (window as any).__gameStore = useGameStore;
      (window as any).__sfx = { plantAudio, harvestAudio };
    }

    // Start the bot-detection screenTracker so it accumulates real mouse
    // movement data. Without this, every plant/harvest appears "collinear"
    // (empty movement array) and gets blocked after 4 actions.
    screenTracker.start();

    import("./index.js").then(({ default: startPhaserGame }) => {
      if (!mounted || gameRef.current) return;

      // Pass the current persisted state as the initial snapshot so the scene
      // knows which fields are already planted and which plots are locked.
      const playerState = useGameStore.getState().state;

      gameRef.current = startPhaserGame("phaser-container", {
        socket: null,
        playerState,
      });

      if (typeof window !== "undefined") {
        (window as any).phaserGame = gameRef.current;
      }
    });

    return () => {
      mounted = false;
      screenTracker.pause();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        if (typeof window !== "undefined") {
          delete (window as any).phaserGame;
        }
      }
    };
  }, []);

  return (
    <LandscapeGate>
      <GameProvider>
        <ToastProvider>
          <CropEventBridge />
          <ResourceEventBridge />
          <FishingEventBridge />
          <ToastManager />
          <div className="relative w-full h-full">
            <div
              id="phaser-container"
              className="w-full h-full"
              aria-label="Phaser game canvas"
            />
            <Hud />
            <MobileJoystick />
            <MobileActionButton />
            <PlotPopover />
            <ResourceDropFloater />

            <NodeTooltip />
            <PhaserModals />
          </div>
        </ToastProvider>
      </GameProvider>
    </LandscapeGate>
  );
}
