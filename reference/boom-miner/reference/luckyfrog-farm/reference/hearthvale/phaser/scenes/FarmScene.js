/**
 * FarmScene — farming-only Phaser scene.
 *
 * Map model:
 *   Tiled JSON tilemap (island.json) rendered with the sunnyside tileset.
 *   50×50 tiles at 16 px → 800×800 px world.
 *   Tilelayers (bottom → top): water, sand, land, mountain, path, plots,
 *   bridge, fence, ladder, barn, decor2, decor.
 *   Object layers: locks, dungeon_node, plot_node, stone_node, tree_node,
 *   iron_node, player, npcs.
 *
 * Interaction model:
 *   - WASD / mobile joystick for movement.
 *   - ProximitySystem highlights interactable objects within the 3×3 tile range.
 *   - Clicking / tapping a highlighted object triggers the interaction.
 *   - No click-to-move. No spacebar. No mobile action button. No dungeon. No combat.
 */
import * as Phaser from 'phaser'
import { GAME_CONFIG, NPC_CONFIG } from '../config/GameConfig.js'

import {
  PLOT_POSITIONS,
  TREE_POSITIONS,
  STONE_POSITIONS,
  IRON_POSITIONS,
  GOLD_POSITIONS,
  BUILDING_POSITIONS,
  NPC_POSITIONS,
  CHICKEN_SPAWN_POSITIONS,
  COW_SPAWN_POSITIONS,
  SHEEP_SPAWN_POSITIONS,
  FISHING_POSITIONS,
} from '../positions/index.js'

import * as Loaders from '../loaders/index.js'
import { AnimationSystem } from '../systems/AnimationSystem.js'
import { InputSystem }     from '../systems/InputSystem.js'
import { ProximitySystem } from '../systems/ProximitySystem.js'
import { FIELD_LEVEL_REQUIREMENTS } from 'features/game/lib/experience'

import { ProximityHighlight }  from '../ui/overlays/ProximityHighlight.js'
import { HoverCornerHighlight } from '../ui/overlays/HoverCornerHighlight.js'

import { createPlayer } from '../entities/Player.js'

export class FarmScene extends Phaser.Scene {
  constructor() {
    super('FarmScene')
  }

  // ─── Init ─────────────────────────────────────────────────────────────────

  init() {
    this.socket      = this.game.registry.get('socket')      ?? null
    this.playerState = this.game.registry.get('playerState') ?? {}
  }

  // ─── Preload ──────────────────────────────────────────────────────────────

  preload() {
    Loaders.loadPlayerAssets(this)
    Loaders.loadFarmAssets(this)
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  create() {
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this._shutdown())

    try {
      this._createInternal()
    } catch (err) {
      console.error('[FarmScene] create() threw:', err?.message, err?.stack)
      // Show fallback text so the canvas isn't entirely blank
      this.add.text(400, 400, `Scene error:\n${err?.message}`, {
        fontSize: '14px',
        color: '#ff4444',
        wordWrap: { width: 700 },
      }).setOrigin(0.5)
    }
  }

