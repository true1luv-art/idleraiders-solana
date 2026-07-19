import Item, { type IItem, type IItemDocument } from './item.model'
import type { FilterQuery, UpdateQuery, QueryOptions, Types } from 'mongoose'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateItemData {
  playerId: Types.ObjectId | string
  id: string
  itemType: 'material'
  quantity: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// Repository Functions — materials only
// Potions are now embedded on the Player document.
// Packs are no longer persisted; buying a pack immediately mints cards.
// ═══════════════════════════════════════════════════════════════════════════════

export async function create(data: CreateItemData): Promise<IItemDocument> {
  return Item.create(data)
}

export async function findById(id: string): Promise<IItemDocument | null> {
  return Item.findById(id)
}

export async function findOne(filter: FilterQuery<IItem>): Promise<IItemDocument | null> {
  return Item.findOne(filter)
}

export async function findMany(
  filter: FilterQuery<IItem> = {},
  options: QueryOptions = {}
): Promise<IItemDocument[]> {
  return Item.find(filter, null, options)
}

export async function findByPlayer(
  playerId: Types.ObjectId | string
): Promise<IItemDocument[]> {
  return Item.find({ playerId, itemType: 'material' })
}

export async function findByPlayerAndId(
  playerId: Types.ObjectId | string,
  itemId: string
): Promise<IItemDocument | null> {
  return Item.findOne({ playerId, id: itemId, itemType: 'material' })
}

export async function findMaterial(
  playerId: Types.ObjectId | string,
  materialId: string
): Promise<IItemDocument | null> {
  return Item.findOne({ playerId, id: materialId, itemType: 'material' })
}

export async function updateById(
  id: string,
  update: UpdateQuery<IItem>,
  options: QueryOptions = { returnDocument: 'after' }
): Promise<IItemDocument | null> {
  return Item.findByIdAndUpdate(id, update, options)
}

export async function updateOne(
  filter: FilterQuery<IItem>,
  update: UpdateQuery<IItem>,
  options: QueryOptions = { returnDocument: 'after' }
): Promise<IItemDocument | null> {
  return Item.findOneAndUpdate(filter, update, options)
}

export async function incrementQuantity(
  playerId: Types.ObjectId | string,
  itemId: string,
  amount: number
): Promise<IItemDocument | null> {
  return Item.findOneAndUpdate(
    { playerId, id: itemId, itemType: 'material' },
    { $inc: { quantity: amount } },
    { returnDocument: 'after', upsert: true }
  )
}

export async function upsertItem(
  playerId: Types.ObjectId | string,
  itemId: string,
  quantity: number
): Promise<IItemDocument | null> {
  return Item.findOneAndUpdate(
    { playerId, id: itemId, itemType: 'material' },
    { $inc: { quantity } },
    { returnDocument: 'after', upsert: true }
  )
}

export async function decrementQuantity(
  playerId: Types.ObjectId | string,
  itemId: string,
  amount: number
): Promise<IItemDocument | null> {
  return Item.findOneAndUpdate(
    { playerId, id: itemId, itemType: 'material' },
    { $inc: { quantity: -amount } },
    { returnDocument: 'after' }
  )
}

export async function deleteById(id: string): Promise<IItemDocument | null> {
  return Item.findByIdAndDelete(id)
}

export async function deleteOne(filter: FilterQuery<IItem>): Promise<IItemDocument | null> {
  return Item.findOneAndDelete(filter)
}

export async function count(filter: FilterQuery<IItem> = {}): Promise<number> {
  return Item.countDocuments(filter)
}

export async function getMaterials(
  playerId: Types.ObjectId | string
): Promise<IItemDocument[]> {
  return Item.find({ playerId, itemType: 'material' })
}
