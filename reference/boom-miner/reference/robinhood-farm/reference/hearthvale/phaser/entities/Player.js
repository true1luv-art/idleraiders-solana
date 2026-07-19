/**
 * Player entity — data container only.
 * Movement and animations live in systems/.
 */
import { PLAYER_CONFIG, GAME_CONFIG } from '../config/GameConfig.js'

// ─── Player Class ─────────────────────────────────────────────────────────────

export class Player {
  /**
   * @param {Phaser.Physics.Arcade.Sprite} sprite
   * @param {object} config
   */
  constructor(sprite, config = {}) {
    this.sprite = sprite
    this.speed  = config.speed ?? GAME_CONFIG.WIDTH / 8
    this.facing = 'down'
  }

  // ─── Movement ─────────────────────────────────────────────────────────────

  applyMovement(movement) {
    if (!this.sprite.body) return
    this.sprite.body.setVelocity(movement.vx, movement.vy)
    // Only call setFlipX when the value actually changes to prevent per-frame
    // texture state writes that cause visual flickering on up/down/diagonal movement.
    if (typeof movement.flipX === 'boolean' && this.sprite.flipX !== movement.flipX) {
      this.sprite.setFlipX(movement.flipX)
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  destroy() {
    this.sprite?.destroy()
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a Player and its physics sprite on the scene.
 * @param {Phaser.Scene} scene
 * @param {{ x: number, y: number }} spawn
 * @param {object} [config]
 * @returns {Player}
 */
export function createPlayer(scene, spawn, config = {}) {
  const px = isFinite(spawn?.x) ? spawn.x : 400
  const py = isFinite(spawn?.y) ? spawn.y : 400

  // Use player_idle texture when available, otherwise fall back to a plain rectangle.
  const textureKey = scene.textures.exists('player_idle') ? 'player_idle' : '__DEFAULT'

  const sprite = scene.physics.add.sprite(px, py, textureKey)
  sprite.body
    .setSize(PLAYER_CONFIG.BODY_SIZE.width, PLAYER_CONFIG.BODY_SIZE.height)
    .setOffset(PLAYER_CONFIG.BODY_OFFSET.x, PLAYER_CONFIG.BODY_OFFSET.y)

  // Only play animation if the spritesheet was successfully loaded
  if (textureKey === 'player_idle' && scene.anims.exists('player_idle')) {
    sprite.play('player_idle')
  } else if (textureKey === '__DEFAULT') {
    // Placeholder: tint the default white square green so the player is visible
    sprite.setDisplaySize(16, 24).setTint(0x44bb66)
  }

  return new Player(sprite, config)
}
