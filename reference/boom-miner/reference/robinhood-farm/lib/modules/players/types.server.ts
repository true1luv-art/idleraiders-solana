/**
 * lib/modules/players/types.server.ts
 *
 * Pure TypeScript types for the `players` domain.
 * No mongoose runtime code — only interfaces live here.
 */

import type { Document } from "mongoose";
import type { PlayerSkills } from "@/features/types/players";

export interface IPlayer extends Document {
  wallet: string;
  username?: string;

  registrationTime: number;
  referrer?: string;

  /**
   * Embedded skill XP totals. Derive level via `getSkillLevel(xp)`.
   * Each skill progresses independently.
   */
  skills: PlayerSkills;

  /**
   * In-game coin balance. Used for all marketplace purchases and sell rewards.
   * No blockchain or token backing.
   */
  coins: number;

  /**
   * Cumulative Reputation Points earned from quest completions. §13
   * Cosmetic prestige metric — not a transferable token or marketplace currency.
   */
  reputationPoints: number;

  // ── Shrine Bank ────────────────────────────────────────────────────────────

  /**
   * Cumulative coins burned via the Shrine Bank. Acts as the player's daily
   * withdrawal ceiling: a player can withdraw up to `stash` coins per day.
   * Increases permanently on each burn; never decreases.
   * Each burn adds floor(burnedAmount × 0.25) to this value.
   */
  stash: number;

  /**
   * Coins already withdrawn in the current UTC calendar day.
   * Resets to 0 when the player's next withdrawal lands on a different UTC day
   * than `lastWithdrawnAt`. Capped at `stash`.
   */
  withdrawnToday: number;

  /**
   * Unix timestamp (ms) of the most recent withdrawal.
   * Used together with `withdrawnToday` to enforce once-per-UTC-day gating.
   * 0 means the player has never withdrawn.
   */
  lastWithdrawnAt: number;
}
