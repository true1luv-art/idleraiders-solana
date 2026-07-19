"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal } from "react-bootstrap";
import { HeroAvatar } from "components/ui/HeroAvatar";
import { Button } from "components/ui/Button";
import { Panel, InnerPanel } from "components/ui/Panel";
import { getImageSrc } from "lib/utils/getImageSrc";
import { getSong, getSongCount } from "lib/playlist";
import { useStepper } from "lib/utils/hooks/useStepper";
import { useGameStore } from "features/game/store/useGameStore";
import { getSkillLevel, getSkillXPForLevel, getSkillXPToNextLevel } from "features/game/lib/skills";
import { INITIAL_SKILLS, type SkillCategory } from "features/game/types/skills";
import { INITIAL_EQUIPMENT, type EquipmentSlotName, type EquipmentSlot } from "features/game/types/equipment";

import play from "assets/ui/music_player/play.png";
import pause from "assets/ui/music_player/pause.png";
import skip_forward from "assets/ui/music_player/skip-forward.png";
import volume_down from "assets/ui/music_player/volume-down.png";
import volume_up from "assets/ui/music_player/volume-up.png";
import music_note from "assets/ui/music_player/music-note.png";
import close from "assets/icons/close.png";

interface AvatarMenuProps {
  name: string;
}

type MenuView = "main" | "music" | "stats" | "gear";

// ── Skill metadata ────────────────────────────────────────────────────────────

const SKILL_META: Record<SkillCategory, { label: string; icon: string; color: string }> = {
  farming:   { label: "Farming",   icon: "assets/icons/plant.png",        color: "#4ade80" },
  forestry:  { label: "Forestry",  icon: "assets/tools/axe.png",          color: "#86efac" },
  mining:    { label: "Mining",    icon: "assets/tools/iron_pickaxe.png", color: "#94a3b8" },
  fishing:   { label: "Fishing",   icon: "assets/tools/fishing_rod.png",  color: "#38bdf8" },
  cooking:   { label: "Cooking",   icon: "assets/icons/hammer.png",       color: "#fb923c" },
  combat:    { label: "Combat",    icon: "assets/icons/heart.png",        color: "#f87171" },
  husbandry: { label: "Husbandry", icon: "assets/animals/chicken.png",    color: "#fbbf24" },
};

const SKILL_ORDER: SkillCategory[] = ["farming", "forestry", "mining", "fishing", "cooking", "combat", "husbandry"];