  _createInternal() {
    // ── Tilemap ────────────────────────────────────────────────────────────
    const map = this.make.tilemap({ key: 'island' })

    // island.json tileset name matches the embedded "name" key: spr_tileset_sunnysideworld_16px
    // The second arg ('tiles') is the Phaser texture key loaded in FarmAssetLoader.
    const tileset = map.addTilesetImage('spr_tileset_sunnysideworld_16px', 'tiles')
    this._buildLayers(map, tileset)

    const worldW = map.widthInPixels   // 800
    const worldH = map.heightInPixels  // 800

    // ── Animations — must register BEFORE createPlayer so play() succeeds ──
    const anims = new AnimationSystem(this)
    anims.createPlayerAnimations()
    anims.createNpcAnimations()
    this._createResourceAnimations()

    // ── Node collections — populated from Tiled object layers ─────────────
    this._treeNodes     = {}
    this._stoneNodes    = {}
    this._plotNodes     = {}
    this._buildingZones = []

    // Fishing spot nodes — keyed by spot.id
    this._fishingNodes = {}

    // NPC nodes — keyed by npc.id, used by ProximitySystem and click handler
    this._npcNodes = {}

    // Animal sprites — keyed by "{type}_{index}"
    this._animalNodes = {}

    // Prevents multiple rapid clicks from registering while the strike
    // animation is still playing — enforces one hit at a time.
    this._strikeLock = false
    // Prevents rapid re-triggering of the plot doing (dig/sow) animation.
    this._doingLock  = false

    // The building/NPC whose modal is currently open. update() checks each frame
    // and closes the modal automatically when the player walks out of range.
    this._activeBuilding = null
    this._activeNpc      = null

    // window.__nodeTooltip is written every frame by _updateProximityTooltip
    // and polled by NodeTooltip in React.

    const { spawnX, spawnY } = this._readObjectLayers(map)

    // Attach invisible zone sprites to every plot node so ProximityHighlight
    // and the hover system can reference them by .sprite.
    this._spawnPlotSprites()
    this._startCropTimer()
    this._spawnResourceSprites()
    this._restoreDepletedNodes()
    this._spawnBuildingSprites()
    this._spawnBuildingColliders()
    this._buildFishingZone()
    this._spawnNpcSprites()
    this._spawnAnimalSprites()

    // ── Player ─────────────────────────────────────────────────────────────
    // Spawn position comes from the 'player' object layer in island.json.
    // createPlayer guards against missing textures automatically.
    this.player = createPlayer(this, { x: spawnX, y: spawnY }, { speed: GAME_CONFIG.WIDTH / 8 })
    // Depth 20 keeps the player above all 12 tilelayers (max depth = 11)
    this.player.sprite.setDepth(20)

    // Building collision — player cannot walk through buildings
    if (this._buildingColliders) {
      this.physics.add.collider(this.player.sprite, this._buildingColliders)
    }

    // Camera — zoom first, then bounds, then follow so all constraints are in
    // place when Phaser calculates the initial scroll position.
    const cam = this.cameras.main
    cam.setZoom(GAME_CONFIG.ZOOM)
    cam.setBounds(0, 0, worldW, worldH)
    // Use instant follow (false) instead of lerp (true) to prevent jitter when
    // moving diagonally at high zoom levels — pixel-perfect movement is smoother.
    cam.startFollow(this.player.sprite, false)
    // Manually snap to player on the first frame because startFollow with RESIZE
    // scale mode can miscalculate scroll before the first update tick.
    cam.scrollX = Phaser.Math.Clamp(
      this.player.sprite.x - cam.width  / (2 * GAME_CONFIG.ZOOM),
      0, worldW - cam.width  / GAME_CONFIG.ZOOM,
    )
    cam.scrollY = Phaser.Math.Clamp(
      this.player.sprite.y - cam.height / (2 * GAME_CONFIG.ZOOM),
      0, worldH - cam.height / GAME_CONFIG.ZOOM,
    )

    // ── Systems ────────────────────────────────────────────────────────────
    this.input_    = new InputSystem(this)
    this.proximity = new ProximitySystem(this, this.player, {
      radiusTiles: GAME_CONFIG.INTERACTION_RADIUS_TILES,
    })

    // ── UI ──������──────────────────────────────────────────────────────────────
    this.proximityHighlight = new ProximityHighlight(this)
    this.hoverHighlight = new HoverCornerHighlight(this, {
      resolveBounds: ({ tileX, tileY }) => this._getHoverBounds(tileX, tileY),
    })

    // ── Click / tap handler ────────────────────────────────────────────────
    this._setupPointerInteraction()

    window.dispatchEvent?.(new CustomEvent('phaser-scene-start', { detail: { sceneName: 'FarmScene' } }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this._shutdown, this)
  }

  // ─── Update ─────────────────────────────────────���─────────────────────────

  update() {
    const movement = this.input_.getMovement()
    const canAnim  = (key) => this.anims.exists(key)

    // Do not override a one-shot action animation (mine / axe) with walk/idle
    const currentAnim  = this.player.sprite.anims?.currentAnim?.key
    const actionAnims  = ['player_mine', 'player_axe', 'player_doing', 'player_casting', 'player_reeling', 'player_caught']
    const playingAction = actionAnims.includes(currentAnim) && this.player.sprite.anims?.isPlaying

    if (!playingAction) {
      if (movement.moving) {
        this.player.facing = movement.facing
        this.player.applyMovement(movement)
        if (canAnim('player_walk') && currentAnim !== 'player_walk') {
          this.player.sprite.play('player_walk', true)
        }
      } else {
        this.player.sprite.body?.setVelocity(0, 0)
        if (canAnim('player_idle') && currentAnim !== 'player_idle') {
          this.player.sprite.play('player_idle', true)
        }
      }
    } else {
      // Still block movement while action plays
      this.player.sprite.body?.setVelocity(0, 0)
    }

    // Build a proxy collection for animals that matches the shape ProximitySystem
    // expects: { x, y, width, height, sprite }.  Animals move every frame so we
    // rebuild the map here rather than caching it.
    const animalProxyNodes = {}
    for (const [key, node] of Object.entries(this._animalNodes ?? {})) {
      if (!node?.sprite?.active) continue
      const ts = GAME_CONFIG.TILE_SIZE
      animalProxyNodes[key] = {
        id:     key,
        x:      node.sprite.x - ts,   // left edge of 2×TS sprite
        y:      node.sprite.y - ts,   // top  edge of 2×TS sprite
        width:  ts * 2,
        height: ts * 2,
        sprite: node.sprite,           // triggers glow outline path in ProximityHighlight
      }
    }

    this.proximity.update(
      { trees: this._treeNodes, stones: this._stoneNodes, plots: this._plotNodes, buildings: this._buildingNodeMap, npcs: this._npcNodes, animals: animalProxyNodes },
      this.proximityHighlight,
    )

    this._updateAnimalIcons()

    // If a building modal is open and the player walks out of range, close it.
    if (this._activeBuilding && !this._isBuildingInRange(this._activeBuilding)) {
      this._dispatchUiEvent(`phaser-${this._activeBuilding.type}-close`, {})
      this._activeBuilding = null
    }

    // Track whether the player is adjacent to a fishing tile and fire enter/exit
    // events so the React cooldown bar only shows near the water.
    this._updateFishingZoneProximity()

    // If an NPC modal is open and the player walks out of range, close it.
    // The NPC event is e.g. 'phaser-barn-open' — derive close as 'phaser-barn-close'.
    if (this._activeNpc && !this.proximity.isNodeInRange(this._activeNpc)) {
      const closeEvent = this._activeNpc.event.replace(/-open$/, '-close')
      this._dispatchUiEvent(closeEvent, {})
      this._activeNpc = null
    }

    // Write the mobile action hint every frame so the React MobileActionButton
    // can poll it and show the correct context icon without any event race.
    this._writeMobileActionHint()

  }

  /**
   * Compute what action the nearest in-range node would trigger and expose it
   * on window.__mobileActionHint so MobileActionButton.tsx can poll it.
   *
   * Shape:
   *   null                           — nothing in range / node is depleted
   *   { type: 'chop',    icon: '...' }
   *   { type: 'mine',    icon: '...' }
   *   { type: 'plant',   icon: '...', crop: 'potato' }
   *   { type: 'harvest', icon: '...', crop: 'potato' }
   *   { type: 'fish',    icon: '...' }
   *   { type: 'feed',    icon: '...', animal: 'chicken' }
   *   { type: 'collect', icon: '...', animal: 'chicken' }
   */
  _writeMobileActionHint() {
    const gs        = window.__gameStore?.getState?.()?.state
    const TS        = GAME_CONFIG.TILE_SIZE

    // ── 1. Resource nodes (trees → chop, stones → mine) ──────────────────
    for (const node of Object.values(this._treeNodes ?? {})) {
      if (node?.isDepleted) continue
      if (this.proximity.isNodeInRange(node)) {
        window.__mobileActionHint = { type: 'chop', icon: '/assets/tools/axe.png' }
        return
      }
    }
    for (const node of Object.values(this._stoneNodes ?? {})) {
      if (node?.isDepleted) continue
      if (this.proximity.isNodeInRange(node)) {
        const icon = node.type === 'gold' || node.type === 'iron'
          ? '/assets/tools/iron_pickaxe.png'
          : '/assets/tools/stone_pickaxe.png'
        window.__mobileActionHint = { type: 'mine', icon }
        return
      }
    }

    // ── 2. Plot nodes — determine plant vs harvest ────────────────────────
    for (const node of Object.values(this._plotNodes ?? {})) {
      if (!this.proximity.isNodeInRange(node)) continue

      // Skip locked plots
      const farmingXP  = gs?.skills?.farming ?? 0
      let playerLevel = 1; let acc = 0
      while (playerLevel < 100) { const n = Math.floor(100 * (playerLevel ** 1.6)); acc += n; if (acc > farmingXP) break; playerLevel++ }
      if ((node.requiredLevel ?? 0) > playerLevel) continue

      const field    = gs?.fields?.[node.fieldIndex]
      const cropName = field?.name?.toLowerCase() ?? 'potato'
      const harvestMs = field ? (this._cropHarvestMs?.[cropName] ?? 60000) : 60000
      const isReady  = field && (Date.now() - field.plantedAt) >= harvestMs

      if (isReady) {
        window.__mobileActionHint = {
          type: 'harvest',
          icon: `/assets/crops/${cropName}/crop.png`,
          crop: cropName,
        }
        return
      } else if (!field) {
        // Empty plot — plant. Use the selected seed if available, default potato.
        const selectedSeed = gs?.inventory?.['Potato Seed'] > 0 ? 'potato' : null
        const plantCrop    = selectedSeed ?? 'potato'
        window.__mobileActionHint = {
          type: 'plant',
          icon: `/assets/crops/${plantCrop}/seed.png`,
          crop: plantCrop,
        }
        return
      } else {
        // Growing — show the crop seedling; action will do nothing meaningful but hint is valid
        window.__mobileActionHint = {
          type: 'plant',
          icon: `/assets/crops/${cropName}/seedling.png`,
          crop: cropName,
        }
        return
      }
    }

    // ── 3. Animals ─────────────────────────────────────────────────────────
    const PRODUCE_MS = { chicken: 60_000, cow: 90_000, sheep: 120_000 }
    const RE_HUNGER  = { chicken: 4 * 60 * 60 * 1000, cow: 6 * 60 * 60 * 1000, sheep: 6 * 60 * 60 * 1000 }
    const STATE_KEY  = { chicken: 'chickens', cow: 'cows', sheep: 'sheep' }
    const FEED_ICON  = { chicken: '/assets/crops/wheat/seed.png', cow: '/assets/crops/kale/seed.png', sheep: '/assets/crops/cabbage/seed.png' }
    const PROD_ICON  = { chicken: '/assets/resources/egg.png', cow: '/assets/resources/milk.png', sheep: '/assets/resources/wool.png' }

    for (const [, node] of Object.entries(this._animalNodes ?? {})) {
      if (!node?.sprite?.active) continue
      const playerTileX = Math.floor(this.player.sprite.x / TS)
      const playerTileY = Math.floor(this.player.sprite.y / TS)
      const animalTileX = Math.floor(node.sprite.x / TS)
      const animalTileY = Math.floor(node.sprite.y / TS)
      const dist = Math.max(Math.abs(playerTileX - animalTileX), Math.abs(playerTileY - animalTileY))
      if (dist > 2) continue

      const speedFactor = Math.max(0, 1 - (gs?.bonus?.produceSpeed ?? 0))
      const record      = gs?.[STATE_KEY[node.type]]?.[node.index]
      const fedAt       = record?.fedAt ?? 0
      const elapsed     = fedAt ? Date.now() - fedAt : Infinity
      const produceTime = PRODUCE_MS[node.type] * speedFactor
      const reHunger    = RE_HUNGER[node.type]
      const isReady     = fedAt && elapsed >= produceTime && elapsed < produceTime + reHunger
      const isHungry    = !fedAt || elapsed >= produceTime + reHunger

      if (isReady) {
        window.__mobileActionHint = { type: 'collect', icon: PROD_ICON[node.type], animal: node.type }
        return
      } else if (isHungry) {
        window.__mobileActionHint = { type: 'feed', icon: FEED_ICON[node.type], animal: node.type }
        return
      }
    }

    // ── 4. Fishing zone ────────────────────────────────────────────────────
    if (this._nearFishingZone) {
      window.__mobileActionHint = { type: 'fish', icon: '/assets/tools/fishing_rod.png' }
      return
    }

    // Nothing in range
    window.__mobileActionHint = null
  }

  // ─── Pointer-move tooltip (depleted nodes + growing crops) ──────────────
  //
  // Writes to window.__nodeTooltip every pointermove so React's NodeTooltip
  // (which polls at 200 ms) always has current data without any timing races.

  _setupPointerMoveTooltip() {
    const recoveryMap = { tree: 7200, stone: 3600, iron: 3600, gold: 3600 }

    this._onPointerMove = (pointer) => {
      const cam    = this.cameras.main
      const zoom   = cam.zoom
      const wp     = cam.getWorldPoint(pointer.x, pointer.y)
      const worldX = wp.x
      const worldY = wp.y
      const ts     = GAME_CONFIG.TILE_SIZE

      // cam.worldView.x/y is the top-left world coordinate visible in the
      // viewport — the only correct base for world→screen conversion.
      const toScreen = (wx, wy) => ({
        screenX: Math.round((wx - cam.worldView.x) * zoom + (cam.x ?? 0)),
        screenY: Math.round((wy - cam.worldView.y) * zoom + (cam.y ?? 0)),
      })

      // Tooltip proximity range — tooltips are only shown when the player is
      // within this world-distance of the hovered node, encouraging movement.
      const TOOLTIP_RANGE = ts * 4

      const playerX = this.player.sprite.x
      const playerY = this.player.sprite.y

      // ── 1. Depleted resource nodes (tree / stone / iron / gold) ───────────
      const allResourceNodes = [
        ...Object.values(this._treeNodes),
        ...Object.values(this._stoneNodes),
      ]
      const depletedNode = allResourceNodes.find((n) => {
        if (!n || !n.isDepleted) return false
        const w = n.width  ?? ts
        const h = n.height ?? ts
        const cx = n.x + w / 2
        const cy = n.y + h / 2
        if (Math.abs(playerX - cx) > TOOLTIP_RANGE || Math.abs(playerY - cy) > TOOLTIP_RANGE) return false
        // Extra padding so the hitbox is a little forgiving at high zoom
        return worldX >= n.x - 4 && worldX < n.x + w + 4 &&
               worldY >= n.y - 4 && worldY < n.y + h + 4
      }) ?? null

      if (depletedNode) {
        const gameState = window.__gameStore?.getState?.()?.state
        const nodeNum   = parseInt((depletedNode.nodeId ?? '').replace(/\D/g, ''), 10) - 1
        let choppedAt   = 0
        if (gameState && !isNaN(nodeNum)) {
          if (depletedNode.type === 'tree') {
            choppedAt = gameState.trees?.[nodeNum]?.choppedAt ?? 0
          } else if (depletedNode.type === 'iron') {
            choppedAt = gameState.iron?.[nodeNum]?.minedAt ?? 0
          } else if (depletedNode.type === 'gold') {
            choppedAt = gameState.gold?.[nodeNum]?.minedAt ?? 0
          } else {
            choppedAt = gameState.stones?.[nodeNum]?.minedAt ?? 0
          }
        }
        // Fall back to the in-session depletion timestamp if store has no record
        if (!choppedAt && depletedNode.depletedAt) choppedAt = depletedNode.depletedAt

        const { screenX, screenY } = toScreen(
          depletedNode.x + depletedNode.width / 2,
          depletedNode.y,
        )
        window.__nodeTooltip = {
          kind: 'depleted',
          nodeType: depletedNode.type,
          choppedAt,
          recoverySecs: recoveryMap[depletedNode.type] ?? 3600,
          screenX,
          screenY,
        }
        return
      }

      // ── 2. Growing crop plot ───────────────────────────────────────────────
      const allPlots   = Object.values(this._plotNodes)
      const hoveredPlot = allPlots.find((n) => {
        if (!n) return false
        const w = (n.width  ?? ts) + 8
        const h = (n.height ?? ts) + 8
        const cx = n.x + w / 2
        const cy = n.y + h / 2
        if (Math.abs(playerX - cx) > TOOLTIP_RANGE || Math.abs(playerY - cy) > TOOLTIP_RANGE) return false
        return worldX >= n.x - 4 && worldX < n.x + w &&
               worldY >= n.y - 4 && worldY < n.y + h
      }) ?? null

      if (hoveredPlot) {
        const gameState = window.__gameStore?.getState?.()?.state
        const field     = gameState?.fields?.[hoveredPlot.fieldIndex]
        if (field) {
          const cropName  = field.name?.toLowerCase()
          const harvestMs = cropName ? (this._cropHarvestMs[cropName] ?? 60000) : 60000
          const elapsed   = Date.now() - field.plantedAt
          const isReady   = elapsed >= harvestMs
          if (!isReady) {
            const { screenX, screenY } = toScreen(
              hoveredPlot.x + (hoveredPlot.width ?? ts) / 2,
              hoveredPlot.y,
            )
            window.__nodeTooltip = {
              kind: 'growing',
              cropName: field.name,
              plantedAt: field.plantedAt,
              harvestMs,
              screenX,
              screenY,
            }
            return
          }
        }
      }

      // ── 3. Animal — show produce-ready countdown ───────────────────────────
      const PRODUCE_MS = { chicken: 60_000, cow: 90_000, sheep: 120_000 }
      const RE_HUNGER  = { chicken: 4 * 60 * 60 * 1000, cow: 6 * 60 * 60 * 1000, sheep: 6 * 60 * 60 * 1000 }
      const PRODUCE_LABEL = { chicken: 'Egg', cow: 'Milk', sheep: 'Wool' }
      const STATE_KEY     = { chicken: 'chickens', cow: 'cows', sheep: 'sheep' }
      const PRODUCE_ICON  = { chicken: 'assets/resources/egg.png', cow: 'assets/resources/milk.png', sheep: 'assets/resources/wool.png' }

      // Only consider animals within the shared TOOLTIP_RANGE of the player.
      const hoveredAnimal = Object.values(this._animalNodes ?? {}).find((n) => {
        if (!n?.sprite?.active) return false
        const half = ts  // sprite display is 2×ts, half = ts
        if (Math.abs(playerX - n.sprite.x) > TOOLTIP_RANGE ||
            Math.abs(playerY - n.sprite.y) > TOOLTIP_RANGE) return false
        return worldX >= n.sprite.x - half && worldX < n.sprite.x + half &&
               worldY >= n.sprite.y - half && worldY < n.sprite.y + half
      }) ?? null

      if (hoveredAnimal) {
        const gs          = window.__gameStore?.getState?.()?.state
        const produceSpeed = gs?.bonus?.produceSpeed ?? 0
        const speedFactor  = Math.max(0, 1 - produceSpeed)
        const record       = gs?.[STATE_KEY[hoveredAnimal.type]]?.[hoveredAnimal.index]
        const fedAt        = record?.fedAt ?? 0
        const now          = Date.now()
        const elapsed      = fedAt ? now - fedAt : Infinity
        const produceMs    = PRODUCE_MS[hoveredAnimal.type] * speedFactor
        const reHunger     = RE_HUNGER[hoveredAnimal.type]
        const isHungry     = !fedAt || elapsed >= produceMs + reHunger
        const isReady      = fedAt && elapsed >= produceMs && elapsed < produceMs + reHunger

        // Only show the proximity tooltip while the animal is actively producing
        // (counting down). Hungry and ready states already have dedicated icons,
        // so no tooltip is needed for those states.
        if (isHungry || isReady) {
          window.__nodeTooltip = null
          return
        }

        const { screenX, screenY } = toScreen(hoveredAnimal.sprite.x, hoveredAnimal.sprite.y)
        window.__nodeTooltip = {
          kind:        'animal',
          animalType:  hoveredAnimal.type,
          produceName: PRODUCE_LABEL[hoveredAnimal.type],
          produceIcon: PRODUCE_ICON[hoveredAnimal.type],
          fedAt,
          produceMs,
          screenX,
          screenY,
        }
        return
      }

      // ── Nothing hovered — clear ────────────────────────────────────────────
      window.__nodeTooltip = null
    }

    this.input.on('pointermove', this._onPointerMove)
  }

  // ─── Private — world setup ────────────��������───────────────────────���──────────

  /**
   * Create all 12 tile layers from island.json in render order (bottom → top).
   * Layer names must match exactly what is in island.json.
   */
  _buildLayers(map, tileset) {
    // Ground / terrain
    this._layerWater    = map.createLayer('water',    tileset, 0, 0)?.setDepth(0)
    this._layerSand     = map.createLayer('sand',     tileset, 0, 0)?.setDepth(1)
    this._layerLand     = map.createLayer('land',     tileset, 0, 0)?.setDepth(2)
    this._layerMountain = map.createLayer('mountain', tileset, 0, 0)?.setDepth(3)
    this._layerPath     = map.createLayer('path',     tileset, 0, 0)?.setDepth(4)

    // Structures / farming
    this._layerPlots    = map.createLayer('plots',    tileset, 0, 0)?.setDepth(5)
    this._layerBridge   = map.createLayer('bridge',   tileset, 0, 0)?.setDepth(6)
    this._layerFence    = map.createLayer('fence',    tileset, 0, 0)?.setDepth(7)
    this._layerLadder   = map.createLayer('ladder',   tileset, 0, 0)?.setDepth(8)
    this._layerBarn     = map.createLayer('barn',     tileset, 0, 0)?.setDepth(9)

    // Decoration (top)
    this._layerDecor2   = map.createLayer('decor2',   tileset, 0, 0)?.setDepth(10)
    this._layerDecor    = map.createLayer('decor',    tileset, 0, 0)?.setDepth(11)
  }

  /**
   * Draw soil and lock sprites for every plot node, mirroring what
   * Soil.tsx and Field.tsx do in the /game page.
   *
   * - Empty plot  → soil2.png  (key: 'plot_soil')
   * - Locked plot → soil2.png  + lock.png overlay (key: 'plot_lock')
   *
   * The player state (fields + skills) is read from the game registry
   * so we know which plots are planted/locked at scene start.
   */
  _spawnPlotSprites() {
    const TS     = GAME_CONFIG.TILE_SIZE
    const fields     = this.playerState?.fields            ?? {}
    const farmingXP  = this.playerState?.skills?.farming   ?? 0

    // Derive farming skill level from XP (mirrors getSkillLevel in lib/skills.ts)
    let playerLevel = 1
    let xpAccum = 0
    while (playerLevel < 100) {
      const needed = Math.floor(100 * (playerLevel ** 1.6))
      xpAccum += needed
      if (xpAccum > farmingXP) break
      playerLevel++
    }

    // Level requirements mirror FIELD_LEVEL_REQUIREMENTS in experience.ts
    const LEVEL_REQ = [
      0, 0, 0, 0, 0, 0,       // 0-5
      3, 3, 3,                 // 6-8
      5, 5, 5,                 // 9-11
      7, 7, 7,                 // 12-14
      10, 10, 10,              // 15-17
      13, 13, 13,              // 18-20
      16, 16, 16,              // 21-23
      20, 20, 20,              // 24-26
      25, 25, 25,              // 27-29
    ]

    for (const node of Object.values(this._plotNodes)) {
      const cx       = node.x + TS / 2
      const cy       = node.y + TS / 2
      const fi       = node.fieldIndex ?? 0
      const reqLevel = LEVEL_REQ[fi] ?? 0
      const locked   = playerLevel < reqLevel

      // Soil sprite — mirrors <Soil className="absolute bottom-0"> in Field.tsx.
      // soil2.png is 16×26 px naturally; it is bottom-anchored to the tile cell
      // so it overflows upward, just like `absolute bottom-0` in the /game page.
      // setOrigin(0.5, 1) places the sprite's bottom edge at node.y + TS.
      const SOIL_W = TS
      const SOIL_H = TS * (26 / 16) // ≈ TS * 1.625
      const soilY  = node.y + TS    // bottom of the tile cell
      const soil = this.add.image(cx, soilY, 'plot_soil')
      soil.setOrigin(0.5, 1)
      soil.setDisplaySize(SOIL_W, SOIL_H)
      soil.setDepth(12)
      node.sprite = soil

      // Lock overlay — centered on the tile cell (not the soil image)
      if (locked) {
        const lockIcon = this.add.image(cx, cy, 'plot_lock')
        lockIcon.setDisplaySize(TS * 0.5, TS * 0.5)
        lockIcon.setDepth(14)
        lockIcon.setAlpha(0.85)
        node.lockIcon = lockIcon
      }
    }
  }

  /**
   * Play the doing (dig/sow) animation when the player interacts with a plot.
   * The player faces toward the plot centre before the animation plays, then
   * returns to idle once the 8-frame doing animation completes.
   * After the animation finishes, fires a 'phaser-plot-plant' window event so
   * the React layer can dispatch the item.planted game action.
   * Uses a dedicated _doingLock separate from _strikeLock.
   *
   * The _doingLock is NOT released until after the final crop-refresh delayedCall
   * completes (450 ms), so a rapid second click on any plot is fully blocked
   * until the React store has processed the previous action.
   */
  _doingActionOnPlot(node) {
    if (this._doingLock) return
    this._doingLock = true

    const sprite = this.player?.sprite
    if (!sprite) { this._doingLock = false; return }

    const TS          = GAME_CONFIG.TILE_SIZE
    const plotCentreX = node.x + TS / 2
    const facingLeft  = sprite.x > plotCentreX
    sprite.setFlipX(facingLeft)
    if (this.player) this.player.facing = facingLeft ? 'left' : 'right'

    // Stop any current animation before playing doing
    sprite.stop()
    sprite.play('player_doing', true)

    // Convert plot world position to screen coordinates for the React popover.
    const _screenPt = () => {
      const cam  = this.cameras.main
      const zoom = cam.zoom
      const cx   = node.x + TS / 2
      const cy   = node.y
      return {
        screenX: Math.round((cx - cam.worldView.x) * zoom + (cam.x ?? 0)),
        screenY: Math.round((cy - cam.worldView.y) * zoom + (cam.y ?? 0)),
      }
    }

    // Tracks whether the anim-complete handler already ran, so the safety
    // timeout and the real event can never both execute the action.
    let handled = false

    const onAnimComplete = (anim) => {
      // Guard: only fire for the doing animation, not any other one-shot anim
      // that might complete while this handler is briefly registered.
      if (anim?.key && anim.key !== 'player_doing') return
      if (handled) return
      handled = true

      sprite.off('animationcomplete', onAnimComplete)
      if (safetyTimer) { safetyTimer.remove(false); safetyTimer = null }

      sprite.play('player_idle', true)

      // Determine action: harvest if field is ready, otherwise plant.
      // Read live state directly from the store — never use a closure snapshot.
      const fields    = window.__gameStore?.getState?.()?.state?.fields ?? {}
      const field     = fields[node.fieldIndex]
      const cropName  = field?.name?.toLowerCase()
      const harvestMs = cropName ? (this._cropHarvestMs[cropName] ?? 60000) : 60000
      const isReady   = field && (Date.now() - field.plantedAt) >= harvestMs

      if (isReady) {
        // Harvest the ready crop — include screen position for floating popover
        const harvestAmount = field.amount ?? 1
        this._dispatchUiEvent('phaser-plot-harvest', { fieldIndex: node.fieldIndex, amount: harvestAmount, ..._screenPt() })
        window.__sfx?.harvestAudio?.play()
      } else if (!field) {
        // Plant a Potato Seed on the empty field — include screen position
        this._dispatchUiEvent('phaser-plot-plant', { fieldIndex: node.fieldIndex, item: 'Potato Seed', ..._screenPt() })
        window.__sfx?.plantAudio?.play()
      }

      // Refresh crop sprite after React state updates.
      // Release _doingLock only after the final refresh so no second click can
      // sneak in before the store has settled (100 ms = first try, 450 ms = release).
      this.time.delayedCall(100, () => this._updatePlotCrop(node))
      this.time.delayedCall(450, () => {
        this._updatePlotCrop(node)
        this._doingLock = false
      })
    }

    sprite.on('animationcomplete', onAnimComplete)

    // Safety fallback: if animationcomplete never fires (e.g. texture missing,
    // animation interrupted by scene restart) release the lock after 2 s so
    // the player is never stuck unable to interact with plots.
    let safetyTimer = this.time.delayedCall(2000, () => {
      if (handled) return
      handled = true
      sprite.off('animationcomplete', onAnimComplete)
      sprite.play('player_idle', true)
      this._doingLock = false
    })
  }

  /**
   * Update (or create) the crop image sprite on a plot based on the current
   * field state from the Zustand store.  Mirrors Soil.tsx logic:
   *   - No field entry  → destroy any existing crop sprite (empty soil)
   *   - timeLeft > 0 && < 50% elapsed → seedling stage
   *   - timeLeft > 0 && >= 50% elapsed → almost stage
   *   - timeLeft <= 0  → ready stage
   *
   * Crop images are 16×26 px (same as soil2.png), bottom-anchored on the tile,
   * so they use origin(0.5, 1) at soilY = node.y + TS — exactly matching the
   * <Soil className="absolute bottom-0"> placement in Field.tsx.
   */
  _updatePlotCrop(node) {
    const TS   = GAME_CONFIG.TILE_SIZE
    const cx   = node.x + TS / 2
    const soilY = node.y + TS          // bottom of the 16×16 tile cell

    // Read live state from the Zustand store exposed on window by PhaserCanvas
    const fields = window.__gameStore?.getState?.()?.state?.fields ?? {}
    const field  = fields[node.fieldIndex]

    if (!field) {
      // Empty ��� remove any existing crop sprite
      if (node.cropSprite) { node.cropSprite.destroy(); node.cropSprite = null }
      return
    }

    // Determine which stage to show (mirrors Soil.tsx)
    const cropName     = field.name.toLowerCase()            // e.g. 'potato'
    const harvestMs    = this._cropHarvestMs[cropName] ?? 60000
    const now          = Date.now()
    const elapsed      = now - field.plantedAt
    const timeLeft     = harvestMs - elapsed
    const percentage   = (elapsed / harvestMs) * 100

    let stage
    if (timeLeft <= 0) {
      stage = 'ready'
    } else if (percentage >= 50) {
      stage = 'almost'
    } else {
      stage = 'seedling'
    }

    // Resolve texture key with stage fallback chain so a missing asset never
    // silently suppresses the crop sprite entirely.
    // Fallback order: ready → almost → seedling  (each stage can stand in for a later one)
    const STAGE_FALLBACK = ['ready', 'almost', 'seedling']
    let textureKey = `crop_${cropName}_${stage}`
    if (!this.textures.exists(textureKey)) {
      const fallback = STAGE_FALLBACK.find((s) => this.textures.exists(`crop_${cropName}_${s}`))
      if (!fallback) return   // no texture at all for this crop — skip
      textureKey = `crop_${cropName}_${fallback}`
    }

    const CROP_W = TS
    const CROP_H = TS * (26 / 16)   // 16×26 px native, bottom-anchored

    if (!node.cropSprite) {
      // Create a new crop sprite bottom-anchored on the soil
      node.cropSprite = this.add.image(cx, soilY, textureKey)
      node.cropSprite.setOrigin(0.5, 1)
      node.cropSprite.setDisplaySize(CROP_W, CROP_H)
      node.cropSprite.setDepth(13)  // above soil (12) and all tilemap layers (max 11), below lock (14)
    } else if (node.cropSprite.texture.key !== textureKey) {
      // Stage changed — swap texture
      node.cropSprite.setTexture(textureKey)
      node.cropSprite.setDisplaySize(CROP_W, CROP_H)
    }
  }

  /**
   * Harvest-seconds for each crop, matching CROPS() in crops.ts.
   * Used by _updatePlotCrop to determine the grow stage without importing TS.
   */
  get _cropHarvestMs() {
    return {
      potato:      60 * 1000,
      pumpkin:     5  * 60 * 1000,
      carrot:      10 * 60 * 1000,
      cabbage:     30 * 60 * 1000,
      beetroot:    60 * 60 * 1000,
      cauliflower: 2  * 60 * 60 * 1000,
      parsnip:     3  * 60 * 60 * 1000,
      radish:      6  * 60 * 60 * 1000,
      wheat:       12 * 60 * 60 * 1000,
      kale:        24 * 60 * 60 * 1000,
      sunflower:   24 * 60 * 60 * 1000,
    }
  }

  /**
   * Poll all plots every 5 s to keep crop stages up to date (seedling → almost → ready).
   * Also runs an initial pass immediately.
   */
  _startCropTimer() {
    // Initial render pass
    for (const node of Object.values(this._plotNodes)) this._updatePlotCrop(node)
    // Re-check every 5 seconds
    this._cropTimerEvent = this.time.addEvent({
      delay:    5000,
      loop:     true,
      callback: () => {
        for (const node of Object.values(this._plotNodes)) this._updatePlotCrop(node)
      },
    })
  }

  /**
   * Register Phaser animations for resource node drop effects.
   * All node types (stone, iron, gold, tree) have a 7-frame 91×66 spritesheet
   * that plays once when the node is depleted.
   */
  _createResourceAnimations() {
    const dropTypes = ['stone', 'iron', 'gold', 'tree']
    for (const type of dropTypes) {
      const key = `anim_drop_${type}`
      if (!this.anims.exists(key) && this.textures.exists(`drop_${type}`)) {
        this.anims.create({
          key,
          frames:     this.anims.generateFrameNumbers(`drop_${type}`, { start: 0, end: 6 }),
          frameRate:  12,
          repeat:     0,
        })
      }
    }
  }

  /**
   * Spawn static sprites for every tree and stone/iron/gold node,
   * mirroring the RecoveredTree / RecoveredStone visuals from the /game page.
   *
   * Each node gets:
   *   node.sprite      — static rock/tree image (hidden while animation plays)
   *   node.animSprite  — animation sprite (hidden while static image shows)
   *   node.hitCount    — number of times the node has been struck this session
   *   node.isDepleted  — true once hitCount reaches HITS_TO_DEPLETE
   *   node.type        — 'tree' | 'stone' | 'iron' | 'gold'
   */
  _spawnResourceSprites() {
    const TS = GAME_CONFIG.TILE_SIZE  // 16 world px

    // Node images are 32×32 px.  ZOOM = 4, tiles are 16×16 world px.
    // Display at 1× native (32 world px) so each node fills its 2×2 tile footprint
    // perfectly (2 tiles × 16 px = 32 world px).
    const ROCK_W    = 32   // world px — matches native 32×32 image at 1× scale
    const ROCK_H    = 32

    // Progress bar native size: 15×7 px — display at 1× native (world px = source px).
    const OVERLAY_W = 15
    const OVERLAY_H = 7

    // --- Trees ---
    // Same visual model as stone/iron/gold: single 32×32 node image,
    // progress overlay below on hits 1-2, texture swapped to tree_empty when depleted.
    for (const node of Object.values(this._treeNodes)) {
      node.type       = 'tree'
      node.hitCount   = 0
      node.isDepleted = false

      // Center of the 2×2 node footprint
      const cx = node.x + TS
      const cy = node.y + TS

      const tree = this.textures.exists('tree_node')
        ? this.add.image(cx, cy, 'tree_node')
        : this.add.rectangle(cx, cy, ROCK_W, ROCK_H, 0x228b22)
      if (tree.setDisplaySize) tree.setDisplaySize(ROCK_W, ROCK_H)
      tree.setOrigin(0.5, 0.5)
      tree.setDepth(14)
      node.sprite = tree

      // Progress overlay below the tree image
      const overlayY = cy + Math.round(ROCK_H / 2) + Math.round(OVERLAY_H / 2) + 2
      const overlay  = this.add.image(cx, overlayY, 'progress_quarter')
      overlay.setDisplaySize(OVERLAY_W, OVERLAY_H)
      overlay.setOrigin(0.5, 0.5)
      overlay.setDepth(15)
      overlay.setVisible(false)
      node.progressOverlay = overlay
    }

    // --- Stone / Iron / Gold ---
    // Visual model (no animations):
    //   Intact  → {type}_rock texture
    //   Hit 1   → rock stays + progress_quarter overlay
    //   Hit 2   → rock stays + progress_almost overlay
    //   Hit 3   → texture swapped to {type}_empty, progress overlay hidden
    for (const node of Object.values(this._stoneNodes)) {
      const idStr  = String(node.nodeId ?? '')
      const type   = idStr.startsWith('gold') ? 'gold'
                   : idStr.startsWith('iron') ? 'iron'
                   : 'stone'
      const rockKey = `${type}_rock`

      node.type       = type
      node.hitCount   = 0
      node.isDepleted = false

      // Center of the 2×2 node footprint
      const cx = node.x + TS
      const cy = node.y + TS

      // Rock static image — sized to ROCK_W × ROCK_H
      const rock = this.textures.exists(rockKey)
        ? this.add.image(cx, cy, rockKey)
        : this.add.rectangle(cx, cy, ROCK_W, ROCK_H, 0x888888)
      if (rock.setDisplaySize) rock.setDisplaySize(ROCK_W, ROCK_H)
      rock.setOrigin(0.5, 0.5)
      rock.setDepth(14)
      node.sprite = rock

      // Progress overlay — hidden by default, shown on hits 1 and 2.
      // Position: centered horizontally, flush below the rock's bottom edge + 2 px gap.
      const overlayY = cy + Math.round(ROCK_H / 2) + Math.round(OVERLAY_H / 2) + 2
      const overlay  = this.add.image(cx, overlayY, 'progress_quarter')
      overlay.setDisplaySize(OVERLAY_W, OVERLAY_H)
      overlay.setOrigin(0.5, 0.5)
      overlay.setDepth(15)
      overlay.setVisible(false)
      node.progressOverlay = overlay
    }
  }

  /**
   * On scene load, read the persisted store state and mark any node that was
   * chopped/mined but has NOT yet recovered as isDepleted=true + show the
   * empty texture so the visual matches the stored state.
   */
  _restoreDepletedNodes() {
    const gameState = window.__gameStore?.getState?.()?.state
    if (!gameState) return

    const recoveryMap = { tree: 7200, stone: 3600, iron: 3600, gold: 3600 }
    const now = Date.now()

    // choppedAt / minedAt are stored as Date.now() (milliseconds).
    // recoverySecs is in seconds, so recovery deadline = timestamp + recoverySecs * 1000.
    const markDepleted = (node, timestamp) => {
      if (!node) return
      node.isDepleted  = true
      node.depletedAt  = timestamp  // so the tooltip can compute timeLeft
      node.hitCount    = 3
      const emptyKey   = `${node.type}_empty`
      if (node.sprite && this.textures.exists(emptyKey)) {
        node.sprite.setTexture(emptyKey)
      }
      if (node.progressOverlay) node.progressOverlay.setVisible(false)
    }

    // Trees
    Object.values(this._treeNodes).forEach((node) => {
      const nodeNum = parseInt((node.nodeId ?? '').replace(/\D/g, ''), 10) - 1
      if (isNaN(nodeNum)) return
      const choppedAt    = gameState.trees?.[nodeNum]?.choppedAt ?? 0
      const recoverySecs = recoveryMap.tree
      if (choppedAt > 0 && now < choppedAt + recoverySecs * 1000) {
        markDepleted(node, choppedAt)
      }
    })

    // Stones, iron, gold
    Object.values(this._stoneNodes).forEach((node) => {
      const nodeNum = parseInt((node.nodeId ?? '').replace(/\D/g, ''), 10) - 1
      if (isNaN(nodeNum)) return
      const type       = node.type ?? 'stone'
      const storeKey   = type === 'iron' ? 'iron' : type === 'gold' ? 'gold' : 'stones'
      const minedAt    = gameState[storeKey]?.[nodeNum]?.minedAt ?? 0
      const recoverySecs = recoveryMap[type] ?? 3600
      if (minedAt > 0 && now < minedAt + recoverySecs * 1000) {
        markDepleted(node, minedAt)
      }
    })
  }

  /**
   * Handle a hit on a resource node (called from the pointer-down handler).
   *
   * Player animation:
   *   stone / iron / gold → play player_mine (spr_mining_strip9, 9 frames, repeat:0)
   *   tree                → play player_axe  (spr_axe_strip10, 10 frames, repeat:0)
   *   On complete → resume player_idle.
   *
   * Node visual model (all types):
   *   Hit 1 → show progress_quarter overlay below node
   *   Hit 2 → swap overlay to progress_almost
   *   Hit 3 → hide overlay, swap node texture to {type}_empty
   */
  _strikeResourceNode(node) {
    if (!node || node.isDepleted) return

    // Enforce strict one-click-at-a-time: ignore any click that arrives while
    // the player strike animation is still playing.
    if (this._strikeLock) return
    this._strikeLock = true

    const HITS_TO_DEPLETE = 3
    node.hitCount = (node.hitCount ?? 0) + 1

    const hitCount  = node.hitCount
    const depleting = hitCount >= HITS_TO_DEPLETE
    const overlay   = node.progressOverlay

    // ── Player action animation ────────────────────────────────────────────
    const isTree    = node.type === 'tree'
    const actionKey = isTree ? 'player_axe' : 'player_mine'
    const sprite    = this.player?.sprite

    // Force the player to face the node before playing the action animation.
    // Compare player centre X against node centre X to determine the correct direction.
    const nodeCentreX      = node.x + GAME_CONFIG.TILE_SIZE
    const playerX          = sprite?.x ?? nodeCentreX
    const requiredFacingLeft = playerX > nodeCentreX
    if (sprite) sprite.setFlipX(requiredFacingLeft)
    if (this.player) this.player.facing = requiredFacingLeft ? 'left' : 'right'

    const _applyNodeVisual = () => {
      // ── Node visual state — applied after the animation finishes ──────────
      if (depleting) {
        node.isDepleted  = true
        node.depletedAt  = Date.now()   // used by tooltip when store timestamp is absent
        if (overlay) overlay.setVisible(false)
        this._showDepletedSprite(node)
        // Reuse the facing direction already locked in at strike time
        this._playDropAnimation(node, requiredFacingLeft ? 'left' : 'right')

        // ── Resource drop floater ──────────────────────────────────────────
        // Read the drop amount straight from the store (already updated by
        // the React CropEventBridge before this animation completes).
        const gs       = window.__gameStore?.getState?.()?.state
        const nodeNum  = parseInt((node.nodeId ?? '').replace(/\D/g, ''), 10) - 1
        let dropAmount = 1
        if (gs && !isNaN(nodeNum)) {
          if (node.type === 'tree')  dropAmount = gs.trees?.[nodeNum]?.wood?.toNumber?.() ?? 3
          if (node.type === 'stone') dropAmount = gs.stones?.[nodeNum]?.amount?.toNumber?.() ?? 2
          if (node.type === 'iron')  dropAmount = gs.iron?.[nodeNum]?.amount?.toNumber?.() ?? 2
          if (node.type === 'gold')  dropAmount = gs.gold?.[nodeNum]?.amount?.toNumber?.() ?? 1
        }
        const cam = this.cameras.main
        const zoom = cam.zoom
        const sx  = Math.round((node.x + GAME_CONFIG.TILE_SIZE / 2 - cam.worldView.x) * zoom + (cam.x ?? 0))
        const sy  = Math.round((node.y - cam.worldView.y) * zoom + (cam.y ?? 0))
        this._dispatchUiEvent('phaser-resource-drop', {
          nodeType: node.type,
          nodeId:   node.nodeId,
          amount:   dropAmount,
          screenX:  sx,
          screenY:  sy,
        })
      } else if (hitCount === 1) {
        if (overlay) {
          overlay.setTexture('progress_quarter')
          overlay.setVisible(true)
        }
      } else if (hitCount === 2) {
        if (overlay) {
          overlay.setTexture('progress_almost')
          overlay.setVisible(true)
        }
      }

      // ── Sound effects — play at the same moment the progress bar updates ──
      if (isTree) {
        this.sound.play(depleting ? 'sfx_tree_fall' : 'sfx_chop', { volume: 0.3 })
      } else {
        this.sound.play(depleting ? 'sfx_mining_fall' : 'sfx_mining', { volume: 0.5 })
      }
    }

    if (sprite && this.anims.exists(actionKey)) {
      sprite.play(actionKey, true)
      sprite.once('animationcomplete', () => {
        _applyNodeVisual()

        // Resume idle
        if (this.anims.exists('player_idle')) {
          sprite.play('player_idle', true)
        }

        // Release the lock only after the full animation completes
        this._strikeLock = false
      })
    } else {
      // Fallback: no animation available — apply visual state immediately
      _applyNodeVisual()
      this._strikeLock = false
    }
  }

  /**
   * Transition a node to its depleted visual state by swapping to the empty
   * texture for its type (stone_empty, iron_empty, gold_empty, tree_empty).
   * The sprite stays at full alpha — no opacity fade.
   */
  _showDepletedSprite(node) {
    if (!node.sprite) return
    const emptyKey = `${node.type}_empty`
    if (this.textures.exists(emptyKey)) {
      node.sprite.setTexture(emptyKey)
      node.sprite.setAlpha(1)
    }
  }

  /**
   * Spawn a one-shot drop animation sprite on the node when it depletes.
   * Each node type (stone, iron, gold, tree) has a 7-frame 91×66 spritesheet.
   *
   * Default (facing right): left edge of frame at node.x, origin(0, 0.5).
   * Facing left: sprite is flipped horizontally and anchored to the right edge
   * of the node (node.x + ROCK_W) with origin(1, 0.5) so chunks scatter left.
   */
  _playDropAnimation(node, facing = 'right') {
    const type    = node.type  // 'stone' | 'iron' | 'gold' | 'tree'
    const animKey = `anim_drop_${type}`

    if (!this.anims.exists(animKey)) return

    const TS     = GAME_CONFIG.TILE_SIZE    // 16 world px
    const ROCK_W = GAME_CONFIG.TILE_SIZE * 2 // 32 world px — node footprint width
    const facingLeft = facing === 'left'

    // Anchor: right edge of node when facing left, left edge when facing right
    const x  = facingLeft ? node.x + ROCK_W : node.x
    const cy = node.y + TS

    const dropSprite = this.add.sprite(x, cy, `drop_${type}`, 0)
    dropSprite.setScale(1)
    // Flip and re-anchor when facing left so chunks scatter in the correct direction
    dropSprite.setFlipX(facingLeft)
    dropSprite.setOrigin(facingLeft ? 1 : 0, 0.5)
    // Render above the node sprite (depth 14) and progress overlay (depth 15)
    dropSprite.setDepth(16)

    dropSprite.play(animKey)
    dropSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      dropSprite.destroy()
    })
  }

  /**
   * Draw a sprite for each building zone using the same assets as the
   * Town/House components in the /game page.
   * The sprite is anchored top-left of the zone so it aligns with the tile grid.
   * Also builds this._buildingNodeMap keyed by a stable string id so
   * ProximitySystem can include buildings in its range checks.
   */
  _spawnBuildingSprites() {
    const TS = GAME_CONFIG.TILE_SIZE

    // Map building type → loaded texture key
    const TEXTURE = {
      house:      'building_house',
      market:     'building_market',
      bazaar:     'building_market',      // Bazaar reuses market_building.png
      blacksmith: 'building_blacksmith',
      kitchen:    'building_kitchen',
      bank:       'building_bank',
      // barn is already drawn by the 'barn' tilemap layer — skip sprite
    }

    // Node map used by ProximitySystem every frame
    this._buildingNodeMap = {}

    for (const zone of this._buildingZones) {
      const textureKey = TEXTURE[zone.type]

      if (textureKey && this.textures.exists(textureKey)) {
        // Anchor at top-left of zone; setOrigin(0,0) then position at zone.x, zone.y
        const sprite = this.add.image(zone.x, zone.y, textureKey)
        sprite.setOrigin(0, 0)
        sprite.setDisplaySize(zone.width, zone.height)
        sprite.setDepth(12)  // above all tile layers (max depth 11)
        zone.sprite = sprite
      }

      // Give every zone a stable id for ProximitySystem tracking
      zone.id = `building_${zone.type}`

      // Register in the node map so ProximitySystem sees it each frame
      this._buildingNodeMap[zone.id] = zone
    }
  }

  /**
   * Create a StaticGroup of invisible physics bodies that cover each building
   * footprint so the player cannot walk through them.
   */
  _spawnBuildingColliders() {
    this._buildingColliders = this.physics.add.staticGroup()

    for (const zone of this._buildingZones) {
      // Invisible static body sized to the building's world-pixel footprint.
      // setOrigin(0,0) so the body's top-left aligns with zone.x/zone.y.
      const body = this.add.rectangle(
        zone.x + zone.width / 2,
        zone.y + zone.height / 2,
        zone.width,
        zone.height,
      )
      this.physics.add.existing(body, true)   // true = static body
      this._buildingColliders.add(body)
    }
  }

  /**
   * Place NPC sprites in the world from NPC_POSITIONS.
   * Each NPC is registered in this._npcNodes so ProximitySystem highlights it
   * and the pointer handler can detect proximity-gated clicks.
   */
  _spawnNpcSprites() {
    const TS = GAME_CONFIG.TILE_SIZE

    for (const def of NPC_POSITIONS) {
      const worldX = def.x * TS
      const worldY = def.y * TS
      const worldW = def.width  * TS
      const worldH = def.height * TS

      // Centre the sprite on the 2×2 tile footprint used for click/proximity detection.
      const spriteX = worldX + worldW / 2
      const spriteY = worldY + worldH / 2

      // Use the same spr_idle_strip9.png spritesheet as the player (loaded under
      // 'player_idle' by PlayerAssetLoader). Do NOT call setDisplaySize — the sprite
      // renders at its native 96×64 world-px frame, identical to the player character.
      const sprite = this.add.sprite(spriteX, spriteY, NPC_CONFIG.textureKey, 0)
      if (this.anims.exists(NPC_CONFIG.animKey)) sprite.play(NPC_CONFIG.animKey, true)

      sprite.setDepth(NPC_CONFIG.depth)
      sprite.setFlipX(def.facing === 'left')

      const node = {
        id:      def.id,
        texture: def.texture,
        event:   def.event,
        x:       worldX,
        y:       worldY,
        width:   worldW,
        height:  worldH,
        sprite,
      }

      this._npcNodes[def.id] = node
    }
  }

  /**
   * Register walk animations from the strip4 spritesheets then sync animals
   * from inventory. Re-syncs whenever the store changes so newly purchased
   * animals appear immediately.
   */
  _spawnAnimalSprites() {
    // Create walk animations (frameRate 6 feels natural for farm animals)
    const animDefs = [
      { key: 'walk_chicken', texture: 'animal_chicken', frameRate: 6 },
      { key: 'walk_sheep',   texture: 'animal_sheep',   frameRate: 5 },
      { key: 'walk_cow',     texture: 'animal_cow',     frameRate: 5 },
    ]
    animDefs.forEach(({ key, texture, frameRate }) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames:    this.anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
          frameRate,
          repeat:    -1,
        })
      }
    })

    this._syncAnimalSprites()

    // Re-sync whenever inventory changes (animal purchased)
    this._animalStoreUnsub = window.__gameStore?.subscribe?.(() => {
      this._syncAnimalSprites()
    })
  }

  _syncAnimalSprites() {
    const TS        = GAME_CONFIG.TILE_SIZE
    const gameState = window.__gameStore?.getState?.()?.state
    if (!gameState) return

    const ANIMAL_DEPTH = 18   // above barn floor, below player

    // Barn pen bounds in world pixels
    const PEN_BOUNDS = {
      chicken: { minX: 5 * TS, maxX: 17 * TS, minY: 33 * TS, maxY: 40 * TS },
      cow:     { minX: 5 * TS, maxX: 14 * TS, minY: 35 * TS, maxY: 42 * TS },
      sheep:   { minX: 10 * TS, maxX: 18 * TS, minY: 33 * TS, maxY: 40 * TS },
    }

    // Walk animation key per type
    const ANIM_KEY = { chicken: 'walk_chicken', cow: 'walk_cow', sheep: 'walk_sheep' }

    // World-px per second
    const WALK_SPEED_PX_S = { chicken: 16, cow: 10, sheep: 12 }
    const MIN_IDLE_MS     = 2000
    const MAX_IDLE_MS     = 6000

    const scheduleMove = (node) => {
      if (!node.sprite?.active) return
      const bounds = PEN_BOUNDS[node.type]
      const idleMs = MIN_IDLE_MS + Math.random() * (MAX_IDLE_MS - MIN_IDLE_MS)

      // Stop walking animation while idling
      node.sprite.anims.pause()

      node._timer = this.time.delayedCall(idleMs, () => {
        if (!node.sprite?.active) return

        const startX  = node.sprite.x
        const startY  = node.sprite.y
        const targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX)
        const targetY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY)

        const dist     = Math.hypot(targetX - startX, targetY - startY)
        const speed    = WALK_SPEED_PX_S[node.type] ?? 14
        const duration = Math.max(500, (dist / speed) * 1000)

        // Sprites default face LEFT, so only flip when moving RIGHT
        node.sprite.setFlipX(targetX > startX)

        // Resume walking animation
        node.sprite.anims.resume()

        this.tweens.add({
          targets:    node.sprite,
          x:          targetX,
          y:          targetY,
          duration,
          ease:       'Linear',
          onComplete: () => scheduleMove(node),
        })
      })
    }

    const syncGroup = (positions, type, inventoryKey, maxCount) => {
      const count = Math.min(Number(gameState.inventory?.[inventoryKey] ?? 0), maxCount)

      positions.forEach((_pos, slotIndex) => {
        const key         = `${type}_${slotIndex}`
        const shouldExist = slotIndex < count

        if (shouldExist && !this._animalNodes[key]) {
          const bounds = PEN_BOUNDS[type]
          const seed   = slotIndex * 12345
          const worldX = bounds.minX + (seed % 100 / 100) * (bounds.maxX - bounds.minX)
          const worldY = bounds.minY + ((seed * 7) % 100 / 100) * (bounds.maxY - bounds.minY)

          const sprite = this.add.sprite(worldX, worldY, ANIM_KEY[type].replace('walk_', 'animal_'))
          sprite.setDepth(ANIMAL_DEPTH)
          // Native frame is 32px; display at 2×TILE so it reads clearly at ZOOM=4
          sprite.setDisplaySize(TS * 2, TS * 2)
          sprite.play(ANIM_KEY[type])

          // ── Icon overlays anchored above the sprite ───────────────────────
          // Sprite is displayed at 2×TS (32 world px). Origin is centre-centre.
          // However the visible animal body only occupies the bottom ~16 px of
          // that 32 px frame — the top half is transparent. So we anchor icons
          // relative to the visual head, not the full display-box top.
          // iconOffsetY = half of visible body height + small gap + half icon size
          //             = 8 + 2 + 4 = 14 world px above sprite centre (≈ 56 px on screen)
          const ICON_SIZE   = 8    // 8 world px → 32 screen px at ZOOM=4
          const ICON_DEPTH  = ANIMAL_DEPTH + 1
          const CROP_KEY    = { chicken: 'feed_wheat', cow: 'feed_kale', sheep: 'feed_cabbage' }[type]
          const iconOffsetY = TS / 2 + 2 + ICON_SIZE / 2   // 14 world px above centre

          // Crop badge — shown when hungry
          const cropIcon = this.add.image(worldX, worldY - iconOffsetY, CROP_KEY)
          cropIcon.setDisplaySize(ICON_SIZE, ICON_SIZE)
          cropIcon.setDepth(ICON_DEPTH)
          cropIcon.setVisible(false)

          // Expression icon — stress / happy / alerted; sits above the crop badge
          const exprIcon = this.add.image(worldX, worldY - iconOffsetY - ICON_SIZE - 1, 'expr_stress')
          exprIcon.setDisplaySize(ICON_SIZE, ICON_SIZE)
          exprIcon.setDepth(ICON_DEPTH)
          exprIcon.setVisible(false)

          const node = { type, index: slotIndex, sprite, cropIcon, exprIcon, _timer: null }
          this._animalNodes[key] = node
          scheduleMove(node)

        } else if (!shouldExist && this._animalNodes[key]) {
          const node = this._animalNodes[key]
          node._timer?.remove?.()
          this.tweens.killTweensOf(node.sprite)
          node.sprite?.destroy()
          node.cropIcon?.destroy()
          node.exprIcon?.destroy()
          node.sprite    = null
          node.cropIcon  = null
          node.exprIcon  = null
          delete this._animalNodes[key]
        }
      })
    }

    syncGroup(CHICKEN_SPAWN_POSITIONS, 'chicken', 'Chicken', 10)
    syncGroup(COW_SPAWN_POSITIONS,     'cow',     'Cow',     5)
    syncGroup(SHEEP_SPAWN_POSITIONS,   'sheep',   'Sheep',   5)
  }

  /**
   * Called every frame from update().
   * Reads animal state from the game store and positions icon overlays
   * (crop badge + expression) above each animal sprite.
   */
  _updateAnimalIcons() {
    const gameState = window.__gameStore?.getState?.()?.state
    if (!gameState) return

    const TS = GAME_CONFIG.TILE_SIZE
    const ICON_SIZE   = 8
    const iconOffsetY = TS / 2 + 2 + ICON_SIZE / 2   // 14 world px — matches creation offset

    // Per-type constants mirroring the TypeScript hooks
    const PRODUCE_TIME = {
      chicken: 60_000,
      cow:     90_000,
      sheep:   120_000,
    }
    const RE_HUNGER = {
      chicken: 4 * 60 * 60 * 1000,
      cow:     6 * 60 * 60 * 1000,
      sheep:   6 * 60 * 60 * 1000,
    }
    const STATE_KEY = { chicken: 'chickens', cow: 'cows', sheep: 'sheep' }

    const produceSpeed = gameState.bonus?.produceSpeed ?? 0
    const speedFactor  = Math.max(0, 1 - produceSpeed)

    for (const node of Object.values(this._animalNodes)) {
      if (!node?.sprite?.active) continue

      const animalRecord = gameState[STATE_KEY[node.type]]?.[node.index]
      const fedAt        = animalRecord?.fedAt ?? 0
      const now          = Date.now()
      const elapsed      = fedAt ? now - fedAt : Infinity
      const produceTime  = PRODUCE_TIME[node.type] * speedFactor
      const reHunger     = RE_HUNGER[node.type]

      // Determine status
      let status = 'hungry'
      if (fedAt) {
        if (elapsed >= produceTime + reHunger) {
          status = 'hungry'
        } else if (elapsed >= produceTime) {
          status = 'ready'   // egg / milk / wool ready
        } else {
          status = 'happy'
        }
      }

      // Move icons to follow the sprite every frame
      const sx = node.sprite.x
      const sy = node.sprite.y

      node.cropIcon.setPosition(sx, sy - iconOffsetY)
      node.exprIcon.setPosition(sx, sy - iconOffsetY - ICON_SIZE - 1)

      // Crop badge — visible only when hungry
      node.cropIcon.setVisible(status === 'hungry')

      // Expression icon — no icon when hungry (crop badge is the only signal)
      if (status === 'happy') {
        node.exprIcon.setTexture('expr_happy')
        node.exprIcon.setVisible(true)
      } else if (status === 'ready') {
        node.exprIcon.setTexture('expr_alerted')
        node.exprIcon.setVisible(true)
      } else {
        node.exprIcon.setVisible(false)
      }
    }
  }

  /**
   * Populate node collections from the positions files.
   * Positions files are the sole source of truth — no Tiled object layers read.
   *
   * @param {Phaser.Tilemaps.Tilemap} map  (used only for player spawn point)
   * @returns {{ spawnX: number, spawnY: number }}
   */
  _readObjectLayers(map) {
    const TS = GAME_CONFIG.TILE_SIZE // 16

    // ── Player spawn (still read from map object layer) ───────────────────
    const playerLayer = map.getObjectLayer('player')
    const spawnObj    = playerLayer?.objects?.[0]
    const spawnX      = isFinite(spawnObj?.x) ? spawnObj.x : 400
    const spawnY      = isFinite(spawnObj?.y) ? spawnObj.y : 400

    // ── Plots ─────────────────────────────────�����──────────────────────────
    for (const p of PLOT_POSITIONS) {
      this._plotNodes[p.id] = {
        plotId:        p.id,
        fieldIndex:    p.fieldIndex,
        x:             p.x * TS,
        y:             p.y * TS,
        width:         TS,
        height:        TS,
        isDepleted:    false,
        requiredLevel: FIELD_LEVEL_REQUIREMENTS[p.fieldIndex] ?? 0,
      }
    }

    // ── Trees ───────────────────────────────────────────────────────���─────
    for (const t of TREE_POSITIONS) {
      this._treeNodes[t.id] = {
        nodeId:     t.id,
        x:          t.x * TS,
        y:          t.y * TS,
        width:      TS * 2,
        height:     TS * 2,
        isDepleted: false,
      }
    }

    // ── Stones, iron, and gold ────────────────────────────────────────────
    for (const s of [...STONE_POSITIONS, ...IRON_POSITIONS, ...GOLD_POSITIONS]) {
      this._stoneNodes[s.id] = {
        nodeId:     s.id,
        x:          s.x * TS,
        y:          s.y * TS,
        width:      TS * 2,
        height:     TS * 2,
        isDepleted: false,
      }
    }

    // ── Buildings ─────────────────────────────────────────────────────────
    for (const b of BUILDING_POSITIONS) {
      this._buildingZones.push({
        type:   b.type,
        x:      b.x      * TS,
        y:      b.y      * TS,
        width:  b.width  * TS,
        height: b.height * TS,
      })
    }

    // ── Fishing zone descriptors (tile set computed later in _buildFishingZone)
    for (const f of FISHING_POSITIONS) {
      this._fishingNodes[f.id] = { id: f.id, depth: f.depth, event: f.event, tiles: null }
    }

    return { spawnX, spawnY }
  }

  /**
   * Play the three-phase fishing animation sequence on the player sprite:
   *   1. casting  (spr_casting_strip15,  15 frames, repeat:0)
   *   2. reeling  (spr_reeling_strip13,  13 frames, repeat:0)
   *   3. caught   (spr_caught_strip10,   10 frames, repeat:0)
   *   4. idle     (resume normal loop)
   *
   * Uses the same _strikeLock guard as resource nodes so a second click
   * during the sequence is ignored.  Movement is already blocked in update()
   * because all three keys are in the actionAnims list.
   */
  _startFishingSequence(spot) {
    if (this._strikeLock) return

    // ── Cooldown + stamina guard ──────────────────────────────────────────────
    // Read live state from the shared store so Phaser never runs the animation
    // when React would reject the resulting fish.caught event anyway.
    const gameState = window.__gameStore?.getState?.()?.state
    if (gameState) {
      const BASE_MS = 30_000
      const MIN_MS  = 15_000
      const fishSpeed = gameState.bonus?.fishSpeed ?? 0
      const effectiveCooldown = Math.max(MIN_MS, BASE_MS * (1 - fishSpeed))
      const lastCastAt = gameState.fishing?.lastCastAt ?? 0
      const elapsed    = Date.now() - lastCastAt

      if (elapsed < effectiveCooldown) {
        window.dispatchEvent(new CustomEvent('phaser-fishing-cooldown', {
          detail: { reason: 'cooldown', remainingMs: effectiveCooldown - elapsed },
        }))
        return
      }

      const staminaCurrent = gameState.stamina?.current ?? 0
      if (staminaCurrent < 3) {
        window.dispatchEvent(new CustomEvent('phaser-fishing-cooldown', {
          detail: { reason: 'stamina' },
        }))
        return
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    this._strikeLock = true

    const sprite = this.player?.sprite
    if (!sprite) { this._strikeLock = false; return }

    const hasAnim = (key) => this.anims.exists(key)

    // Notify React overlay that the cast has started so it can show a real timed progress bar.
    // casting: 15f @ 10fps = 1500ms, reeling: 13f = 1300ms, caught: 10f = 1000ms → 3800ms total.
    const castDurationMs = (15 + 13 + 10) * (1000 / 10) // 3800 ms
    window.dispatchEvent(new CustomEvent('phaser-fishing-start', { detail: { castDurationMs } }))

    const playPhase = (key, next) => {
      if (!hasAnim(key)) { next(); return }
      sprite.play(key, true)
      sprite.once('animationcomplete', next)
    }

    const onCaught = () => {
      // Dispatch the game event after the caught animation finishes
      this._dispatchUiEvent(spot.event, { spot })
      if (hasAnim('player_idle')) sprite.play('player_idle', true)
      this._strikeLock = false
    }

    const onReeling = () => playPhase('player_caught',  onCaught)
    const onCasting = () => playPhase('player_reeling', onReeling)

    playPhase('player_casting', onCasting)
  }

  /**
   * Called every frame from update().
   * Fires 'phaser-fishing-zone-enter' / 'phaser-fishing-zone-exit' (edge-triggered)
   * so React can show/hide the cooldown bar only when the player is near the water.
   */
  _updateFishingZoneProximity() {
    const spot = Object.values(this._fishingNodes ?? {})[0]
    if (!spot?.tiles) return

    const TS = GAME_CONFIG.TILE_SIZE
    const px = Math.floor(this.player.sprite.x / TS)
    const py = Math.floor(this.player.sprite.y / TS)

    // Player is "near" if they or any of their 4 cardinal neighbours touch a fishing tile.
    const nearNow =
      spot.tiles.has(`${px},${py}`)     ||
      spot.tiles.has(`${px - 1},${py}`) ||
      spot.tiles.has(`${px + 1},${py}`) ||
      spot.tiles.has(`${px},${py - 1}`) ||
      spot.tiles.has(`${px},${py + 1}`)

    if (nearNow === this._nearFishingZone) return // no change

    this._nearFishingZone = nearNow
    window.dispatchEvent(new CustomEvent(
      nearNow ? 'phaser-fishing-zone-enter' : 'phaser-fishing-zone-exit',
    ))
  }

  /**
   * Compute the fishable shoreline strip, paint the red tile overlay, and
   * register each shoreline tile for interaction — all in one pass.
   *
   * Definition: three tiles deep from the sand boundary —
   *   row 1 ("above"):  sand tiles that directly border a water tile
   *   row 2 (current):  water tiles directly touching a sand tile
   *   row 3 ("behind"): water tiles touching a row-2 water tile (one step further out)
   *
   * Rendering: a single Graphics object drawn at depth 1.5 (between the sand
   * layer at 1 and the land layer at 2).  Same-depth rendering order in
   * Phaser follows display-list insertion order, so this Graphics — added
   * after all tile layers — renders on top of water (depth 0) and sand (depth
   * 1) but the land layer (depth 2) still covers it over solid ground.
   * Because we only fill shoreline ocean tiles (not land tiles), red appears
   * only in the water strip adjacent to shore.
   *
   * Interaction: the tile set is stored as a Set<'tx,ty'> on the node and
   * checked in the pointer handler and proximity system.
   */
  _buildFishingZone() {
    if (!this._layerLand || !this._layerSand || !this._layerWater) return

    const TS    = GAME_CONFIG.TILE_SIZE
    const MAP_W = this._layerWater.layer.width
    const MAP_H = this._layerWater.layer.height

    // ── 1. Sand-edge helpers ───────────────────────────────────────────────
    // isSand: the tile has a non-empty sand layer tile (the beach boundary).
    // isLandOrSand: used to exclude land tiles from the fishing set.
    const isSand = (tx, ty) => {
      if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false
      const s = this._layerSand.getTileAt(tx, ty)
      return s && s.index > 0
    }
    const isLandOrSand = (tx, ty) => {
      if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false
      const l = this._layerLand.getTileAt(tx, ty)
      const s = this._layerSand.getTileAt(tx, ty)
      return (l && l.index > 0) || (s && s.index > 0)
    }

    // ── 2. Build the three-tile-deep fishing strip ────────────────────────
    const tileSet  = new Set()  // 'tx,ty' strings for O(1) lookup
    const cardinals = [[1,0],[-1,0],[0,1],[0,-1]]

    const isOcean = (tx, ty) => {
      if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false
      return !isLandOrSand(tx, ty)
    }

    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        // Row 1 ("above"): sand tiles that have at least one water neighbour
        if (isSand(tx, ty)) {
          const bordersWater = cardinals.some(([dx, dy]) => isOcean(tx + dx, ty + dy))
          if (bordersWater) tileSet.add(`${tx},${ty}`)
          continue
        }

        if (!isOcean(tx, ty)) continue

        // Row 2: water tiles directly touching a sand tile
        const touchesSand = cardinals.some(([dx, dy]) => isSand(tx + dx, ty + dy))
        if (touchesSand) {
          tileSet.add(`${tx},${ty}`)
          continue
        }

        // Row 3 ("behind"): water tiles whose cardinal neighbour is a row-2 tile
        // (i.e. touching a water tile that itself touches sand)
        const touchesRow2 = cardinals.some(([dx, dy]) => {
          const nx = tx + dx, ny = ty + dy
          if (!isOcean(nx, ny)) return false
          return cardinals.some(([dx2, dy2]) => isSand(nx + dx2, ny + dy2))
        })
        if (touchesRow2) tileSet.add(`${tx},${ty}`)
      }
    }

    const node = Object.values(this._fishingNodes)[0]

    // Store tile set on the node for pointer/proximity queries
    if (node) node.tiles = tileSet

    // ── 3. Paint the red overlay using ADD blend mode ─────────────────────
    // Phaser's Graphics depth-sorting against TilemapLayers is unreliable
    // because layers use a separate WebGL render path.  The workaround:
    // draw the Graphics with BlendModes.ADD — it *adds* red on top of
    // whatever the GPU has already drawn (including tile layers), so depth
    // order doesn't matter.  A dark red (0x550000) added to the bright-blue
    // water tiles produces a clearly reddish-purple coastal tint without
    // over-saturating the colours.
    const gfx = this.add.graphics()
    gfx.setDepth(100)   // above everything — blend mode handles the look
    gfx.setBlendMode(Phaser.BlendModes.ADD)
    gfx.fillStyle(0x660000, 1)

    for (const key of tileSet) {
      const [tx, ty] = key.split(',').map(Number)
      gfx.fillRect(tx * TS, ty * TS, TS, TS)
    }
  }

  // ─── Interaction ─��──────────────────────────────────────��─────────────────

  /**
   * Single pointer-down handler for both desktop clicks and mobile taps.
   *
   * Decision tree:
   *   1. Click lands on an in-range resource/plot node → dispatch interaction event.
   *   2. Click lands on an in-range building zone → dispatch building-open event.
   *   3. Otherwise → click-to-move.
   */
  _setupPointerInteraction() {
    // Timestamp of the last accepted pointer-down event (ms).
    // Used to debounce duplicate events that some browsers/devices fire
    // (e.g. touch → pointerdown + mousedown both arriving within the same tick).
    this._lastPointerDownMs = 0

    this._onPointerDown = (pointer) => {
      if (pointer.button !== 0) return

      // Drop duplicate events that arrive within 150 ms of each other.
      // This guards against the browser firing both a touch event and a synthetic
      // mouse event for the same physical tap.
      const now = Date.now()
      if (now - this._lastPointerDownMs < 150) return
      this._lastPointerDownMs = now

      const wp     = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      const worldX = wp.x ?? pointer.worldX ?? pointer.x
      const worldY = wp.y ?? pointer.worldY ?? pointer.y
      const ts     = GAME_CONFIG.TILE_SIZE
      const tileX  = Math.floor(worldX / ts)
      const tileY  = Math.floor(worldY / ts)

      // 1. Resource / plot node
      const node = this._getNodeAtTile(
        [
          ...Object.values(this._treeNodes),
          ...Object.values(this._stoneNodes),
          ...Object.values(this._plotNodes),
        ],
        tileX, tileY,
      )

      const inRange = node ? this.proximity.isNodeInRange(node) : false
      if (node && inRange) {
        if (node.type) {
          // Resource node — strike animation
          this._strikeResourceNode(node)
        } else {
          // Plot node — check locked before doing animation
          const farmingXP   = window.__gameStore?.getState?.()?.state?.skills?.farming ?? 0
          let playerLevel = 1; let acc = 0
          while (playerLevel < 100) { const n = Math.floor(100 * (playerLevel ** 1.6)); acc += n; if (acc > farmingXP) break; playerLevel++ }
          const reqLevel    = node.requiredLevel ?? 0
          if (reqLevel > playerLevel) {
            // Locked — fire event with screen position so React can show popover
            const cam  = this.cameras.main
            const zoom = cam.zoom
            const cx   = node.x + GAME_CONFIG.TILE_SIZE / 2
            const cy   = node.y
            this._dispatchUiEvent('phaser-plot-locked', {
              fieldIndex: node.fieldIndex,
              requiredLevel: reqLevel,
              screenX: Math.round((cx - cam.worldView.x) * zoom + (cam.x ?? 0)),
              screenY: Math.round((cy - cam.worldView.y) * zoom + (cam.y ?? 0)), // worldView formula
            })
          } else {
            this._doingActionOnPlot(node)
          }
        }
        this._dispatchUiEvent('phaser-node-interact', { nodeId: node.nodeId ?? node.plotId, node })
        return
      }

      // 2. Animal — click to feed or collect when in proximity (2-tile radius)
      const ANIMAL_HALF = GAME_CONFIG.TILE_SIZE  // half of the 2×TS display size
      const hitAnimal = Object.values(this._animalNodes ?? {}).find((n) => {
        if (!n?.sprite?.active) return false
        return Math.abs(worldX - n.sprite.x) <= ANIMAL_HALF &&
               Math.abs(worldY - n.sprite.y) <= ANIMAL_HALF
      })
      if (hitAnimal) {
        const playerTileX = Math.floor(this.player.sprite.x / GAME_CONFIG.TILE_SIZE)
        const playerTileY = Math.floor(this.player.sprite.y / GAME_CONFIG.TILE_SIZE)
        const animalTileX = Math.floor(hitAnimal.sprite.x  / GAME_CONFIG.TILE_SIZE)
        const animalTileY = Math.floor(hitAnimal.sprite.y  / GAME_CONFIG.TILE_SIZE)
        const tilesDist   = Math.max(
          Math.abs(playerTileX - animalTileX),
          Math.abs(playerTileY - animalTileY),
        )
        if (tilesDist <= 2) {
          const gs          = window.__gameStore?.getState?.()?.state
          const dispatch    = window.__gameStore?.getState?.()?.dispatch
          const STATE_KEY   = { chicken: 'chickens', cow: 'cows', sheep: 'sheep' }
          const PRODUCE_MS  = { chicken: 60_000, cow: 90_000, sheep: 120_000 }
          const RE_HUNGER   = { chicken: 4 * 60 * 60 * 1000, cow: 6 * 60 * 60 * 1000, sheep: 6 * 60 * 60 * 1000 }
          const FEED_EVENT  = { chicken: 'chicken.feed',       cow: 'cow.feed',       sheep: 'sheep.feed' }
          const COLL_EVENT  = { chicken: 'chicken.collectEgg', cow: 'cow.collectMilk', sheep: 'sheep.collectWool' }

          const speedFactor  = Math.max(0, 1 - (gs?.bonus?.produceSpeed ?? 0))
          const record       = gs?.[STATE_KEY[hitAnimal.type]]?.[hitAnimal.index]
          const fedAt        = record?.fedAt ?? 0
          const elapsed      = fedAt ? Date.now() - fedAt : Infinity
          const produceTime  = PRODUCE_MS[hitAnimal.type] * speedFactor
          const reHunger     = RE_HUNGER[hitAnimal.type]
          const isReady      = fedAt && elapsed >= produceTime && elapsed < produceTime + reHunger
          const isHungry     = !fedAt || elapsed >= produceTime + reHunger

          if (dispatch) {
            try {
              if (isReady)   dispatch({ type: COLL_EVENT[hitAnimal.type], index: hitAnimal.index })
              else if (isHungry) dispatch({ type: FEED_EVENT[hitAnimal.type], index: hitAnimal.index })
            } catch (_e) { /* not enough feed / already fed — ignore */ }
          }
        }
        return
      }

      // 3. NPC �� check NPC footprint
      const npcList = Object.values(this._npcNodes ?? {})
      const hitNpc = npcList.find((npc) =>
        worldX >= npc.x && worldX < npc.x + npc.width &&
        worldY >= npc.y && worldY < npc.y + npc.height
      )
      if (hitNpc) {
        if (this.proximity.isNodeInRange(hitNpc)) {
          this._activeNpc = hitNpc
          this._dispatchUiEvent(hitNpc.event, { npc: hitNpc })
        }
        // Out of range — do nothing. Player must walk there first, then click.
        return
      }

      // 3. Building zone — check building footprint
      const hitBuilding = this._buildingZones?.find((zone) =>
        worldX >= zone.x && worldX < zone.x + zone.width &&
        worldY >= zone.y && worldY < zone.y + zone.height
      )
      if (hitBuilding) {
        if (this._isBuildingInRange(hitBuilding)) {
          this._activeBuilding = hitBuilding
          this._dispatchUiEvent(`phaser-${hitBuilding.type}-open`, { zone: hitBuilding })
        }
        // Out of range — do nothing. Player must walk there first, then click.
        return
      }

      // 4. Fishing zone — check if the clicked tile is in the shoreline strip
      const clickTileX = Math.floor(worldX / GAME_CONFIG.TILE_SIZE)
      const clickTileY = Math.floor(worldY / GAME_CONFIG.TILE_SIZE)
      const fishingList = Object.values(this._fishingNodes ?? {})
      const hitFishing = fishingList.find(
        (spot) => spot.tiles?.has(`${clickTileX},${clickTileY}`)
      )
      if (hitFishing) {
        // Player must be standing on or adjacent to the shoreline strip
        const playerTileX = Math.floor(this.player.sprite.x / GAME_CONFIG.TILE_SIZE)
        const playerTileY = Math.floor(this.player.sprite.y / GAME_CONFIG.TILE_SIZE)
        const adjacent = hitFishing.tiles?.has(`${playerTileX},${playerTileY}`) ||
          hitFishing.tiles?.has(`${playerTileX - 1},${playerTileY}`) ||
          hitFishing.tiles?.has(`${playerTileX + 1},${playerTileY}`) ||
          hitFishing.tiles?.has(`${playerTileX},${playerTileY - 1}`) ||
          hitFishing.tiles?.has(`${playerTileX},${playerTileY + 1}`)
        if (adjacent) {
          this._startFishingSequence(hitFishing)
        }
        return
      }
    }

    this.input.on('pointerdown', this._onPointerDown)

    // ── Mobile action button bridge ────────────────────────────────────────
    // React's MobileActionButton dispatches 'phaser-mobile-action' when tapped.
    // We re-use the same internal methods as the pointer handler so behaviour
    // is identical whether the player taps the world or presses the button.
    this._onMobileAction = () => {
      const hint = window.__mobileActionHint
      if (!hint) return

      const gs       = window.__gameStore?.getState?.()?.state
      const dispatch = window.__gameStore?.getState?.()?.dispatch
      const TS       = GAME_CONFIG.TILE_SIZE

      if (hint.type === 'chop' || hint.type === 'mine') {
        // Find the first in-range resource node and strike it
        const allResource = [
          ...Object.values(this._treeNodes  ?? {}),
          ...Object.values(this._stoneNodes ?? {}),
        ]
        const node = allResource.find((n) => !n?.isDepleted && this.proximity.isNodeInRange(n))
        if (node) this._strikeResourceNode(node)
        return
      }

      if (hint.type === 'plant' || hint.type === 'harvest') {
        // Find the first in-range, unlocked plot and do the plot action
        const farmingXP  = gs?.skills?.farming ?? 0
        let playerLevel = 1; let acc = 0
        while (playerLevel < 100) { const n = Math.floor(100 * (playerLevel ** 1.6)); acc += n; if (acc > farmingXP) break; playerLevel++ }

        const node = Object.values(this._plotNodes ?? {}).find((n) => {
          if (!this.proximity.isNodeInRange(n)) return false
          return (n.requiredLevel ?? 0) <= playerLevel
        })
        if (node) this._doingActionOnPlot(node)
        return
      }

      if (hint.type === 'feed' || hint.type === 'collect') {
        const PRODUCE_MS = { chicken: 60_000, cow: 90_000, sheep: 120_000 }
        const RE_HUNGER  = { chicken: 4 * 60 * 60 * 1000, cow: 6 * 60 * 60 * 1000, sheep: 6 * 60 * 60 * 1000 }
        const STATE_KEY  = { chicken: 'chickens', cow: 'cows', sheep: 'sheep' }
        const FEED_EVENT = { chicken: 'chicken.feed',       cow: 'cow.feed',       sheep: 'sheep.feed' }
        const COLL_EVENT = { chicken: 'chicken.collectEgg', cow: 'cow.collectMilk', sheep: 'sheep.collectWool' }

        // Find the nearest in-range animal matching the hint
        const node = Object.values(this._animalNodes ?? {}).find((n) => {
          if (!n?.sprite?.active) return false
          if (hint.animal && n.type !== hint.animal) return false
          const pTX = Math.floor(this.player.sprite.x / TS)
          const pTY = Math.floor(this.player.sprite.y / TS)
          const aTX = Math.floor(n.sprite.x / TS)
          const aTY = Math.floor(n.sprite.y / TS)
          return Math.max(Math.abs(pTX - aTX), Math.abs(pTY - aTY)) <= 2
        })
        if (node && dispatch) {
          const speedFactor = Math.max(0, 1 - (gs?.bonus?.produceSpeed ?? 0))
          const record      = gs?.[STATE_KEY[node.type]]?.[node.index]
          const fedAt       = record?.fedAt ?? 0
          const elapsed     = fedAt ? Date.now() - fedAt : Infinity
          const produceTime = PRODUCE_MS[node.type] * speedFactor
          const reHunger    = RE_HUNGER[node.type]
          const isReady     = fedAt && elapsed >= produceTime && elapsed < produceTime + reHunger
          const isHungry    = !fedAt || elapsed >= produceTime + reHunger
          try {
            if (isReady)        dispatch({ type: COLL_EVENT[node.type], index: node.index })
            else if (isHungry)  dispatch({ type: FEED_EVENT[node.type], index: node.index })
          } catch (_e) { /* insufficient feed or already acted — ignore */ }
        }
        return
      }

      if (hint.type === 'fish') {
        const spot = Object.values(this._fishingNodes ?? {})[0]
        if (spot) this._startFishingSequence(spot)
        return
      }
    }

    window.addEventListener('phaser-mobile-action', this._onMobileAction)

    this._setupPointerMoveTooltip()
  }

  // ─── Hover highlight resolver ────��──���───────────────────────��─────────���───

  _getHoverBounds(tileX, tileY) {
    const node = this._getInteractableNodeAtTile(tileX, tileY)
    if (!node || !this.proximity.isNodeInRange(node)) return null
    const ts = GAME_CONFIG.TILE_SIZE
    return { left: node.x, top: node.y, right: node.x + (node.width ?? ts), bottom: node.y + (node.height ?? ts) }
  }

  // ─── Tile helpers ─────────────────────────────────────────────────────────

  _getInteractableNodeAtTile(tileX, tileY) {
    return this._getNodeAtTile(
      [
        ...Object.values(this._treeNodes  ?? {}),
        ...Object.values(this._stoneNodes ?? {}),
        ...Object.values(this._plotNodes  ?? {}),
        ...Object.values(this._npcNodes   ?? {}),
      ],
      tileX, tileY,
    )
  }

  _getNodeAtTile(nodes, tileX, tileY) {
    const ts = GAME_CONFIG.TILE_SIZE
    const px = tileX * ts
    const py = tileY * ts
    return nodes.find((n) => {
      if (!n || n.isDepleted) return false
      const w = n.width  ?? ts
      const h = n.height ?? ts
      return px >= n.x && px < n.x + w && py >= n.y && py < n.y + h
    }) ?? null
  }

  // ─���─ Utilities ─────────────────���──────────────────────────────────────────

  /**
   * Check if a building zone is within the player's interaction range.
   * Delegates to ProximitySystem so buildings use the exact same
   * INTERACTION_RADIUS_TILES distance as resource nodes.
   */
  _isBuildingInRange(zone) {
    if (!zone) return false
    return this.proximity.isNodeInRange(zone)
  }

  _dispatchUiEvent(eventName, detail) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(eventName, { detail }))
  }

  _shutdown() {
    if (this._onPointerDown) this.input.off('pointerdown', this._onPointerDown)
    if (this._onPointerMove) this.input.off('pointermove', this._onPointerMove)
    if (this._onMobileAction) window.removeEventListener('phaser-mobile-action', this._onMobileAction)
    if (this._animalStoreUnsub) this._animalStoreUnsub()
    window.__mobileActionHint = null
    this.input_?.destroy()
    this.proximity?.destroy()
    this.proximityHighlight?.destroy()
    this.hoverHighlight?.destroy()
    this.intent = null
  }
}
