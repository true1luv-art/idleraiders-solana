/**
 * InputSystem
 * Translates keyboard / mobile joystick state into a normalized movement vector.
 * Stateless output per frame — no side effects.
 *
 * Mobile: joystick vector is written to window.__mobileJoystickInput by MobileHUD.
 */
import { GAME_CONFIG } from '../config/GameConfig.js'

const MOBILE_REGEX = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

/**
 * @typedef {object} MovementResult
 * @property {number} vx
 * @property {number} vy
 * @property {boolean} moving
 * @property {'left'|'right'|'up'|'down'} facing
 * @property {boolean} flipX
 */

export class InputSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [options]
   * @param {number} [options.speed]
   */
  constructor(scene, options = {}) {
    this.scene = scene
    this.speed = options.speed ?? GAME_CONFIG.WIDTH / 8
    this.isMobile = this._detectMobile()
    this.lastFacing = 'down'

    // Use KeyCodes for better cross-platform support
    this.keys = scene.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    })

    if (this.isMobile) {
      this._preventCanvasTouchDefault(scene.game.canvas)
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** @returns {MovementResult} */
  getMovement() {
    return this.isMobile ? this._getMobileMovement() : this._getKeyboardMovement()
  }

  destroy() {
    this._touchCleanup?.()
    this.keys = null
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _getKeyboardMovement() {
    if (!this.keys) return this._idle()

    let vx = 0
    let vy = 0
    let moving = false

    const wDown = this.keys.w?.isDown ?? false
    const aDown = this.keys.a?.isDown ?? false
    const sDown = this.keys.s?.isDown ?? false
    const dDown = this.keys.d?.isDown ?? false

    if (aDown) { vx -= 1; moving = true }
    if (dDown) { vx += 1; moving = true }
    if (wDown) { vy -= 1; moving = true }
    if (sDown) { vy += 1; moving = true }

    if (!moving) return this._idle()

    // Normalise to constant speed on all directions including diagonals
    const len = Math.hypot(vx, vy)
    if (len > 0) { vx = (vx / len) * this.speed; vy = (vy / len) * this.speed }

    // Only update the horizontal facing/flip when there IS horizontal input.
    // For pure up/down movement we keep the last horizontal direction so
    // flipX never flickers mid-animation.
    let facing = this.lastFacing
    let flipX  = this.lastFacing === 'left'

    if (vx < 0) { facing = 'left';  flipX = true  }
    else if (vx > 0) { facing = 'right'; flipX = false }
    else if (vy < 0) { facing = 'up' }
    else if (vy > 0) { facing = 'down' }

    this.lastFacing = facing

    return { vx, vy, moving, facing, flipX }
  }

  _getMobileMovement() {
    const joystick = typeof window !== 'undefined' ? window.__mobileJoystickInput : null
    if (!joystick?.active) return this._idle()

    const vx = (joystick.normalizedX ?? 0) * this.speed
    const vy = (joystick.normalizedY ?? 0) * this.speed
    const moving = Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1

    if (!moving) return this._idle()

    // Only update the horizontal facing/flip when there IS horizontal input,
    // preserving the last horizontal direction for pure vertical movement.
    let facing = this.lastFacing
    let flipX  = this.lastFacing === 'left'

    if (Math.abs(vx) > 0.1) {
      facing = vx > 0 ? 'right' : 'left'
      flipX  = vx < 0
    } else if (Math.abs(vy) > 0.1) {
      facing = vy > 0 ? 'down' : 'up'
      // flipX unchanged — keep last horizontal direction
    }

    this.lastFacing = facing
    return { vx, vy, moving, facing, flipX }
  }

  _idle() {
    return { vx: 0, vy: 0, moving: false, facing: this.lastFacing, flipX: this.lastFacing === 'left' }
  }

  _detectMobile() {
    if (typeof navigator === 'undefined') return false
    const ua = MOBILE_REGEX.test(navigator.userAgent)
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const small = typeof window !== 'undefined' && window.innerWidth <= 768
    const forced = typeof window !== 'undefined' && window.localStorage?.getItem('forceMobileMode') === 'true'
    return forced || ua || (touch && small)
  }

  _preventCanvasTouchDefault(canvas) {
    if (!canvas) return
    const opts = { passive: false }
    const noop = (e) => e.preventDefault?.()
    canvas.addEventListener('touchstart', noop, opts)
    canvas.addEventListener('touchmove', noop, opts)
    canvas.addEventListener('touchend', noop, opts)
    this._touchCleanup = () => {
      canvas.removeEventListener('touchstart', noop)
      canvas.removeEventListener('touchmove', noop)
      canvas.removeEventListener('touchend', noop)
    }
  }
}
