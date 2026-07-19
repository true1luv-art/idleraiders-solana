/**
 * ProximityHighlight
 * Shows selectbox corner sprites around any interactable object that falls
 * within the player's 3×3 tile proximity range.
 *
 * Each highlighted node gets its own set of four corner sprites so multiple
 * objects can be highlighted at the same time.
 *
 * ProximitySystem calls showNode() / hideNode() as objects enter and leave range.
 */
import { GAME_CONFIG } from '../../config/GameConfig.js'

export class ProximityHighlight {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} [opts]
   * @param {number} [opts.depth]
   * @param {number} [opts.scale]
   */
  constructor(scene, opts = {}) {
    this.scene = scene
    this.depth = opts.depth ?? 7
    this.scale = opts.scale ?? 0.5

    /** @type {Map<string, { tl, tr, bl, br }>} nodeId → corner sprites */
    this._entries = new Map()
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Show corner highlights around a node.
   * If the node has a `.sprite` (i.e. a building), apply a white OutlineFX
   * post-pipeline instead of — or in addition to — the corner bracket sprites.
   * @param {string} key   — unique identifier (node.id stringified)
   * @param {object} node  — { x, y, width?, height?, sprite? }
   */
  showNode(key, node) {
    const ts = GAME_CONFIG.TILE_SIZE
    const left   = node.x
    const top    = node.y
    const right  = node.x + (node.width  ?? ts)
    const bottom = node.y + (node.height ?? ts)

    // Building sprite: apply OutlineFX white edge instead of corner brackets
    if (node.sprite) {
      this._applyOutline(node.sprite)
      // Store a reference so we can remove the outline on hide
      this._entries.set(key, { _spriteRef: node.sprite })
      return
    }

    if (this._entries.has(key)) {
      this._positionCorners(this._entries.get(key), left, top, right, bottom, true)
      return
    }

    const corners = this._createCorners()
    this._positionCorners(corners, left, top, right, bottom, true)
    this._entries.set(key, corners)
  }

  /**
   * Hide corner highlights for a node.
   * @param {string} key
   */
  hideNode(key) {
    const entry = this._entries.get(key)
    if (!entry) return

    // Building sprite outline — remove the post-pipeline
    if (entry._spriteRef) {
      this._removeOutline(entry._spriteRef)
      return
    }

    // Corner bracket sprites
    Object.values(entry).forEach((c) => c?.setVisible?.(false))
  }

  /** Hide all highlights. */
  hideAll() {
    for (const [key] of this._entries) this.hideNode(key)
  }

  destroy() {
    for (const entry of this._entries.values()) {
      if (entry._spriteRef) {
        this._removeOutline(entry._spriteRef)
      } else {
        Object.values(entry).forEach((c) => c?.destroy?.())
      }
    }
    this._entries.clear()
  }

  // ─── Outline helpers ──────────────────────────────────────────────────────

  /**
   * Apply a white drop-shadow outline to a building sprite using Phaser's
   * built-in OutlineFX post-pipeline (Phaser >= 3.60, WebGL only).
   * Falls back to a white tint on Canvas renderer.
   * @param {Phaser.GameObjects.Image} sprite
   */
  _applyOutline(sprite) {
    if (!sprite?.active) return
    try {
      // addGlow(color, outerStrength, innerStrength, knockout)
      // outerStrength=4 matches the CSS drop-shadow(1px) white-edge effect
      // from hover:img-highlight in the /game page.
      // Use preFX so the glow respects the sprite's transparent pixels
      // (giving a tight outline around the building shape, not its bounding box).
      const fx = sprite.preFX?.addGlow(0xffffff, 4, 0, false)
      sprite._proximityFX = fx
    } catch (e) {
      // Canvas fallback — setTint brightens the sprite noticeably
      sprite.setTint(0xffffcc)
      sprite._proximityTinted = true
    }
  }

  /**
   * Remove the outline applied by _applyOutline.
   * @param {Phaser.GameObjects.Image} sprite
   */
  _removeOutline(sprite) {
    if (!sprite?.active) return
    try {
      if (sprite._proximityFX) {
        sprite.preFX?.remove(sprite._proximityFX)
        sprite._proximityFX = null
      }
      if (sprite._proximityTinted) {
        sprite.clearTint()
        sprite._proximityTinted = false
      }
    } catch (e) {
      // ignore
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  _createCorners() {
    const mk = (key, ox, oy) =>
      this.scene.add
        .image(0, 0, key)
        .setOrigin(ox, oy)
        .setScale(this.scale)
        .setDepth(this.depth)
        .setVisible(false)

    return {
      tl: mk('selectbox_tl', 0, 0),
      tr: mk('selectbox_tr', 1, 0),
      bl: mk('selectbox_bl', 0, 1),
      br: mk('selectbox_br', 1, 1),
    }
  }

  _positionCorners(corners, left, top, right, bottom, visible) {
    corners.tl.setPosition(left,  top).setVisible(visible)
    corners.tr.setPosition(right, top).setVisible(visible)
    corners.bl.setPosition(left,  bottom).setVisible(visible)
    corners.br.setPosition(right, bottom).setVisible(visible)
  }
}
