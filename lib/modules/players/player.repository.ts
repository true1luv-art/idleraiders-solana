import Player, { type IPlayer, type IPlayerDocument } from './player.model'
import type { FilterQuery, UpdateQuery, QueryOptions, Types, PipelineStage } from 'mongoose'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreatePlayerData {
  username: string;
  isRegistered?: boolean;
  referredBy?: string;
  coins?: number;
  energy?: number;
  level?: number;
  xp?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Repository Functions
// ═══════════════════════════════════════════════════════════════════════════════

export async function create(data: CreatePlayerData): Promise<IPlayerDocument> {
  return Player.create(data);
}

export async function findById(id: string | Types.ObjectId): Promise<IPlayerDocument | null> {
  return Player.findById(id);
}

export async function findByIdLean(id: string | Types.ObjectId): Promise<IPlayer | null> {
  return Player.findById(id).lean();
}

export async function findByIds(ids: (string | Types.ObjectId)[]): Promise<IPlayerDocument[]> {
  return Player.find({ _id: { $in: ids } });
}

export async function findByUsername(username: string): Promise<IPlayerDocument | null> {
  return Player.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
}

export async function findByUsernameLean(username: string): Promise<IPlayer | null> {
  return Player.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }).lean();
}

export async function findOne(filter: FilterQuery<IPlayer>): Promise<IPlayerDocument | null> {
  return Player.findOne(filter);
}

export async function findMany(
  filter: FilterQuery<IPlayer> = {},
  options: QueryOptions = {}
): Promise<IPlayerDocument[]> {
  return Player.find(filter, null, options);
}

export async function findRegistered(limit: number = 100): Promise<IPlayerDocument[]> {
  return Player.find({ isRegistered: true }).limit(limit);
}

export async function updateById(
  id: string | Types.ObjectId,
  update: UpdateQuery<IPlayer>,
  options: QueryOptions = { returnDocument: 'after' }
): Promise<IPlayerDocument | null> {
  return Player.findByIdAndUpdate(id, update, options);
}

export async function updateByUsername(
  username: string,
  update: UpdateQuery<IPlayer>,
  options: QueryOptions = { returnDocument: 'after' }
): Promise<IPlayerDocument | null> {
  return Player.findOneAndUpdate(
    { username: { $regex: new RegExp(`^${username}$`, 'i') } },
    update,
    options
  );
}

export async function incrementField(
  id: string | Types.ObjectId,
  field: string,
  amount: number
): Promise<IPlayerDocument | null> {
  return Player.findByIdAndUpdate(
    id,
    { $inc: { [field]: amount } },
    { returnDocument: 'after' }
  );
}

export async function setActiveMission(
  playerId: string | Types.ObjectId,
  missionId: Types.ObjectId | null
): Promise<IPlayerDocument | null> {
  return Player.findByIdAndUpdate(playerId, { activeMission: missionId }, { returnDocument: 'after' });
}

export async function clearActiveMission(playerId: string | Types.ObjectId): Promise<IPlayerDocument | null> {
  return setActiveMission(playerId, null);
}

export async function deleteById(id: string | Types.ObjectId): Promise<IPlayerDocument | null> {
  return Player.findByIdAndDelete(id);
}

export async function deleteByUsername(username: string): Promise<IPlayerDocument | null> {
  return Player.findOneAndDelete({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
}

export async function count(filter: FilterQuery<IPlayer> = {}): Promise<number> {
  return Player.countDocuments(filter);
}

export async function countRegistered(): Promise<number> {
  return Player.countDocuments({ isRegistered: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bulk Operations for Reward Distribution
// ═══════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════���═════════════════════════════════════════════════
// Energy Operations
// ═══════════════════════════════════════════════════════════════════════════════

export async function deductEnergy(
  playerId: string | Types.ObjectId,
  amount: number
): Promise<IPlayerDocument | null> {
  return Player.findByIdAndUpdate(
    playerId,
    { $inc: { energy: -amount } },
    { returnDocument: 'after' }
  );
}
