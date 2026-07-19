/**
 * barnPositions.js
 * Spawn positions (in Phaser tile units) for animals near the barn.
 *
 * Coordinate derivation — same formula as buildingPositions.js:
 *   GRID_WIDTH_PX = 42  (CSS grid unit on the 2100×2100 gameboard)
 *   TILE_SIZE     = 16  (Phaser world px per tile)
 *   tile_x        = absolute_css_left_px / GRID_WIDTH_PX
 *   tile_y        = absolute_css_top_px  / GRID_WIDTH_PX
 *
 * Animals.tsx container (absolute on gameboard):
 *   left = calc(50% - 4*GRID) = 1050 - 168 = 882 px  → tile 21
 *   top  = calc(50% - 16*GRID) = 1050 - 672 = 378 px  → tile 9
 *
 * Each animal group then applies its own left/top offset from the container:
 *
 *   Chickens  left = -15*GRID = -630 → abs 882-630 = 252 px → tile  6
 *             top  =  25*GRID = 1050 → abs 378+1050 = 1428 px → tile 34
 *   Cows      left = -15*GRID = -630 → abs 252 px → tile  6
 *             top  =  28*GRID = 1176 → abs 378+1176 = 1554 px → tile 37
 *   Sheep     left = -10*GRID = -420 → abs 882-420 = 462 px → tile 11
 *             top  =  25*GRID = 1050 → abs 378+1050 = 1428 px → tile 34
 *
 * CHICKEN_POSITIONS in constants.ts uses { top, right } in px (50 px steps).
 * Converted to tiles: 50 px / 42 px ≈ 1 tile (rounded to nearest integer).
 * right offsets count *backwards* from the container's right edge; since each
 * chicken slot is 50 px apart we map right=0→col 0, right=50→col 1, etc.
 */

// ── Barn building zone ───────────────────────────────────────────────────────
// Matches { type: 'barn', x: 8, y: 28 } in buildingPositions.js
export const BARN_ZONE = { x: 8, y: 28, width: 3, height: 3 }

// ── Chicken spawn grid ───────────────────────────────────────────────────────
// 2 rows × 5 cols, 1 tile apart, anchored at tile (6, 34)
// Matches CHICKEN_POSITIONS[0..9] — max 10 chickens
export const CHICKEN_SPAWN_POSITIONS = [
  // row 0  (top: 0 px → tile 34)
  { index: 0, x:  6, y: 34 },  // right:   0 px
  { index: 1, x:  7, y: 34 },  // right:  50 px
  { index: 2, x:  8, y: 34 },  // right: 100 px
  { index: 3, x:  9, y: 34 },  // right: 150 px
  { index: 4, x: 10, y: 34 },  // right: 200 px
  // row 1  (top: 50 px → tile 35)
  { index: 5, x:  6, y: 35 },
  { index: 6, x:  7, y: 35 },
  { index: 7, x:  8, y: 35 },
  { index: 8, x:  9, y: 35 },
  { index: 9, x: 10, y: 35 },
]

// ── Cow spawn positions ──────────────────────────────────────────────────────
// Single row, 2 tiles apart for spacing (cows are larger), anchored at (6, 37)
// Max 5 cows — spread across the available pasture width
export const COW_SPAWN_POSITIONS = [
  { index: 0, x:  6, y: 37 },
  { index: 1, x:  8, y: 37 },
  { index: 2, x: 10, y: 37 },
  { index: 3, x:  6, y: 39 },
  { index: 4, x:  8, y: 39 },
]

// ── Sheep spawn positions ────────────────────────────────────────────────────
// Anchored at (11, 34), 1–2 tiles apart; sheep are medium-sized
// Max 5 sheep
export const SHEEP_SPAWN_POSITIONS = [
  { index: 0, x: 11, y: 34 },
  { index: 1, x: 13, y: 34 },
  { index: 2, x: 11, y: 36 },
  { index: 3, x: 13, y: 36 },
  { index: 4, x: 12, y: 35 },
]
