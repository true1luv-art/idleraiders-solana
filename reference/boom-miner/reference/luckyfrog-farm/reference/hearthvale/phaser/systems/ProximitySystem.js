/**
 * ProximitySystem
 * Computes which interactable objects fall within the player's 3×3 tile range
 * each frame and notifies listeners so overlays and click-handlers can react.
 *
 * Design rules:
 *  - No spacebar interactions.
 *  - No mobile action button.
 *  - Objects in range are highlighted (via HoverCornerHighlight / TileHighlightOverlay).
 *  - Player CLICKS the highlighted object to trigger interaction (desktop & mobile).
 */
import { GAME_CONFIG } from '../config/GameConfig.js'

export class ProximitySystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../entities/Player.js').Player} player
   * @param {object} [options]
   * @param {number} [options.radiusTiles]   half-extent in tiles (1 = 3×3, 2 = 5×5)
   */
  constructor(scene, player, options = {}) {
    this.scene = scene
    this.player = player
    this.radiusTiles = options.radiusTiles ?? GAME_CONFIG.INTERACTION_RADIUS_TILES

    /** @type {Set<string>}  tile keys currently in range, format "x,y" */
    this._inRange = new Set()

    /** @type {Map<string, object>}  nodeId → node currently highlighted */
    this._highlighted = new Map()
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Call every frame from scene.update().
   * @param {object} nodeCollections  e.g. { trees: {...}, stones: {...}, plots: {...} }
   * @param {import('../ui/overlays/ProximityHighlight.js').ProximityHighlight} highlight
   */
  update(nodeCollections, highlight) {
    const ts = GAME_CONFIG.TILE_SIZE
    const px = Math.floor(this.player.sprite.x / ts)
    const py = Math.floor(this.player.sprite.y / ts)
    const r = this.radiusTiles

    this._inRange.clear()
    for (let tx = px - r; tx <= px + r; tx++) {
      for (let ty = py - r; ty <= py + r; ty++) {
        this._inRange.add(`${tx},${ty}`)
      }
    }

    const nowHighlighted = new Map()

    for (const [, nodes] of Object.entries(nodeCollections)) {
      if (!nodes) continue
      for (const node of Object.values(nodes)) {
        if (!node || node.isDepleted) continue

        const nodeTileX = Math.floor(node.x / ts)
        const nodeTileY = Math.floor(node.y / ts)
        const nodeTileW = Math.ceil((node.width ?? ts) / ts)
        const nodeTileH = Math.ceil((node.height ?? ts) / ts)

        let overlaps = false
        outer: for (let tx = nodeTileX; tx < nodeTileX + nodeTileW; tx++) {
          for (let ty = nodeTileY; ty < nodeTileY + nodeTileH; ty++) {
            if (this._inRange.has(`${tx},${ty}`)) { overlaps = true; break outer }
          }
        }

        if (overlaps) {
          const key = String(node.id ?? `${nodeTileX},${nodeTileY}`)
          nowHighlighted.set(key, node)
        }
      }
    }

    // Sync highlight overlay
    if (highlight) {
      // Hide nodes that left range
      for (const [key] of this._highlighted) {
        if (!nowHighlighted.has(key)) highlight.hideNode(key)
      }
      // Show nodes that entered range
      for (const [key, node] of nowHighlighted) {
        if (!this._highlighted.has(key)) highlight.showNode(key, node)
      }
    }

    this._highlighted = nowHighlighted
  }

  /**
   * Check if a specific node is currently within range.
   * @param {object} node
   * @returns {boolean}
   */
  isNodeInRange(node) {
    if (!node) return false
    const ts        = GAME_CONFIG.TILE_SIZE
    const nodeTileX = Math.floor(node.x / ts)
    const nodeTileY = Math.floor(node.y / ts)
    const nodeTileW = Math.ceil((node.width  ?? ts) / ts)
    const nodeTileH = Math.ceil((node.height ?? ts) / ts)

    for (let tx = nodeTileX; tx < nodeTileX + nodeTileW; tx++) {
      for (let ty = nodeTileY; ty < nodeTileY + nodeTileH; ty++) {
        if (this._inRange.has(`${tx},${ty}`)) return true
      }
    }
    return false
  }

  destroy() {
    this._inRange.clear()
    this._highlighted.clear()
  }
}
