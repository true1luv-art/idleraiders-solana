import mongoose, { Schema, Model } from "mongoose";
import type { IPlayer } from "./types.server";
import type { PlayerSkills } from "@/features/types/players";

export type { IPlayer } from "./types.server";

const PlayerSkillsSchema = new Schema<PlayerSkills>(
  {
    farming:     { type: Number, default: 0 },
    mining:      { type: Number, default: 0 },
    woodcutting: { type: Number, default: 0 },
    fishing:     { type: Number, default: 0 },
    husbandry:   { type: Number, default: 0 },
  },
  { _id: false },
);

const PlayerSchema = new Schema<IPlayer>(
  {
    wallet:           { type: String, required: true, unique: true, index: true },
    username:         { type: String },
    registrationTime: { type: Number, required: true },
    referrer:         { type: String },

    skills: { type: PlayerSkillsSchema, default: () => ({}) },

    // In-game coin balance.
    coins: { type: Number, default: 0 },

    // §13 — Reputation Points (cosmetic prestige metric, not a token).
    reputationPoints: { type: Number, default: 0 },

    // ── Shrine Bank ────────────────────────────────────────────────────────
    // stash = cumulative coins burned; acts as daily withdrawal ceiling.
    stash:           { type: Number, default: 0 },
    // withdrawnToday resets at midnight UTC; tracks spend against stash ceiling.
    withdrawnToday:  { type: Number, default: 0 },
    // Unix ms of last withdrawal; used to detect day rollover.
    lastWithdrawnAt: { type: Number, default: 0 },

  },
  { collection: "players" },
);

export const PlayerModel: Model<IPlayer> =
  mongoose.models.Player ?? mongoose.model<IPlayer>("Player", PlayerSchema);
