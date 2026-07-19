/**
 * HoverCornerHighlight
 * Shows selectbox corner sprites around the tile under the mouse cursor.
 * Only activates for tiles that contain an interactable object within the
 * player's proximity range. Hidden on touch events — mobile uses taps directly.
 *
 * Usage:
 *   new HoverCornerHighlight(scene, {
 *     resolveBounds: ({ tileX, tileY }) => boundsOrNull
 *   })
 */
import { GAME_CONFIG } from '../../config/GameConfig.js'

export class HoverCornerHighlight {
  /**
   * @param {Phaser.Scene} scene
   * @param {{
   *   tileSize?: number,
   *   depth?: number,
   *   scale?: number,
   *   enabled?: boolean,
   *   resolveBounds?: (ctx: object) => { left, top, right, bottom }|null
   * }} [opts]
   */
  constructor(scene, opts = {}) {
    this.scene = scene
    this.tileSize = opts.tileSize ?? GAME_CONFIG.TILE_SIZE
    this.depth = opts.depth ?? 8
    this.scale = opts.scale ?? 0.5
    this.enabled = opts.enabled ?? true
    this.resolveBounds = typeof opts.resolveBounds === 'function' ? opts.resolveBounds : () => null

    this._lastTileX = null
    this._lastTileY = null
    this.corners = {}

    this._create()
    this._registerListeners()
  }

  setEnabled(enabled) {
    this.enabled = !!enabled
    this._lastTileX = null
    this._lastTileY = null
    if (!enabled) this.hide()
  }

  show(left, top, right, bottom) {
    const { tl, tr, bl, br } = this.corners
    tl.setVisible(true).setPosition(left, top)
    tr.setVisible(true).setPosition(right, top)
    bl.setVisible(true).setPosition(left, bottom)
    br.setVisible(true).setPosition(right, bottom)
  }

  hide() {
    Object.values(this.corners).forEach((c) => c?.setVisible(false))
  }

  destroy() {
    if (this.scene?.input && this._onPointerMove) {
      this.scene.input.off('pointermove', this._onPointerMove)
    }
    Object.values(this.corners).forEach((c) => c?.destroy())
    this.corners = {}
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _create() {
    const mk = (key, ox, oy) =>
      this.scene.add
        .image(0, 0, key)
        .setOrigin(ox, oy)
        .setScale(this.scale)
        .setDepth(this.depth)
        .setVisible(false)

    this.corners = {
      tl: mk('selectbox_tl', 0, 0),
      tr: mk('selectbox_tr', 1, 0),
      bl: mk('selectbox_bl', 0, 1),
      br: mk('selectbox_br', 1, 1),
    }
  }

  _registerListeners() {
    this._onPointerMove = (pointer) => this._handleMove(pointer)
    this.scene.input.on('pointermove', this._onPointerMove)
  }

  _handleMove(pointer) {
    if (!this.enabled || !this.scene?.cameras?.main) { this.hide(); return }

    const pointerType = pointer?.event?.pointerType ?? (pointer?.wasTouch ? 'touch' : 'mouse')
    if (pointerType === 'touch') { this.hide(); return }

    const wp = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
    const tx = Math.floor(wp.x / this.tileSize)
    const ty = Math.floor(wp.y / this.tileSize)

    if (tx === this._lastTileX && ty === this._lastTileY) return
    this._lastTileX = tx
    this._lastTileY = ty

    const bounds = this.resolveBounds({ tileX: tx, tileY: ty, worldPoint: wp, pointer })
    if (!bounds) { this.hide(); return }
    this.show(bounds.left, bounds.top, bounds.right, bounds.bottom)
  }
}
