export interface ResourcePositionDef {
  id: string
  x: number
  y: number
}

export const STONE_POSITIONS: ResourcePositionDef[] = [
  { id: 'stone_01', x: 14, y: 12 },
  { id: 'stone_02', x: 23, y: 2 },
  { id: 'stone_03', x: 28, y: 8 },
  { id: 'stone_04', x: 30, y: 23 },
  { id: 'stone_05', x: 21, y: 25 },
  { id: 'stone_06', x: 14, y: 20 },
]

export const IRON_POSITIONS: ResourcePositionDef[] = [
  { id: 'iron_01', x: 33, y: 2 },
  { id: 'iron_02', x: 23, y: 27 },
  { id: 'iron_03', x: 18, y: 35 },
]

export const GOLD_POSITIONS: ResourcePositionDef[] = [
  { id: 'gold_01', x: 33, y: 13 },
  { id: 'gold_02', x: 16, y: 24 },
]