function SkillRow({ category, xp }: { category: SkillCategory; xp: number }) {
  const { label, icon, color } = SKILL_META[category];
  const level        = getSkillLevel(xp);
  const levelStartXP = getSkillXPForLevel(level);
  const neededXP     = getSkillXPToNextLevel(level);
  const progressXP   = xp - levelStartXP;
  const pct          = level >= 100 ? 100 : Math.min((progressXP / neededXP) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <img src={icon} alt={label} className="w-5 h-5 flex-shrink-0" style={{ imageRendering: "pixelated" }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="text-white text-xs text-shadow">{label}</span>
          <span className="text-white text-xs text-shadow opacity-75">Lv.{level}</span>
        </div>
        <div className="h-2 bg-black bg-opacity-40 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-white text-xxs opacity-60">
          {progressXP.toLocaleString()} / {neededXP.toLocaleString()} XP
        </span>
      </div>
    </div>
  );
}

// ── Gear metadata ─────────────────────────────────────────────────────────────

const SLOT_META: Record<EquipmentSlotName, { label: string; icon: string }> = {
  avatar:  { label: "Avatar",  icon: "assets/icons/player.png" },
  weapon:  { label: "Weapon",  icon: "assets/icons/sword.png"  },
  armor:   { label: "Armor",   icon: "assets/icons/heart.png"  },
  mount:   { label: "Mount",   icon: "assets/tools/horse.png"  },
  accessory: { label: "Accessory", icon: "assets/icons/star.png" },
};

const SLOT_ORDER: EquipmentSlotName[] = ["avatar", "weapon", "armor", "mount", "accessory"];

const ATTR_LABELS: Array<{ key: keyof import("features/game/types/equipment").EquipmentAttributes; label: string }> = [
  { key: "damage",  label: "DMG"  },
  { key: "defense", label: "DEF"  },
  { key: "dodge",   label: "DOD"  },
  { key: "crit",    label: "CRIT" },
  { key: "mining",  label: "MIN"  },
  { key: "luck",    label: "LCK"  },
];

function GearSlotRow({ slotName, slot }: { slotName: EquipmentSlotName; slot: EquipmentSlot }) {
  const { label, icon } = SLOT_META[slotName];
  const hasItem = slot.item_equipped;

  return (
    <div className="flex items-start gap-2 bg-black bg-opacity-20 rounded p-1.5">
      {/* Slot icon + label */}
      <div className="flex flex-col items-center w-10 flex-shrink-0">
        <img
          src={icon}
          alt={label}
          className="w-6 h-6"
          style={{ imageRendering: "pixelated" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <span className="text-white text-xxs text-shadow mt-0.5 leading-none">{label}</span>
      </div>

      {/* Item info or empty state */}
      {hasItem ? (
        <div className="flex-1 min-w-0">
          <span className="text-white text-xs text-shadow block mb-1">
            #{slot.item_number ?? "?"} — {slot.item_id ?? "Unknown"}
          </span>
          <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
            {ATTR_LABELS.map(({ key, label: attrLabel }) => (
              <span key={key} className="text-white text-xxs opacity-80">
                {attrLabel}: <span className="text-yellow-300">{slot.attributes[key]}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <span className="text-white text-xs opacity-40 italic self-center">Empty</span>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export const AvatarMenu: React.FC<AvatarMenuProps> = ({ name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<MenuView>("main");
  const reset     = useGameStore((s) => s.reset);
  const skills    = useGameStore((s) => s.state.skills    ?? INITIAL_SKILLS);
  const equipment = useGameStore((s) => s.state.equipment ?? INITIAL_EQUIPMENT);

  // Music player state
  const volume = useStepper({ initial: 0.1, step: 0.1, max: 1, min: 0 });
  const [isPlaying, setPlaying] = useState<boolean>(true);
  const [songIndex, setSongIndex] = useState<number>(0);
  const musicPlayer = useRef<HTMLAudioElement>(null);

  const song = getSong(songIndex);

  const handlePlayState = () => {
    if (musicPlayer.current) {
      if (musicPlayer.current.paused) {
        musicPlayer.current.play();
      } else {
        musicPlayer.current.pause();
      }
      setPlaying(!isPlaying);
    }
  };

  const handleNextSong = () => {
    if (getSongCount() === songIndex + 1) {
      setSongIndex(0);
    } else {
      setSongIndex(songIndex + 1);
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      reset();
      setIsOpen(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setView("main");
  };

  // Set volume on audio element
  useEffect(() => {
    if (musicPlayer.current) {
      musicPlayer.current.volume = volume.value;
    }
  }, [volume.value]);

  // Chrome autoplay policy
  useEffect(() => {
    if (navigator.userAgent.match(/chrome|chromium|crios/i)) {
      setPlaying(false);
      if (musicPlayer.current) {
        musicPlayer.current.pause();
      }
    }
  }, []);

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={musicPlayer}
        onEnded={handleNextSong}
        onPause={() => musicPlayer.current && setPlaying(!musicPlayer.current.paused)}
        onPlay={() => musicPlayer.current && setPlaying(!musicPlayer.current.paused)}
        src={getImageSrc(song.path)}
        className="hidden"
        autoPlay
      />

      {/* Clickable Avatar */}
      <button
        onClick={() => setIsOpen(true)}
        className="cursor-pointer hover:scale-105 transition-transform focus:outline-none"
        aria-label="Open player menu"
      >
        <HeroAvatar name={name} size="lg" />
      </button>

      {/* Modal - same pattern as House, Blacksmith, etc. */}
      <Modal centered show={isOpen} onHide={handleClose}>
        <Panel className="relative">
          {/* Close button */}
          <img
            src={typeof close === "string" ? close : close?.src}
            className="h-6 cursor-pointer top-3 right-4 absolute"
            onClick={handleClose}
            alt="Close"
          />

          {view === "main" ? (
            /* Main Menu View */
            <div className="flex flex-col pt-2">

              <span className="text-sm text-shadow text-center">Menu</span>


              <div className="flex flex-col gap-2 p-2">
                <Button onClick={() => setView("stats")}>
                  <div className="flex items-center justify-center gap-2">
                    <img src="assets/icons/plant.png" alt="" className="w-4 h-4" style={{ imageRendering: "pixelated" }} />
                    <span className="text-white text-xs text-shadow">Skills</span>
                  </div>
                </Button>
                <Button onClick={() => setView("gear")}>
                  <div className="flex items-center justify-center gap-2">
                    <img src="assets/icons/heart.png" alt="" className="w-4 h-4" style={{ imageRendering: "pixelated" }} />
                    <span className="text-white text-xs text-shadow">Gear</span>
                  </div>
                </Button>
                <Button onClick={() => setView("music")}>
                  <div className="flex items-center justify-center gap-2">
                    <img
                      src={typeof music_note === "string" ? music_note : music_note?.src}
                      alt=""
                      className="w-4 h-4"
                    />
                    <span className="text-white text-xs text-shadow">Music</span>
                  </div>
                </Button>
                <Button onClick={handleLogout}>
                  <span className="text-white text-xs text-shadow">Logout</span>
                </Button>
              </div>
            </div>
          ) : view === "gear" ? (
            /* Gear / Equipment View */
            <div className="flex flex-col pt-2">
              <span className="text-sm text-shadow text-center">Gear</span>
              <div className="flex flex-col gap-2 p-2 mt-1">
                {SLOT_ORDER.map((slotName) => (
                  <GearSlotRow key={slotName} slotName={slotName} slot={equipment[slotName]} />
                ))}
              </div>
              <div className="px-2 pb-1">
                <Button onClick={() => setView("main")}>
                  <span className="text-white text-xs text-shadow">Back</span>
                </Button>
              </div>
            </div>
          ) : view === "stats" ? (
            /* Skills / Stats View */
            <div className="flex flex-col pt-2">
              <span className="text-sm text-shadow text-center">Skills</span>
              <div className="flex flex-col gap-3 p-2 mt-1">
                {SKILL_ORDER.map((cat) => (
                  <SkillRow key={cat} category={cat} xp={skills[cat]} />
                ))}
              </div>
              <div className="px-2 pb-1">
                <Button onClick={() => setView("main")}>
                  <span className="text-white text-xs text-shadow">Back</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Music Player View */
            <div className="flex flex-col pt-2">

              <span className="text-sm text-shadow text-center">Music</span>


              <div className="flex flex-col gap-2 p-2">
                {/* Song info */}
                <InnerPanel className="overflow-hidden px-2 py-1">
                  <p
                    className="whitespace-nowrap w-fit text-white text-xs"
                    style={{
                      animation: "marquee-like-effect 10s infinite linear",
                      animationPlayState: isPlaying ? "running" : "paused",
                    }}
                  >
                    {song.name} - {song.artist}
                  </p>
                </InnerPanel>

                {/* Music controls row */}
                <div className="flex items-center justify-center gap-2">
                  <Button onClick={handlePlayState} className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={getImageSrc(isPlaying ? pause : play)}
                      alt={isPlaying ? "Pause" : "Play"}
                      className="w-4 h-4"
                    />
                  </Button>
                  <Button onClick={handleNextSong} className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={typeof skip_forward === "string" ? skip_forward : skip_forward?.src}
                      alt="Next"
                      className="w-4 h-4"
                    />
                  </Button>
                  <Button onClick={volume.decrease} className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={typeof volume_down === "string" ? volume_down : volume_down?.src}
                      alt="Volume down"
                      className="w-4 h-4"
                    />
                  </Button>
                  <Button onClick={volume.increase} className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={typeof volume_up === "string" ? volume_up : volume_up?.src}
                      alt="Volume up"
                      className="w-4 h-4"
                    />
                  </Button>
                </div>

                {/* Volume bar */}
                <InnerPanel className="p-1">
                  <div className="h-2 bg-brown-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-200"
                      style={{ width: `${volume.value * 100}%` }}
                    />
                  </div>
                </InnerPanel>

                {/* Back button */}
                <Button onClick={() => setView("main")}>
                  <span className="text-white text-xs text-shadow">Back</span>
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </Modal>
    </>
  );
};
