"use client";

import { InnerPanel } from "@/components/ui/Panel";
import { SectionLabel } from "@/components/ui/modal";
import type { ProfileData } from "./ProfileClient";
import { getSkillLevel, totalXpForLevel, xpForNextLevel } from "@/features/game/skills";

interface ProfileStatsProps {
  data: ProfileData;
}

function StatRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-black/20 last:border-b-0">
      <span className="font-pixel text-[8px] text-white/60 uppercase">{label}</span>
      <span className={`font-pixel text-[9px] tabular-nums text-shadow ${accent ? "text-neon" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

const SKILL_ICONS: Record<string, string> = {
  farming:     "/assets/icons/plant.png",
  mining:      "/assets/skills/prospector.png",
  woodcutting: "/assets/resources/wood.png",
  fishing:     "/assets/resources/raw_fish.png",
  husbandry:   "/assets/resources/egg.png",
};

const SKILL_ORDER = ["farming", "woodcutting", "mining", "fishing", "husbandry"];

export function ProfileStats({ data }: ProfileStatsProps) {
  return (
    <div className="flex flex-col gap-3">

      {/* Reputation */}
      <SectionLabel icon="/assets/icons/quest.png">Reputation</SectionLabel>
      <InnerPanel className="flex flex-col px-2 py-1">
        <StatRow label="Reputation Points" value={data.reputationPoints.toLocaleString()} accent />
      </InnerPanel>

      {/* Skills overview */}
      <SectionLabel icon="/assets/icons/plant.png">Skills</SectionLabel>
      <div className="flex flex-col gap-1">
        {SKILL_ORDER.map((skill) => {
          const xp        = data.skills[skill] ?? 0;
          const level     = getSkillLevel(xp);
          const levelXP   = totalXpForLevel(level);       // XP at start of current level
          const nextXP    = xpForNextLevel(level);        // XP needed to reach next level
          const currentXP = xp - levelXP;                // progress within this level
          const pct       = level >= 100 ? 100 : Math.min((currentXP / nextXP) * 100, 100);
          const maxed     = level >= 100;

          return (
            <InnerPanel key={skill} className="flex items-center gap-2 px-2 py-1.5">
              <img
                src={SKILL_ICONS[skill] ?? "/assets/icons/plant.png"}
                alt=""
                className="w-4 h-4 shrink-0"
                style={{ imageRendering: "pixelated" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-pixel text-[8px] text-white/70 uppercase">
                    {skill.charAt(0).toUpperCase() + skill.slice(1)}
                  </span>
                  <span className="font-pixel text-[9px] tabular-nums text-white text-shadow shrink-0">
                    Lv {level}
                  </span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 bg-neon"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-pixel text-[7px] text-white/50 tabular-nums">
                  {maxed ? "MAX" : `${currentXP.toLocaleString()} / ${nextXP.toLocaleString()} XP`}
                </span>
              </div>
            </InnerPanel>
          );
        })}
      </div>
    </div>
  );
}
