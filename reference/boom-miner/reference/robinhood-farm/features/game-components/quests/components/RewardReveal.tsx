"use client";

/**
 * components/game/quests/components/RewardReveal.tsx
 *
 * Simple reward confirmation shown after a quest is completed.
 * Displays the flat rep and XP earned, plus a rank-up notice if applicable.
 */

interface CompletionPayload {
  rewardRep: number;
  skillXp:   number;
  totalRep:  number;
  newRank:   string | null;
}

interface RewardRevealProps {
  payload:   CompletionPayload;
  questName: string;
  onDismiss: () => void;
}

export function RewardReveal({ payload, questName, onDismiss }: RewardRevealProps) {
  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Quest name */}
      <p className="text-center text-sm font-semibold opacity-70">{questName}</p>

      {/* Rewards */}
      <div className="rounded-lg bg-black/30 px-4 py-4 flex flex-col gap-3">
        <p className="text-xs font-bold text-yellow-300 uppercase tracking-wide">
          Quest Complete!
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">Reputation earned</span>
            <span className="font-bold text-purple-300">+{payload.rewardRep.toLocaleString()} Rep</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">Skill XP earned</span>
            <span className="font-bold text-green-300">+{payload.skillXp.toLocaleString()} XP</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-white/10 pt-2 mt-1">
            <span className="opacity-70">Total reputation</span>
            <span className="font-bold">{payload.totalRep.toLocaleString()} Rep</span>
          </div>
        </div>

        {payload.newRank && (
          <p className="text-xs text-purple-300 font-bold text-center mt-1">
            Rank up: {payload.newRank}!
          </p>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="w-full py-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300
                   text-brown-800 font-black text-sm transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
      >
        Collect Rewards
      </button>
    </div>
  );
}
