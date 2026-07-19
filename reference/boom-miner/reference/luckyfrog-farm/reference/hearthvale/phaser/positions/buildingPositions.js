/**
 * buildingPositions.js
 * Building and NPC zone tile coordinates. x/y/width/height are tile units on the Phaser map (1 tile = 16 px).
 *
 * Tile position (x, y) derivation — same method as crop plots:
 *   - Gameboard: 2100×2100 px  |  GRID_WIDTH_PX = 42  |  map = 50×50 tiles
 *   - Map centre: tile (25, 25) = pixel (1050, 1050)
 *   - tile_x = css_left_px / GRID_WIDTH_PX (42)
 *   - tile_y = css_top_px  / GRID_WIDTH_PX (42)
 *
 * Tile size (width, height) derivation:
 *   The building images are pixel art drawn at the same 16 px/tile scale as the tileset.
 *   Therefore the correct display size in Phaser world pixels = native image dimensions.
 *   _spawnBuildingSprites calls setDisplaySize(b.width * TS, b.height * TS), so:
 *     b.width  = native_image_width_px  / TILE_SIZE (16)
 *     b.height = native_image_height_px / TILE_SIZE (16)
 *
 * Native image sizes:
 *   house.png                48×59  → 3×4 tiles
 *   market_building.png      46×43  → 3×3 tiles  (bazaar, kitchen reuse this)
 *   blacksmith_building.gif  98×56  → 6×4 tiles
 *   tailor.gif (bank)        64×32  → 4×2 tiles
 *   barn: drawn by tilemap layer — zone sized to match art footprint
 *
 * Town container: left = 50% + 8*GRID (1386 px → tile 33),
 *                 top  = 50% − 9*GRID (672  px → tile 16)
 */

export const BUILDING_POSITIONS = [
  // house: right=15*GRID, top=4*GRID, width=3.2*GRID  (native 48×59 → 3×4 tiles)
  { type: 'house',      x: 32, y:  4, width: 3, height: 4 },

  // market: Town + left=4*GRID, top=-2*GRID  (native 46×43 → 3×3 tiles)
  { type: 'market',     x: 37, y: 14, width: 3, height: 3 },

  // bazaar: Town + left=8*GRID, top=-2*GRID  (native 46×43 → 3×3 tiles)
  { type: 'bazaar',     x: 41, y: 14, width: 3, height: 3 },

  // blacksmith: Town + left=7.6*GRID, top=-12*GRID  (native 98×56 → 6×4 tiles)
  { type: 'blacksmith', x: 41, y:  4, width: 6, height: 4 },

  // kitchen: Town + right=5*GRID→left=4*GRID, top=4*GRID  (native 46×43 → 3×3 tiles)
  { type: 'kitchen',    x: 37, y: 20, width: 3, height: 3 },

  // bank: Town + right=6*GRID→left=2*GRID, top=0  (native tailor.gif 64×32 → 4×2 tiles)
  { type: 'bank',       x: 35, y: 16, width: 4, height: 2 },

  // barn: Animals container → left=−13*GRID from (50%−4*GRID), top=+19.5*GRID  (3×3 tile zone)
  { type: 'barn',       x:  8, y: 28, width: 3, height: 3 },
]
