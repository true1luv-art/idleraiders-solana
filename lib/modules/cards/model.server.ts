import mongoose, { Schema, Document, Model, Types } from 'mongoose'

// ═══════════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════════

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'special'
export type CardType = 'hero' | 'special'

export interface CardMarketDoc {
  listed: boolean
  price: number
  seller: string | null
  created: number
  sold: number
}

export interface ICard {
  owner: Types.ObjectId
  cardId: string
  rarity: CardRarity
  type: CardType
  quantity: number
  market: CardMarketDoc
  createdAt: Date
  updatedAt: Date
}

export interface ICardDocument extends ICard, Document {
  _id: Types.ObjectId
}

// ═══════════════════════════════════════════════════════════════════════════════
// Market Schema
// ═══════════════════════════════════════════════════════════════════════════════

const CardMarketSchema = new Schema<CardMarketDoc>(
  {
    listed: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    seller: { type: String, default: null },
    created: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
  },
  { _id: false }
)

// ═══════════════════════════════════════════════════════════════════════════════
// Card Schema
// ═══════════════════════════════════════════════════════════════════════════════

const CardSchema = new Schema<ICardDocument>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    cardId: { type: String, required: true },
    type: {
      type: String,
      enum: ['hero', 'special'],
      required: true,
    },
    cardClass: {
      type: String,
    },
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'special'],
      required: true,
    },
    quantity: { type: Number, default: 1 },
    market: { type: CardMarketSchema, default: () => ({}) },
  },
  { timestamps: true }
)

CardSchema.index({ owner: 1, cardId: 1 }, { unique: true })

// ═══════════════════════════════════════════════════════════════════════════════
// Model Export
// ═══════════════════════════════════════════════════════════════════════════════

const Card: Model<ICardDocument> =
  mongoose.models.Card || mongoose.model<ICardDocument>('Card', CardSchema)

export default Card
