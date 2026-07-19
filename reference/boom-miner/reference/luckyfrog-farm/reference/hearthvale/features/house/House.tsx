import React from "react";
import { Modal } from "react-bootstrap";

import { useGameStore } from "features/game/store/useGameStore";
import { GRID_WIDTH_PX } from "features/game/lib/constants";
import { getSkillLevel } from "features/game/lib/skills";

import house from "assets/buildings/house.png";
import smoke from "assets/buildings/smoke.gif";
import player from "assets/icons/player.png";
import close from "assets/icons/close.png";
import lightning from "assets/icons/lightning.png";

import { Action } from "components/ui/Action";
import { InnerPanel, Panel } from "components/ui/Panel";
import { HeroAvatar } from "components/ui/HeroAvatar";
import { homeDoorAudio } from "lib/utils/sfx";

const SKILL_LABELS: { key: string; label: string; color: string }[] = [
  { key: "farming",   label: "Farming",   color: "bg-green-500"  },
  { key: "forestry",  label: "Forestry",  color: "bg-lime-500"   },
  { key: "mining",    label: "Mining",    color: "bg-slate-400"  },
  { key: "husbandry", label: "Husbandry", color: "bg-yellow-500" },
  { key: "cooking",   label: "Cooking",   color: "bg-orange-500" },
  { key: "combat",    label: "Combat",    color: "bg-red-500"    },
  { key: "fishing",   label: "Fishing",   color: "bg-sky-500"    },
];

/** Standalone content component — reads the store directly so it can be used
 *  both inside House (on /game) and inside PhaserCanvas (on /phaser). */
export const HouseContent: React.FC = () => {
  const state = useGameStore((s) => s.state);

  return (
    <div className="flex flex-col pt-8 md:pt-2 gap-2">
      {/* Player card */}
      <InnerPanel className="p-2 flex items-center gap-3">
        <HeroAvatar emoji="🌻" name={state.username ?? "Hero"} size="lg" />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-shadow font-bold">{state.username ?? "Farmer"}</span>
          <div className="flex items-center gap-1">
            <img
              src={typeof lightning === "string" ? lightning : (lightning as { src: string })?.src}
              className="w-4 h-4"
              alt="stamina"
            />
            <span className="text-xs text-shadow">
              {state.stamina?.current ?? 100} / {state.stamina?.max ?? 100} Stamina
            </span>
          </div>
        </div>
      </InnerPanel>

      {/* Skills panel */}
      <InnerPanel className="p-2">
        <span className="text-sm text-shadow mb-2 block">Skills</span>
        <div className="flex flex-col gap-2">
          {SKILL_LABELS.map(({ key, label, color }) => {
            const xp    = (state.skills as Record<string, number>)?.[key] ?? 0;
            const level = getSkillLevel(xp);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs w-20 text-shadow">{label}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2 relative overflow-hidden">
                  <div
                    className={`${color} h-full rounded-full transition-all`}
                    style={{ width: `${(level / 100) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-shadow w-10 text-right">Lv.{level}</span>
              </div>
            );
          })}
        </div>
      </InnerPanel>
    </div>
  );
};

export const House: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = () => {
    setIsOpen(true);
    homeDoorAudio.play();
  };

  return (
    <>
      <div
        style={{
          width:    `${GRID_WIDTH_PX * 3.2}px`,
          position: "absolute",
          right:    `${GRID_WIDTH_PX * 15}px`,
          top:      `${GRID_WIDTH_PX * 4}px`,
        }}
        className="relative cursor-pointer hover:img-highlight"
        onClick={open}
      >
        <img
          src={typeof house === "string" ? house : (house as { src: string })?.src}
          alt="house"
          className="w-full"
        />
        <img
          src={typeof smoke === "string" ? smoke : (smoke as { src: string })?.src}
          style={{
            width:    `${GRID_WIDTH_PX * 0.7}px`,
            position: "absolute",
            left:     `${GRID_WIDTH_PX * 0.12}px`,
            top:      `${GRID_WIDTH_PX * 0.77}px`,
          }}
          alt=""
        />
        <Action
          className="absolute bottom-10 left-5"
          text="Home"
          icon={player}
          onClick={open}
        />
      </div>

      <Modal centered show={isOpen} onHide={() => setIsOpen(false)}>
        <Panel className="relative">
          <img
            src={typeof close === "string" ? close : (close as { src: string })?.src}
            className="h-6 cursor-pointer top-3 right-4 absolute"
            onClick={() => setIsOpen(false)}
            alt="close"
          />
          <HouseContent />
        </Panel>
      </Modal>
    </>
  );
};
