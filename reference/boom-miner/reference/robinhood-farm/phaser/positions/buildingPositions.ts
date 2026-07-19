export const BUILDING_KEYS = [
  'summoning_shrine',
] as const

export type BuildingKey = (typeof BUILDING_KEYS)[number]

export interface BuildingZoneDef {
  type: string
  x: number
  y: number
  width: number
  height: number
}

export const BUILDING_POSITIONS: BuildingZoneDef[] = [
  { type: 'house', x: 30, y: 3, width: 3, height: 4 },
  { type: 'market', x: 27, y: 13, width: 3, height: 3 },
  { type: 'kitchen', x: 22, y: 19, width: 3, height: 3 },
  // summoning_shrine.png — 32×48 px native (2:3) → displayed at 2×3 tiles
  { type: 'summoning_shrine', x: 26, y: 18, width: 2, height: 3 },
]
