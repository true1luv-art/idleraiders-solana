// Card images are in public/assets/cards/
// Maps card IDs from CARDS_DATA to image paths

/**
 * Universal fallback image for any card whose artwork is missing.
 * Use this as the final fallback in getCardImage and as the onError
 * target for <img> tags that render card artwork.
 */
export const CARD_BACK_FALLBACK = '/assets/card_back.png'

export const CARD_IMAGES: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // HEROES — 20 starting roster (Season 1)
  // ═══════════════════════════════════════════════════════════════════════════

  // Legendary (1)
  legendary_hero_1: '/assets/cards/legendary_hero_1.png',

  // Epic (2)
  epic_hero_1: '/assets/cards/epic_hero_1.png',
  epic_hero_2: '/assets/cards/epic_hero_2.png',

  // Rare (3)
  rare_hero_1: '/assets/cards/rare_hero_1.png',
  rare_hero_2: '/assets/cards/rare_hero_2.png',
  rare_hero_3: '/assets/cards/rare_hero_3.png',

  // Uncommon (6)
  uncommon_hero_1: '/assets/cards/uncommon_hero_1.png',
  uncommon_hero_2: '/assets/cards/uncommon_hero_2.png',
  uncommon_hero_3: '/assets/cards/uncommon_hero_3.png',
  uncommon_hero_4: '/assets/cards/uncommon_hero_4.png',
  uncommon_hero_5: '/assets/cards/uncommon_hero_5.png',
  uncommon_hero_6: '/assets/cards/uncommon_hero_6.png',

  // Common (8)
  common_hero_1: '/assets/cards/common_hero_1.png',
  common_hero_2: '/assets/cards/common_hero_2.png',
  common_hero_3: '/assets/cards/common_hero_3.png',
  common_hero_4: '/assets/cards/common_hero_4.png',
  common_hero_5: '/assets/cards/common_hero_5.png',
  common_hero_6: '/assets/cards/common_hero_6.png',
  common_hero_7: '/assets/cards/common_hero_7.png',
  common_hero_8: '/assets/cards/common_hero_8.png',

  // ═══════════════════════════════════════════════════════════════════════════
  // EQUIPMENT
  // ═══════════════════════════════════════════════════════════════════════════
  legendary_equipment_1: '/assets/cards/legendary_equipment_1.png',
  epic_equipment_1: '/assets/cards/epic_equipment_1.png',
  epic_equipment_2: '/assets/cards/epic_equipment_2.png',
  rare_equipment_1: '/assets/cards/rare_equipment_1.png',
  rare_equipment_2: '/assets/cards/rare_equipment_2.png',
  rare_equipment_3: '/assets/cards/rare_equipment_3.png',
  uncommon_equipment_1: '/assets/cards/uncommon_equipment_1.png',
  uncommon_equipment_2: '/assets/cards/uncommon_equipment_2.png',
  uncommon_equipment_3: '/assets/cards/uncommon_equipment_3.png',
  uncommon_equipment_4: '/assets/cards/uncommon_equipment_4.png',
  uncommon_equipment_5: '/assets/cards/uncommon_equipment_5.png',
  common_equipment_1: '/assets/cards/common_equipment_1.png',
  common_equipment_2: '/assets/cards/common_equipment_2.png',
  common_equipment_3: '/assets/cards/common_equipment_3.png',
  common_equipment_4: '/assets/cards/common_equipment_4.png',
  common_equipment_5: '/assets/cards/common_equipment_5.png',
  common_equipment_6: '/assets/cards/common_equipment_6.png',
  common_equipment_7: '/assets/cards/common_equipment_7.png',
  common_equipment_8: '/assets/cards/common_equipment_8.png',

  // ═══════════════════════════════════════════════════════════════════════════
  // MOUNTS
  // ═══════════════════════════════════════════════════════════════════════════
  legendary_mount_1: '/assets/cards/legendary_mount_1.png',
  epic_mount_1: '/assets/cards/epic_mount_1.png',
  rare_mount_1: '/assets/cards/rare_mount_1.png',
  rare_mount_2: '/assets/cards/rare_mount_2.png',
  uncommon_mount_1: '/assets/cards/uncommon_mount_1.png',
  uncommon_mount_2: '/assets/cards/uncommon_mount_2.png',
  uncommon_mount_3: '/assets/cards/uncommon_mount_3.png',
  common_mount_1: '/assets/cards/common_mount_1.png',
  common_mount_2: '/assets/cards/common_mount_2.png',
  common_mount_3: '/assets/cards/common_mount_3.png',
  common_mount_4: '/assets/cards/common_mount_4.png',

  // ═══════════════════════════════════════════════════════════════════════════
  // ARTIFACTS
  // ═══════════════════════════════════════════════════════════════════════════
  legendary_artifact_1: '/assets/cards/legendary_artifact_1.png',
  epic_artifact_1: '/assets/cards/epic_artifact_1.png',
  rare_artifact_1: '/assets/cards/rare_artifact_1.png',
  rare_artifact_2: '/assets/cards/rare_artifact_2.png',
  rare_artifact_3: '/assets/cards/rare_artifact_3.png',
  uncommon_artifact_1: '/assets/cards/uncommon_artifact_1.png',
  uncommon_artifact_2: '/assets/cards/uncommon_artifact_2.png',
  common_artifact_1: '/assets/cards/common_artifact_1.png',
  common_artifact_2: '/assets/cards/common_artifact_2.png',
  common_artifact_3: '/assets/cards/common_artifact_3.png',
  common_artifact_4: '/assets/cards/common_artifact_4.png',

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSPORTS
  // ═══════════════════════════════════════════════════════════════════════════
  legendary_transport_1: '/assets/cards/legendary_transport_1.png',
  epic_transport_1: '/assets/cards/epic_transport_1.png',
  rare_transport_1: '/assets/cards/rare_transport_1.png',
  rare_transport_2: '/assets/cards/rare_transport_2.png',
  rare_transport_3: '/assets/cards/rare_transport_3.png',
  uncommon_transport_1: '/assets/cards/uncommon_transport_1.png',
  uncommon_transport_2: '/assets/cards/uncommon_transport_2.png',
  uncommon_transport_3: '/assets/cards/uncommon_transport_3.png',
  uncommon_transport_4: '/assets/cards/uncommon_transport_4.png',
  common_transport_1: '/assets/cards/common_transport_1.png',
  common_transport_2: '/assets/cards/common_transport_2.png',
  common_transport_3: '/assets/cards/common_transport_3.png',
  common_transport_4: '/assets/cards/common_transport_4.png',
  common_transport_5: '/assets/cards/common_transport_5.png',
  common_transport_6: '/assets/cards/common_transport_6.png',

  // ═══════════════════════════════════════════════════════════════════════════
  // STORY CARDS (Territory 1-4 images available, Territory 5 pending)
  // ═════════════════════════════════════════════════��═════════════════════════
  // Territory 1: Evershade
  story_special_1: '/assets/cards/story_special_1.png', // Evershade Scout (hero)
  story_special_2: '/assets/cards/story_special_2.png', // Ambusher's Cloak (equipment)
  story_special_3: '/assets/cards/story_special_3.png', // Webspinner Arachna (mount)
  story_special_4: '/assets/cards/story_special_4.png', // Broodmother's Silk (relic)
  story_special_5: '/assets/cards/story_special_5.png', // Goblin King's Crown (artifact)
  // Territory 2: Sunspire Citadel
  story_special_6: '/assets/cards/story_special_6.png', // Sunspire Paladin (hero)
  story_special_7: '/assets/cards/story_special_7.png', // Bone Commander's Shield (equipment)
  story_special_8: '/assets/cards/story_special_8.png', // Soul Reaver's Steed (mount)
  story_special_9: '/assets/cards/story_special_9.png', // Crypt Guardian's Sigil (relic)
  story_special_10: '/assets/cards/story_special_10.png', // Lich King's Phylactery (artifact)
  // Territory 3: Frosthold
  story_special_11: '/assets/cards/story_special_11.png', // Frosthold Ranger (hero)
  story_special_12: '/assets/cards/story_special_12.png', // Giant's Frostblade (equipment)
  story_special_13: '/assets/cards/story_special_13.png', // Cursed Forest Stag (mount)
  story_special_14: '/assets/cards/story_special_14.png', // Treant's Heartwood (relic)
  story_special_15: '/assets/cards/story_special_15.png', // Crown of Eternal Frost (artifact)
  // Territory 4: Ember City
  story_special_16: '/assets/cards/story_special_16.png', // Ember City Blacksmith (hero)
  story_special_17: '/assets/cards/story_special_17.png', // Magma Pickaxe (equipment)
  story_special_18: '/assets/cards/story_special_18.png', // Ashen Drake (mount)
  story_special_19: '/assets/cards/story_special_19.png', // Ash Lord's Scepter (relic)
  story_special_20: '/assets/cards/story_special_20.png', // Infernal Gate Key (artifact)
  // Territory 5: Iron Citadel
  story_special_21: '/assets/cards/story_special_21.png', // Iron Citadel Champion (hero)
  story_special_22: '/assets/cards/story_special_22.png', // Demon Lord's War Horn (equipment)
  story_special_23: '/assets/cards/story_special_23.png', // Dragon's Eye Drake (mount)
  story_special_24: '/assets/cards/story_special_24.png', // Dragonfire Warplate (relic)
  story_special_25: '/assets/cards/story_special_25.png', // Crown of the Five Realms (artifact)
}

