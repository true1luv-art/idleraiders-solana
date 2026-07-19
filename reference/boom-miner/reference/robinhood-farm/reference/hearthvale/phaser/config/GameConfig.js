/**
 * GameConfig
 * Pure data constants. No Phaser API calls. No imports from game code.
 * Add new constants here — never scatter magic numbers in scenes or systems.
 */

export const GAME_CONFIG = {
  WIDTH: 800,
  HEIGHT: 800,
  BG_COLOR: '#1a1a1a',
  PIXEL_ART: true,

  /** Camera zoom level */
  ZOOM: 4,

  /** Physics gravity (top-down = 0) */
  GRAVITY: { y: 0 },

  /** World tile size in pixels */
  TILE_SIZE: 16,

  /** Player sprite sheet dimensions */
  SPRITE_WIDTH: 96,
  SPRITE_HEIGHT: 64,

  /**
   * Proximity interaction range: 3×3 tile area centered on the player.
   * Any interactable object whose tile overlaps this range will be
   * highlighted and become clickable. No spacebar, no mobile button.
   */
  INTERACTION_RADIUS_TILES: 1, // 1 = ±1 tile in each direction → 3×3 grid

  /**
   * Buildings are large multi-tile structures so they need a wider
   * interaction radius than single-tile resource nodes.
   * 3 = ±3 tiles → 7×7 grid around the player.
   */
  BUILDING_INTERACTION_RADIUS_TILES: 3,
}

export const PLAYER_CONFIG = {
  /** Arcade physics body dimensions */
  BODY_SIZE: { width: 10, height: 10 },
  BODY_OFFSET: { x: 43, y: 27 },
}

/**
 * NPC_CONFIG
 * Shared config for all NPC sprites.
 * NPCs use the same spr_idle_strip9.png spritesheet as the player so they
 * render at identical scale. The texture is already loaded by PlayerAssetLoader
 * under the key 'player_idle' — no separate load step required.
 */
export const NPC_CONFIG = {
  /** Phaser texture key — already loaded by PlayerAssetLoader */
  textureKey: 'player_idle',
  /** Animation key to play on the NPC sprite */
  animKey: 'player_idle',
  /** Depth below player (player is 20) but above terrain */
  depth: 18,
}
