/**
 * npcs.js
 * World positions for all NPC characters.
 *
 * Coordinates are in tile units (1 tile = 16 world px).
 * The map is 50×50 tiles — tile (25, 25) is the world centre.
 *
 * Fields:
 *   id      — unique string identifier used by ProximitySystem / click handler
 *   texture — Phaser texture key (loaded in FarmAssetLoader)
 *   x, y    — tile coordinates of the NPC's top-left corner
 *   width   — tile width  (used for proximity footprint)
 *   height  — tile height (used for proximity footprint)
 *   event   — CustomEvent name dispatched when the player clicks the NPC in range
 *   facing  — initial sprite flip: 'left' | 'right' (default 'right')
 */
export const NPC_POSITIONS = [
  {
    id:      'bald_man',
    // Uses spr_idle_strip9.png via NPC_CONFIG.textureKey — already loaded by PlayerAssetLoader
    texture: 'player_idle',
    // Map centre: 50×50 tiles → centre tile (25, 25)
    x:       25,
    y:       25,
    // 2×2 tile footprint gives a reliable click/proximity target at game zoom
    width:   2,
    height:  2,
    event:   'phaser-barnsale-open',
    facing:  'right',
  },
]
