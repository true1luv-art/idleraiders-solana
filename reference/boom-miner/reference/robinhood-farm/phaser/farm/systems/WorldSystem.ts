import Phaser from "phaser";
import { GAME_CONFIG } from "@/phaser/config/GameConfig";
import {
  BUILDING_POSITIONS,
  FISHING_POSITIONS,
  GOLD_POSITIONS,
  IRON_POSITIONS,
  PLOT_POSITIONS,
  STONE_POSITIONS,
  TREE_POSITIONS,
} from "@/phaser/positions";
import { FIELD_LEVEL_REQUIREMENTS } from "@/features/game/fields";
import type { FarmNodeRegistry } from "@/phaser/farm/types";

export interface FarmWorld {
  map: Phaser.Tilemaps.Tilemap;
  width: number;
  height: number;
  spawnX: number;
  spawnY: number;
  /** The fishing_boundary layer — tiles here are valid cast targets. */
  fishingLayer: Phaser.Tilemaps.TilemapLayer | null;
}

export class WorldSystem {
  private colliders?: Phaser.Physics.Arcade.StaticGroup;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly nodes: FarmNodeRegistry,
  ) {}

  create(): FarmWorld {
    const map = this.scene.make.tilemap({ key: "island" });
    const tileset = map.addTilesetImage("spr_tileset_sunnysideworld_16px", "tiles");
    if (!tileset) {
      throw new Error('Tileset "spr_tileset_sunnysideworld_16px" not found. Check island.json.');
    }

    const { fishingLayer, boundaryLayer } = this.buildLayers(map, tileset);
    const { spawnX, spawnY } = this.readPositions(map);
    this.createBuildingColliders(boundaryLayer);

    return {
      map,
      width: map.widthInPixels,
      height: map.heightInPixels,
      spawnX,
      spawnY,
      fishingLayer,
    };
  }

  addPlayerCollider(player: Phaser.GameObjects.GameObject): void {
    if (this.colliders) this.scene.physics.add.collider(player, this.colliders);
    if (this.boundaryLayer) this.scene.physics.add.collider(player, this.boundaryLayer);
  }

  private boundaryLayer: Phaser.Tilemaps.TilemapLayer | null = null;

  private buildLayers(map: Phaser.Tilemaps.Tilemap, tileset: Phaser.Tilemaps.Tileset): {
    fishingLayer: Phaser.Tilemaps.TilemapLayer | null;
    boundaryLayer: Phaser.Tilemaps.TilemapLayer | null;
  } {
    const make = (name: string, depth: number) =>
      map.createLayer(name, tileset, 0, 0)?.setDepth(depth) ?? null;

    // Render layers — bottom to top (matches island.json layer order)
    make("water",   0);
    make("sand",    1);
    make("land",    2);
    make("mountain", 3);
    make("path2",   4);
    make("path",    4);
    make("plots",   5);
    make("bridge",  6);
    make("fences",  6);
    make("dirt",    7);
    make("barn",    8);
    make("decor2",  10);
    make("decor1",  11);

    // Boundary layer — invisible, used for player collision only
    const boundaryLayer = map.createLayer("boundary", tileset, 0, 0)?.setDepth(0)?.setVisible(false) ?? null;
    if (boundaryLayer) {
      boundaryLayer.setCollisionByExclusion([-1, 0]);
      this.boundaryLayer = boundaryLayer;
    }

    // Fishing boundary layer — invisible, used to define castable tiles
    const fishingLayer = map.createLayer("fishing_boundary", tileset, 0, 0)?.setDepth(0)?.setVisible(false) ?? null;

    return { fishingLayer, boundaryLayer };
  }

  private readPositions(map: Phaser.Tilemaps.Tilemap) {
    const size = GAME_CONFIG.TILE_SIZE;
    const spawn = map.getObjectLayer("player")?.objects?.[0];
    const spawnX = typeof spawn?.x === "number" && Number.isFinite(spawn.x) ? spawn.x : 400;
    const spawnY = typeof spawn?.y === "number" && Number.isFinite(spawn.y) ? spawn.y : 400;

    for (const plot of PLOT_POSITIONS) {
      this.nodes.plots[plot.id] = {
        plotId: plot.id, fieldIndex: plot.fieldIndex, x: plot.x * size, y: plot.y * size,
        width: size, height: size, isDepleted: false,
        requiredLevel: FIELD_LEVEL_REQUIREMENTS[plot.fieldIndex] ?? 0,
      };
    }
    for (const tree of TREE_POSITIONS) {
      this.nodes.trees[tree.id] = { nodeId: tree.id, x: tree.x * size, y: tree.y * size, width: size * 2, height: size * 2, isDepleted: false };
    }
    for (const stone of [...STONE_POSITIONS, ...IRON_POSITIONS, ...GOLD_POSITIONS]) {
      this.nodes.stones[stone.id] = { nodeId: stone.id, x: stone.x * size, y: stone.y * size, width: size * 2, height: size * 2, isDepleted: false };
    }
    for (const building of BUILDING_POSITIONS) {
      this.nodes.buildingZones.push({ type: building.type, x: building.x * size, y: building.y * size, width: building.width * size, height: building.height * size });
    }
    for (const fishing of FISHING_POSITIONS) {
      this.nodes.fishing[fishing.id] = { id: fishing.id, depth: fishing.depth, event: fishing.event, tiles: null };
    }
    return { spawnX, spawnY };
  }

  // boundaryLayer param kept for potential future use (tile-based per-zone collisions).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private createBuildingColliders(_boundaryLayer: Phaser.Tilemaps.TilemapLayer | null): void {
    this.colliders = this.scene.physics.add.staticGroup();
    for (const zone of this.nodes.buildingZones) {
      const body = this.scene.add.rectangle(zone.x + zone.width / 2, zone.y + zone.height / 2, zone.width, zone.height);
      this.scene.physics.add.existing(body, true);
      this.colliders.add(body);
    }
  }

  destroy(): void {
    this.colliders?.clear(true, true);
    this.colliders = undefined;
    this.boundaryLayer = null;
  }
}
