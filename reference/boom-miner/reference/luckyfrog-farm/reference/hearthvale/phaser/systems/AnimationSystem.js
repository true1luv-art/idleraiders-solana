/**
 * AnimationSystem
 * Registers all Phaser animations from AnimationConfig.
 * Called once in scene create(). Holds no state after registration.
 */
import { ANIMATION_CONFIG } from '../config/AnimationConfig.js'

export class AnimationSystem {
  /** @param {Phaser.Scene} scene */
  constructor(scene) {
    this.scene = scene
  }

  createPlayerAnimations() {
    const cfg = ANIMATION_CONFIG.PLAYER
    this._register(cfg.IDLE)
    this._register(cfg.WALK)
    this._register(cfg.MINE)
    this._register(cfg.AXE)
    this._register(cfg.DOING)
    this._registerSafe(cfg.WAITING)

    const fish = ANIMATION_CONFIG.FISHING
    this._registerSafe(fish.CASTING)
    this._registerSafe(fish.REELING)
    this._registerSafe(fish.CAUGHT)
  }

  createNpcAnimations() {
    this._registerSafe(ANIMATION_CONFIG.BLACKSMITH.HAMMER)
    this._registerSafe(ANIMATION_CONFIG.MERCHANT.IDLE)
    // NPC barn keeper uses 'player_idle' which is already registered in createPlayerAnimations()
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _register(conf) {
    if (this.scene.anims.exists(conf.key)) return
    // Skip if the spritesheet texture was never loaded (e.g. file not in /public yet)
    if (!this.scene.textures.exists(conf.key)) {
      console.warn(`[AnimationSystem] Skipping "${conf.key}" — texture not loaded`)
      return
    }
    this.scene.anims.create({
      key: conf.key,
      frames: this.scene.anims.generateFrameNumbers(conf.key, conf.frames),
      frameRate: conf.frameRate,
      repeat: conf.repeat,
    })
  }

  _registerSafe(conf) {
    if (this.scene.anims.exists(conf.key)) return
    try { this._register(conf) } catch (e) {
      console.warn(`[AnimationSystem] Could not register "${conf.key}":`, e.message)
    }
  }
}