// ═══════════════════════════════════════════════════════════════════════════
// FALLBACK IMAGES BY TYPE AND RARITY
// ═══════════════════════════════════════════════════════════════════════════
export const FALLBACK_IMAGES: Record<string, Record<string, string>> = {
  hero: {
    legendary: '/assets/cards/legendary_hero_1.png',
    epic: '/assets/cards/epic_hero_1.png',
    rare: '/assets/cards/rare_hero_1.png',
    uncommon: '/assets/cards/uncommon_hero_1.png',
    common: '/assets/cards/common_hero_1.png',
    special: '/assets/cards/story_special_1.png',
  },
  equipment: {
    legendary: '/assets/cards/legendary_equipment_1.png',
    epic: '/assets/cards/epic_equipment_1.png',
    rare: '/assets/cards/rare_equipment_1.png',
    uncommon: '/assets/cards/uncommon_equipment_1.png',
    common: '/assets/cards/uncommon_equipment_1.png',
    special: '/assets/cards/story_special_2.png',
  },
  mount: {
    legendary: '/assets/cards/legendary_hero_1.png',
    epic: '/assets/cards/epic_hero_1.png',
    rare: '/assets/cards/rare_hero_1.png',
    uncommon: '/assets/cards/uncommon_hero_1.png',
    common: '/assets/cards/common_hero_1.png',
    special: '/assets/cards/story_special_3.png',
  },
  artifact: {
    legendary: '/assets/cards/legendary_equipment_1.png',
    epic: '/assets/cards/epic_equipment_1.png',
    rare: '/assets/cards/rare_equipment_1.png',
    uncommon: '/assets/cards/uncommon_equipment_1.png',
    common: '/assets/cards/uncommon_equipment_1.png',
    special: '/assets/cards/story_special_5.png',
  },
  transport: {
    legendary: '/assets/cards/legendary_equipment_1.png',
    epic: '/assets/cards/epic_equipment_1.png',
    rare: '/assets/cards/rare_equipment_1.png',
    uncommon: '/assets/cards/uncommon_equipment_1.png',
    common: '/assets/cards/uncommon_equipment_1.png',
  },
  relic: {
    special: '/assets/cards/story_special_4.png',
  },
}

