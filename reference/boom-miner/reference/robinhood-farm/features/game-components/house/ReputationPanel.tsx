"use client";

/**
 * components/game/house/ReputationPanel.tsx
 *
 * Displays the player's current Reputation Points, rank name, and a progress
 * bar toward the next rank threshold.  §13 (Phase 2-D)
 *
 * Data source: GET /api/quests — already returns `reputationPoints` and `rank`
 * from Phase 2-B, so no extra API endpoint is needed.
 */

import useSWR      from "swr";
import { getRank, ALL_RANKS } from "@/features/utils/reputation";
import { SectionLabel }       from "@/components/ui/modal";
import { InnerPanel }         from "@/components/ui/Panel";

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
  });

interface QuestBoardSummary {
  success:          boolean;
  reputationPoints: number;
  rank:             string;
}

// ---------------------------------------------------------------------------
// Rank row
// ---------------------------------------------------------------------------

function RankRow({
  name,
  threshold,
  current,
  isCurrent,
}: {
  name:      string;
  threshold: number;
  current:   number;
  isCurrent: boolean;
}) {
  const achieved = current >= threshold;

  return (
    <div
      className={[
        "flex items-center justify-between gap-3 px-2 py-1.5 rounded",
        isCurrent ? "bg-purple-900/50 border border-purple-600/50" : "opacity-60",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <div
          className={[
            "w-2 h-2 rounded-full flex-shrink-0",
            achieved ? "bg-purple-400" : "bg-white/20",
          ].join(" ")}
        />
        <span
          className={[
            "text-xs font-semibold",
            isCurrent ? "text-purple-200" : "text-white/60",
          ].join(" ")}
        >
          {name}
        </span>
      </div>
      <span className="text-[10px] text-white/40 whitespace-nowrap">
        {threshold === 0 ? "Start" : `${threshold.toLocaleString()} Rep`}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function ReputationPanel() {
  const { data, error, isLoading } = useSWR<QuestBoardSummary>(
    "/api/quests",
    fetcher,
    { refreshInterval: 60_000 },
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-1">
        <div className="h-20 animate-pulse bg-black/20 rounded" />
        <div className="h-4 animate-pulse bg-black/20 rounded w-3/4" />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <p className="text-xs text-red-300 p-2">
        Failed to load reputation data.
      </p>
    );
  }

  const rep          = data.reputationPoints ?? 0;
  const { rank, next, progress } = getRank(rep);
  const isMaxRank    = next === Infinity;
  const pct          = Math.round(progress * 100);

  return (
    <>
      <SectionLabel icon="/assets/icons/quest.png">Reputation</SectionLabel>

      {/* Hero card */}
      <InnerPanel className="flex flex-col gap-2 px-3 py-3">
        {/* Current rank name */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-purple-200">{rank}</span>
          <span className="text-xs text-white/50">
            {rep.toLocaleString()} Rep
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Progress label */}
        {isMaxRank ? (
          <p className="text-[10px] text-purple-300 font-semibold text-center">
            Maximum rank achieved
          </p>
        ) : (
          <p className="text-[10px] text-white/50">
            {(next - rep).toLocaleString()} Rep to next rank &middot; {pct}% complete
          </p>
        )}
      </InnerPanel>

      {/* All ranks list */}
      <div className="flex flex-col gap-1 mt-1">
        {ALL_RANKS.map((entry) => (
          <RankRow
            key={entry.name}
            name={entry.name}
            threshold={entry.threshold}
            current={rep}
            isCurrent={entry.name === rank}
          />
        ))}
      </div>
    </>
  );
}
