/**
 * Fishing zone descriptor.
 *
 * The actual tile set (full shoreline strip, 2 tiles deep from every land
 * edge) is computed at runtime inside FarmScene._buildFishingZone() by
 * scanning the live tilemap layers — this keeps the source of truth in the
 * map itself rather than duplicating tile coordinates here.
 */
export const FISHING_POSITIONS = [
  {
    id:    'fishing_shoreline',
    // Ocean tiles within this many steps of any land/sand tile are fishable
    depth: 2,
    event: 'phaser-fishing-open',
  },
]