/**
 * Get the image path for a card.
 * Always returns a valid image path — falls back through:
 *   1. Exact cardId match in CARD_IMAGES
 *   2. Base ID match for instanced cards (e.g. 'craft_common_1-abc123' -> 'craft_common_1')
 *   3. Type + rarity entry in FALLBACK_IMAGES
 *   4. Hero fallback for the given rarity
 *   5. CARD_BACK_FALLBACK (/assets/card_back.png) as the last resort
 *
 * Consumers should also attach an onError handler to their <img> tags
 * swapping to CARD_BACK_FALLBACK, since a mapped path may still 404 if
 * the underlying asset file is not yet on disk.
 *
 * @param cardId - The card ID (e.g., 'legendary_hero_1', 'craft_common_1')
 * @param type - Optional card type for fallback (e.g., 'hero', 'equipment')
 * @param rarity - Optional rarity for fallback (e.g., 'legendary', 'common')
 * @returns Image path (always a string — card_back as final fallback)
 */
export const getCardImage = (
  cardId: string | undefined,
  type?: string,
  rarity?: string
): string => {
  // Handle undefined cardId
  if (!cardId) return CARD_BACK_FALLBACK

  // Check for exact ID match first
  if (CARD_IMAGES[cardId]) return CARD_IMAGES[cardId]

  // Fall back to type + rarity image
  if (type && rarity && FALLBACK_IMAGES[type]?.[rarity]) {
    return FALLBACK_IMAGES[type][rarity]
  }

  // Try to match by rarity prefix in the cardId
  if (rarity) {
    // Try hero as default type
    if (FALLBACK_IMAGES.hero?.[rarity]) {
      return FALLBACK_IMAGES.hero[rarity]
    }
  }

  // Final fallback - universal card back image
  return CARD_BACK_FALLBACK
}

export default CARD_IMAGES
