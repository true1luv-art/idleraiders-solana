/**
 * lib/modules/farms/model.server.ts
 *
 * MongoDB schema for the `farms` collection. §2.1-A
 *
 * Each registered player owns exactly one farm document.
 * The farm stores all world-state: crop plots, resource nodes, animals,
 * fishing, cooking, stamina, and lifetime activity counters.
 *
 * Skills and HFARM balance live on the `players` document, NOT here.
 * The farm only holds the physical world state.
 *
 * Reference: docs/implementation_plans/phase-02-farming-backend.md §2.1-A
 */

import mongoose, { Schema, Model } from "mongoose";
import type {
  FieldNode, ResourceNode, AnimalNode,
  FishingState, StaminaState,
  IFarm,
} from "./types.server";

export type {
  FieldNode, ResourceNode, AnimalNode,
  FishingState, StaminaState,
  IFarm,
} from "./types.server";
import type {
  QuestCategory,
  QuestDifficulty,
  QuestStatus,
  EmbeddedQuest,
} from "@/features/types/quests";



// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const FieldNodeSchema = new Schema<FieldNode>(
  { name: { type: String, required: true }, plantedAt: { type: Number, default: 0 } },
  { _id: false },
);

const ResourceNodeSchema = new Schema<ResourceNode>(
  {
    name: { type: String, required: true },
    harvestedAt: { type: Number },
  },
  { _id: false },
);

const AnimalNodeSchema = new Schema<AnimalNode>(
  {
    type:  { type: String, required: true },
    fedAt: { type: Number },
  },
  { _id: false },
);

const FishingStateSchema = new Schema<FishingState>(
  {
    lastCastAt:     { type: Number, default: 0 },
    lastCaughtFish: { type: String, default: null },
  },
  { _id: false },
);

const StaminaStateSchema = new Schema<StaminaState>(
  {
    current: { type: Number, default: 100 },
    max: { type: Number, default: 100 },
    lastRegenAt: { type: Number, default: 0 },
  },
  { _id: false },
);

const EmbeddedQuestSchema = new Schema<EmbeddedQuest>(
  {
    id: { type: String, required: true },
    category: { type: String, enum: ["farming", "mining", "woodcutting", "fishing", "husbandry"], required: true },
    difficulty: { type: String, enum: ["easy", "normal", "hard", "expert"], required: true },
    status: { type: String, enum: ["active", "completed", "expired"], default: "active" },
    objective: {
      resource: { type: String, required: true },
      required: { type: Number, required: true },
    },
    rewards: {
      rewardRep: { type: Number, required: true },
      skillXp: { type: Number, required: true },
    },
    generatedAt: { type: Number, required: true },
    expiresAt: { type: Number, required: true },
    completedAt: { type: Number },
  },
  { _id: false },
);

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

const FarmSchema = new Schema<IFarm>(
  {
    playerId: { type: String, required: true, unique: true, index: true },

    fields: { type: Map, of: FieldNodeSchema, default: {} },
    trees: { type: Map, of: ResourceNodeSchema, default: {} },
    stones: { type: Map, of: ResourceNodeSchema, default: {} },
    iron: { type: Map, of: ResourceNodeSchema, default: {} },
    gold: { type: Map, of: ResourceNodeSchema, default: {} },

    chickens: { type: Map, of: AnimalNodeSchema, default: {} },
    cows: { type: Map, of: AnimalNodeSchema, default: {} },
    sheep: { type: Map, of: AnimalNodeSchema, default: {} },

    fishing: { type: FishingStateSchema, default: () => ({}) },
    stamina: { type: StaminaStateSchema, default: () => ({}) },

    quests: {
      daily: { type: [EmbeddedQuestSchema], default: [] },
    },

    milestones: { type: Map, of: Number, default: {} },
  },
  {
    collection: "farms",
    timestamps: true,  // createdAt / updatedAt managed by Mongoose
  },
);

// ---------------------------------------------------------------------------
// Index audit — §2.6-B
//
// All farm action endpoints query by playerId only; the unique index above
// satisfies the P95 < 200 ms budget for the POST /api/farm/action hot path.
//
// Additional indexes:
//   { updatedAt: -1 }  — used by any future admin tools that need to find the
//                         most-recently-modified farms (e.g. monitoring stale
//                         farms, debugging). Not on the action hot path.
//
// Indexes NOT needed:
//   milestones — never queried directly; only read via playerId.
//   fields / trees / stones / iron / gold — sub-documents, not independently queried.
// ---------------------------------------------------------------------------
FarmSchema.index({ updatedAt: -1 });

export const FarmModel: Model<IFarm> =
  mongoose.models.Farm ?? mongoose.model<IFarm>("Farm", FarmSchema);
