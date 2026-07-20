// ─────────────────────────────────────────────
// Crafting Recipes
// Note: stats use getCardStats — equipment/transport types return zeroed
// stats until those card types are re-introduced.
// ─────────────────────────────────────────────

import getCardStats from '../cards/stats'

export const CRAFTING = [
  // ─────────────────────────────────────────────
  // EQUIPMENT — MELEE
  // ─────────────────────────────────────────────
  {
    id: 'craft_equipment_melee_common',
    name: 'Rusted Iron Sword',
    type: 'equipment',
    class: 'melee',
    rarity: 'common',
    stats: getCardStats({ type: 'equipment', rarity: 'common' }),
    requirements: {
      shardCost: 1,
      catalystId: 'catalyst_common',
      materials: [
        { materialId: 'material_goblin_iron', quantity: 8 },
        { materialId: 'material_crude_leather', quantity: 5 },
      ],
      components: [
        { materialId: 'comp_melee_weapon_hilt', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_melee_uncommon',
    name: 'Goblin Forged Blade',
    type: 'equipment',
    class: 'melee',
    rarity: 'uncommon',
    stats: getCardStats({ type: 'equipment', rarity: 'uncommon' }),
    requirements: {
      shardCost: 2,
      catalystId: 'catalyst_uncommon',
      materials: [
        { materialId: 'material_goblin_iron', quantity: 12 },
        { materialId: 'material_crude_leather', quantity: 6 },
        { materialId: 'material_silk_thread', quantity: 4 },
      ],
      components: [
        { materialId: 'comp_melee_blade_core', quantity: 1 },
        { materialId: 'comp_melee_weapon_hilt', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_melee_rare',
    name: 'Soulbound Greatsword',
    type: 'equipment',
    class: 'melee',
    rarity: 'rare',
    stats: getCardStats({ type: 'equipment', rarity: 'rare' }),
    requirements: {
      shardCost: 4,
      catalystId: 'catalyst_rare',
      materials: [
        { materialId: 'material_soul_ash', quantity: 8 },
        { materialId: 'material_bone_rune', quantity: 6 },
        { materialId: 'material_goblin_iron', quantity: 10 },
      ],
      components: [
        { materialId: 'comp_melee_blade_core', quantity: 1 },
        { materialId: 'comp_melee_edge_reinforcement', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_melee_epic',
    name: 'Infernal Warblade',
    type: 'equipment',
    class: 'melee',
    rarity: 'epic',
    stats: getCardStats({ type: 'equipment', rarity: 'epic' }),
    requirements: {
      shardCost: 8,
      catalystId: 'catalyst_epic',
      materials: [
        { materialId: 'material_cinder_stone', quantity: 10 },
        { materialId: 'material_magma_core', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 10 },
        { materialId: 'material_frostwood', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_melee_blade_core', quantity: 1 },
        { materialId: 'comp_melee_edge_reinforcement', quantity: 1 },
        { materialId: 'comp_melee_blood_channel', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_melee_legendary',
    name: 'Dragonbone Executioner',
    type: 'equipment',
    class: 'melee',
    rarity: 'legendary',
    stats: getCardStats({ type: 'equipment', rarity: 'legendary' }),
    requirements: {
      shardCost: 16,
      catalystId: 'catalyst_legendary',
      materials: [
        { materialId: 'material_dragon_bone', quantity: 10 },
        { materialId: 'material_void_scale', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 12 },
        { materialId: 'material_cursed_steel', quantity: 8 },
        { materialId: 'material_frostwood', quantity: 8 },
      ],
      components: [
        { materialId: 'comp_melee_blade_core', quantity: 1 },
        { materialId: 'comp_melee_weapon_hilt', quantity: 1 },
        { materialId: 'comp_melee_edge_reinforcement', quantity: 1 },
        { materialId: 'comp_melee_blood_channel', quantity: 1 },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // EQUIPMENT — RANGE
  // ─────────────────────────────────────────────
  {
    id: 'craft_equipment_range_common',
    name: "Hunter's Shortbow",
    type: 'equipment',
    class: 'range',
    rarity: 'common',
    stats: getCardStats({ type: 'equipment', rarity: 'common' }),
    requirements: {
      shardCost: 1,
      catalystId: 'catalyst_common',
      materials: [
        { materialId: 'material_crude_leather', quantity: 6 },
        { materialId: 'material_silk_thread', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_range_bow_frame', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_range_uncommon',
    name: 'Silkthread Bow',
    type: 'equipment',
    class: 'range',
    rarity: 'uncommon',
    stats: getCardStats({ type: 'equipment', rarity: 'uncommon' }),
    requirements: {
      shardCost: 2,
      catalystId: 'catalyst_uncommon',
      materials: [
        { materialId: 'material_silk_thread', quantity: 10 },
        { materialId: 'material_chitin_plate', quantity: 5 },
        { materialId: 'material_crude_leather', quantity: 4 },
      ],
      components: [
        { materialId: 'comp_range_bow_frame', quantity: 1 },
        { materialId: 'comp_range_tension_string', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_range_rare',
    name: 'Froststeel Bow',
    type: 'equipment',
    class: 'range',
    rarity: 'rare',
    stats: getCardStats({ type: 'equipment', rarity: 'rare' }),
    requirements: {
      shardCost: 4,
      catalystId: 'catalyst_rare',
      materials: [
        { materialId: 'material_frostwood', quantity: 10 },
        { materialId: 'material_glacial_shard', quantity: 6 },
        { materialId: 'material_silk_thread', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_range_bow_frame', quantity: 1 },
        { materialId: 'comp_range_tension_string', quantity: 1 },
        { materialId: 'comp_range_precision_sight', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_range_epic',
    name: 'Shadowstrike Longbow',
    type: 'equipment',
    class: 'range',
    rarity: 'epic',
    stats: getCardStats({ type: 'equipment', rarity: 'epic' }),
    requirements: {
      shardCost: 8,
      catalystId: 'catalyst_epic',
      materials: [
        { materialId: 'material_ash_crystal', quantity: 8 },
        { materialId: 'material_charred_bone', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 8 },
        { materialId: 'material_frostwood', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_range_bow_frame', quantity: 1 },
        { materialId: 'comp_range_arrow_mechanism', quantity: 1 },
        { materialId: 'comp_range_precision_sight', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_range_legendary',
    name: 'Voidpiercer Bow',
    type: 'equipment',
    class: 'range',
    rarity: 'legendary',
    stats: getCardStats({ type: 'equipment', rarity: 'legendary' }),
    requirements: {
      shardCost: 16,
      catalystId: 'catalyst_legendary',
      materials: [
        { materialId: 'material_void_scale', quantity: 8 },
        { materialId: 'material_dragon_bone', quantity: 8 },
        { materialId: 'material_frostwood', quantity: 10 },
        { materialId: 'material_silk_thread', quantity: 10 },
        { materialId: 'material_demon_ichor', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_range_bow_frame', quantity: 1 },
        { materialId: 'comp_range_tension_string', quantity: 1 },
        { materialId: 'comp_range_arrow_mechanism', quantity: 1 },
        { materialId: 'comp_range_precision_sight', quantity: 1 },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // EQUIPMENT — MAGIC
  // ─────────────────────────────────────────────
  {
    id: 'craft_equipment_magic_common',
    name: 'Apprentice Wand',
    type: 'equipment',
    class: 'magic',
    rarity: 'common',
    stats: getCardStats({ type: 'equipment', rarity: 'common' }),
    requirements: {
      shardCost: 1,
      catalystId: 'catalyst_common',
      materials: [
        { materialId: 'material_soul_ash', quantity: 5 },
        { materialId: 'material_grave_cloth', quantity: 5 },
      ],
      components: [
        { materialId: 'comp_magic_arcane_focus', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_magic_uncommon',
    name: 'Bone Rune Staff',
    type: 'equipment',
    class: 'magic',
    rarity: 'uncommon',
    stats: getCardStats({ type: 'equipment', rarity: 'uncommon' }),
    requirements: {
      shardCost: 2,
      catalystId: 'catalyst_uncommon',
      materials: [
        { materialId: 'material_necro_dust', quantity: 8 },
        { materialId: 'material_bone_rune', quantity: 6 },
        { materialId: 'material_soul_ash', quantity: 4 },
      ],
      components: [
        { materialId: 'comp_magic_arcane_focus', quantity: 1 },
        { materialId: 'comp_magic_rune_core', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_magic_rare',
    name: 'Necromancer Staff',
    type: 'equipment',
    class: 'magic',
    rarity: 'rare',
    stats: getCardStats({ type: 'equipment', rarity: 'rare' }),
    requirements: {
      shardCost: 4,
      catalystId: 'catalyst_rare',
      materials: [
        { materialId: 'material_necro_dust', quantity: 10 },
        { materialId: 'material_bone_rune', quantity: 8 },
        { materialId: 'material_frostwood', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_magic_arcane_focus', quantity: 1 },
        { materialId: 'comp_magic_rune_core', quantity: 1 },
        { materialId: 'comp_magic_mana_conduit', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_magic_epic',
    name: 'Ashen Arcane Staff',
    type: 'equipment',
    class: 'magic',
    rarity: 'epic',
    stats: getCardStats({ type: 'equipment', rarity: 'epic' }),
    requirements: {
      shardCost: 8,
      catalystId: 'catalyst_epic',
      materials: [
        { materialId: 'material_ash_crystal', quantity: 10 },
        { materialId: 'material_charred_bone', quantity: 8 },
        { materialId: 'material_necro_dust', quantity: 8 },
      ],
      components: [
        { materialId: 'comp_magic_arcane_focus', quantity: 1 },
        { materialId: 'comp_magic_mana_conduit', quantity: 1 },
        { materialId: 'comp_magic_spell_channeler', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_magic_legendary',
    name: 'Dragon Soul Catalyst Staff',
    type: 'equipment',
    class: 'magic',
    rarity: 'legendary',
    stats: getCardStats({ type: 'equipment', rarity: 'legendary' }),
    requirements: {
      shardCost: 16,
      catalystId: 'catalyst_legendary',
      materials: [
        { materialId: 'material_dragon_bone', quantity: 8 },
        { materialId: 'material_void_scale', quantity: 8 },
        { materialId: 'material_demon_ichor', quantity: 8 },
        { materialId: 'material_bone_rune', quantity: 10 },
      ],
      components: [
        { materialId: 'comp_magic_arcane_focus', quantity: 1 },
        { materialId: 'comp_magic_mana_conduit', quantity: 1 },
        { materialId: 'comp_magic_rune_core', quantity: 1 },
        { materialId: 'comp_magic_spell_channeler', quantity: 1 },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // EQUIPMENT — DEFENSE
  // ─────────────────────────────────────────────
  {
    id: 'craft_equipment_defense_common',
    name: 'Leather Guard Armor',
    type: 'equipment',
    class: 'defense',
    rarity: 'common',
    stats: getCardStats({ type: 'equipment', rarity: 'common' }),
    requirements: {
      shardCost: 1,
      catalystId: 'catalyst_common',
      materials: [
        { materialId: 'material_crude_leather', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 5 },
      ],
      components: [
        { materialId: 'comp_defense_armor_plating', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_defense_uncommon',
    name: 'Reinforced Bone Armor',
    type: 'equipment',
    class: 'defense',
    rarity: 'uncommon',
    stats: getCardStats({ type: 'equipment', rarity: 'uncommon' }),
    requirements: {
      shardCost: 2,
      catalystId: 'catalyst_uncommon',
      materials: [
        { materialId: 'material_grave_cloth', quantity: 8 },
        { materialId: 'material_bone_rune', quantity: 5 },
        { materialId: 'material_crude_leather', quantity: 5 },
      ],
      components: [
        { materialId: 'comp_defense_armor_plating', quantity: 1 },
        { materialId: 'comp_defense_reinforced_core', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_defense_rare',
    name: 'Froststeel Shield',
    type: 'equipment',
    class: 'defense',
    rarity: 'rare',
    stats: getCardStats({ type: 'equipment', rarity: 'rare' }),
    requirements: {
      shardCost: 4,
      catalystId: 'catalyst_rare',
      materials: [
        { materialId: 'material_frostwood', quantity: 8 },
        { materialId: 'material_glacial_shard', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 8 },
      ],
      components: [
        { materialId: 'comp_defense_shield_frame', quantity: 1 },
        { materialId: 'comp_defense_reinforced_core', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_defense_epic',
    name: 'Emberguard Plate',
    type: 'equipment',
    class: 'defense',
    rarity: 'epic',
    stats: getCardStats({ type: 'equipment', rarity: 'epic' }),
    requirements: {
      shardCost: 8,
      catalystId: 'catalyst_epic',
      materials: [
        { materialId: 'material_cinder_stone', quantity: 10 },
        { materialId: 'material_magma_core', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 8 },
        { materialId: 'material_crude_leather', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_defense_armor_plating', quantity: 1 },
        { materialId: 'comp_defense_reinforced_core', quantity: 1 },
        { materialId: 'comp_defense_impact_dampener', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_equipment_defense_legendary',
    name: 'Voidforged Aegis',
    type: 'equipment',
    class: 'defense',
    rarity: 'legendary',
    stats: getCardStats({ type: 'equipment', rarity: 'legendary' }),
    requirements: {
      shardCost: 16,
      catalystId: 'catalyst_legendary',
      materials: [
        { materialId: 'material_void_scale', quantity: 8 },
        { materialId: 'material_cursed_steel', quantity: 10 },
        { materialId: 'material_frostwood', quantity: 8 },
        { materialId: 'material_ash_crystal', quantity: 8 },
      ],
      components: [
        { materialId: 'comp_defense_armor_plating', quantity: 1 },
        { materialId: 'comp_defense_reinforced_core', quantity: 1 },
        { materialId: 'comp_defense_shield_frame', quantity: 1 },
        { materialId: 'comp_defense_impact_dampener', quantity: 1 },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // TRANSPORT — MERCHANT
  // ─────────────────────────────────────────────
  {
    id: 'craft_transport_merchant_common',
    name: 'Wooden Trade Cart',
    type: 'transport',
    class: 'merchant',
    rarity: 'common',
    stats: getCardStats({ type: 'transport', rarity: 'common' }),
    requirements: {
      shardCost: 1,
      catalystId: 'catalyst_common',
      materials: [
        { materialId: 'material_crude_leather', quantity: 6 },
        { materialId: 'material_goblin_iron', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_merchant_wagon_frame', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_merchant_uncommon',
    name: 'Reinforced Trade Wagon',
    type: 'transport',
    class: 'merchant',
    rarity: 'uncommon',
    stats: getCardStats({ type: 'transport', rarity: 'uncommon' }),
    requirements: {
      shardCost: 2,
      catalystId: 'catalyst_uncommon',
      materials: [
        { materialId: 'material_crude_leather', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 5 },
      ],
      components: [
        { materialId: 'comp_merchant_wagon_frame', quantity: 1 },
        { materialId: 'comp_merchant_storage_system', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_merchant_rare',
    name: 'Merchant Caravan',
    type: 'transport',
    class: 'merchant',
    rarity: 'rare',
    stats: getCardStats({ type: 'transport', rarity: 'rare' }),
    requirements: {
      shardCost: 4,
      catalystId: 'catalyst_rare',
      materials: [
        { materialId: 'material_frostwood', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 8 },
      ],
      components: [
        { materialId: 'comp_merchant_wagon_frame', quantity: 1 },
        { materialId: 'comp_merchant_storage_system', quantity: 1 },
        { materialId: 'comp_merchant_protection_seal', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_merchant_epic',
    name: 'Golden Trade Convoy',
    type: 'transport',
    class: 'merchant',
    rarity: 'epic',
    stats: getCardStats({ type: 'transport', rarity: 'epic' }),
    requirements: {
      shardCost: 8,
      catalystId: 'catalyst_epic',
      materials: [
        { materialId: 'material_cinder_stone', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 10 },
        { materialId: 'material_silk_thread', quantity: 10 },
        { materialId: 'material_frostwood', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_merchant_wagon_frame', quantity: 1 },
        { materialId: 'comp_merchant_storage_system', quantity: 1 },
        { materialId: 'comp_merchant_protection_seal', quantity: 1 },
        { materialId: 'comp_merchant_gold_chamber', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_merchant_legendary',
    name: 'Dragon Trade Caravan',
    type: 'transport',
    class: 'merchant',
    rarity: 'legendary',
    stats: getCardStats({ type: 'transport', rarity: 'legendary' }),
    requirements: {
      shardCost: 16,
      catalystId: 'catalyst_legendary',
      materials: [
        { materialId: 'material_dragon_bone', quantity: 8 },
        { materialId: 'material_void_scale', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 12 },
        { materialId: 'material_cinder_stone', quantity: 8 },
        { materialId: 'material_cursed_steel', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_merchant_wagon_frame', quantity: 1 },
        { materialId: 'comp_merchant_storage_system', quantity: 1 },
        { materialId: 'comp_merchant_protection_seal', quantity: 1 },
        { materialId: 'comp_merchant_gold_chamber', quantity: 1 },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // TRANSPORT — MILITARY
  // ─────────────────────────────────────────────
  {
    id: 'craft_transport_military_common',
    name: 'Supply War Cart',
    type: 'transport',
    class: 'military',
    rarity: 'common',
    stats: getCardStats({ type: 'transport', rarity: 'common' }),
    requirements: {
      shardCost: 1,
      catalystId: 'catalyst_common',
      materials: [
        { materialId: 'material_crude_leather', quantity: 6 },
        { materialId: 'material_goblin_iron', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_military_transport_frame', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_military_uncommon',
    name: 'Reinforced War Wagon',
    type: 'transport',
    class: 'military',
    rarity: 'uncommon',
    stats: getCardStats({ type: 'transport', rarity: 'uncommon' }),
    requirements: {
      shardCost: 2,
      catalystId: 'catalyst_uncommon',
      materials: [
        { materialId: 'material_goblin_iron', quantity: 10 },
        { materialId: 'material_crude_leather', quantity: 8 },
        { materialId: 'material_bone_rune', quantity: 5 },
      ],
      components: [
        { materialId: 'comp_military_transport_frame', quantity: 1 },
        { materialId: 'comp_military_armor_plating', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_military_rare',
    name: 'Siege Transport',
    type: 'transport',
    class: 'military',
    rarity: 'rare',
    stats: getCardStats({ type: 'transport', rarity: 'rare' }),
    requirements: {
      shardCost: 4,
      catalystId: 'catalyst_rare',
      materials: [
        { materialId: 'material_goblin_iron', quantity: 12 },
        { materialId: 'material_bone_rune', quantity: 8 },
        { materialId: 'material_frostwood', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_military_transport_frame', quantity: 1 },
        { materialId: 'comp_military_armor_plating', quantity: 1 },
        { materialId: 'comp_military_weapons_mount', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_military_epic',
    name: 'Ember War Chariot',
    type: 'transport',
    class: 'military',
    rarity: 'epic',
    stats: getCardStats({ type: 'transport', rarity: 'epic' }),
    requirements: {
      shardCost: 8,
      catalystId: 'catalyst_epic',
      materials: [
        { materialId: 'material_cinder_stone', quantity: 10 },
        { materialId: 'material_magma_core', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 10 },
        { materialId: 'material_charred_bone', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_military_transport_frame', quantity: 1 },
        { materialId: 'comp_military_armor_plating', quantity: 1 },
        { materialId: 'comp_military_weapons_mount', quantity: 1 },
        { materialId: 'comp_military_siege_platform', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_military_legendary',
    name: 'Demon Siege Engine',
    type: 'transport',
    class: 'military',
    rarity: 'legendary',
    stats: getCardStats({ type: 'transport', rarity: 'legendary' }),
    requirements: {
      shardCost: 16,
      catalystId: 'catalyst_legendary',
      materials: [
        { materialId: 'material_demon_ichor', quantity: 8 },
        { materialId: 'material_void_scale', quantity: 8 },
        { materialId: 'material_dragon_bone', quantity: 8 },
        { materialId: 'material_cursed_steel', quantity: 10 },
        { materialId: 'material_magma_core', quantity: 8 },
      ],
      components: [
        { materialId: 'comp_military_transport_frame', quantity: 1 },
        { materialId: 'comp_military_armor_plating', quantity: 1 },
        { materialId: 'comp_military_weapons_mount', quantity: 1 },
        { materialId: 'comp_military_siege_platform', quantity: 1 },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // TRANSPORT — LUXURY
  // ─────────────────────────────────────────────
  {
    id: 'craft_transport_luxury_common',
    name: 'Noble Carriage',
    type: 'transport',
    class: 'luxury',
    rarity: 'common',
    stats: getCardStats({ type: 'transport', rarity: 'common' }),
    requirements: {
      shardCost: 1,
      catalystId: 'catalyst_common',
      materials: [
        { materialId: 'material_crude_leather', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 5 },
      ],
      components: [
        { materialId: 'comp_luxury_carriage_frame', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_luxury_uncommon',
    name: 'Silk Caravan',
    type: 'transport',
    class: 'luxury',
    rarity: 'uncommon',
    stats: getCardStats({ type: 'transport', rarity: 'uncommon' }),
    requirements: {
      shardCost: 2,
      catalystId: 'catalyst_uncommon',
      materials: [
        { materialId: 'material_crude_leather', quantity: 10 },
        { materialId: 'material_silk_thread', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 4 },
      ],
      components: [
        { materialId: 'comp_luxury_carriage_frame', quantity: 1 },
        { materialId: 'comp_luxury_upholstery_system', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_luxury_rare',
    name: 'Royal Carriage',
    type: 'transport',
    class: 'luxury',
    rarity: 'rare',
    stats: getCardStats({ type: 'transport', rarity: 'rare' }),
    requirements: {
      shardCost: 4,
      catalystId: 'catalyst_rare',
      materials: [
        { materialId: 'material_frostwood', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 10 },
        { materialId: 'material_bone_rune', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_luxury_carriage_frame', quantity: 1 },
        { materialId: 'comp_luxury_upholstery_system', quantity: 1 },
        { materialId: 'comp_luxury_aesthetic_trim', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_luxury_epic',
    name: 'Phoenix Carriage',
    type: 'transport',
    class: 'luxury',
    rarity: 'epic',
    stats: getCardStats({ type: 'transport', rarity: 'epic' }),
    requirements: {
      shardCost: 8,
      catalystId: 'catalyst_epic',
      materials: [
        { materialId: 'material_cinder_stone', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 12 },
        { materialId: 'material_ash_crystal', quantity: 8 },
        { materialId: 'material_frostwood', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_luxury_carriage_frame', quantity: 1 },
        { materialId: 'comp_luxury_upholstery_system', quantity: 1 },
        { materialId: 'comp_luxury_aesthetic_trim', quantity: 1 },
        { materialId: 'comp_luxury_enchanted_suspension', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_luxury_legendary',
    name: 'Celestial Royal Convoy',
    type: 'transport',
    class: 'luxury',
    rarity: 'legendary',
    stats: getCardStats({ type: 'transport', rarity: 'legendary' }),
    requirements: {
      shardCost: 16,
      catalystId: 'catalyst_legendary',
      materials: [
        { materialId: 'material_dragon_bone', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 14 },
        { materialId: 'material_void_scale', quantity: 8 },
        { materialId: 'material_ash_crystal', quantity: 8 },
        { materialId: 'material_soul_ash', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_luxury_carriage_frame', quantity: 1 },
        { materialId: 'comp_luxury_upholstery_system', quantity: 1 },
        { materialId: 'comp_luxury_aesthetic_trim', quantity: 1 },
        { materialId: 'comp_luxury_enchanted_suspension', quantity: 1 },
      ],
    },
  },

  // ─────────────────────────────────────────────
  // TRANSPORT — PRESTIGE
  // ─────────────────────────────────────────────
  {
    id: 'craft_transport_prestige_common',
    name: 'Courier Cart',
    type: 'transport',
    class: 'prestige',
    rarity: 'common',
    stats: getCardStats({ type: 'transport', rarity: 'common' }),
    requirements: {
      shardCost: 1,
      catalystId: 'catalyst_common',
      materials: [
        { materialId: 'material_crude_leather', quantity: 6 },
        { materialId: 'material_goblin_iron', quantity: 5 },
      ],
      components: [
        { materialId: 'comp_prestige_courier_frame', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_prestige_uncommon',
    name: 'Elite Delivery Wagon',
    type: 'transport',
    class: 'prestige',
    rarity: 'uncommon',
    stats: getCardStats({ type: 'transport', rarity: 'uncommon' }),
    requirements: {
      shardCost: 2,
      catalystId: 'catalyst_uncommon',
      materials: [
        { materialId: 'material_crude_leather', quantity: 8 },
        { materialId: 'material_goblin_iron', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_prestige_courier_frame', quantity: 1 },
        { materialId: 'comp_prestige_speed_system', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_prestige_rare',
    name: 'Shadow Courier',
    type: 'transport',
    class: 'prestige',
    rarity: 'rare',
    stats: getCardStats({ type: 'transport', rarity: 'rare' }),
    requirements: {
      shardCost: 4,
      catalystId: 'catalyst_rare',
      materials: [
        { materialId: 'material_frostwood', quantity: 8 },
        { materialId: 'material_bone_rune', quantity: 6 },
        { materialId: 'material_silk_thread', quantity: 8 },
      ],
      components: [
        { materialId: 'comp_prestige_courier_frame', quantity: 1 },
        { materialId: 'comp_prestige_speed_system', quantity: 1 },
        { materialId: 'comp_prestige_stealth_coating', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_prestige_epic',
    name: 'Phantom Transport',
    type: 'transport',
    class: 'prestige',
    rarity: 'epic',
    stats: getCardStats({ type: 'transport', rarity: 'epic' }),
    requirements: {
      shardCost: 8,
      catalystId: 'catalyst_epic',
      materials: [
        { materialId: 'material_ash_crystal', quantity: 8 },
        { materialId: 'material_charred_bone', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 10 },
        { materialId: 'material_frostwood', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_prestige_courier_frame', quantity: 1 },
        { materialId: 'comp_prestige_speed_system', quantity: 1 },
        { materialId: 'comp_prestige_stealth_coating', quantity: 1 },
        { materialId: 'comp_prestige_phantom_drive', quantity: 1 },
      ],
    },
  },
  {
    id: 'craft_transport_prestige_legendary',
    name: 'Void Merchant Cart',
    type: 'transport',
    class: 'prestige',
    rarity: 'legendary',
    stats: getCardStats({ type: 'transport', rarity: 'legendary' }),
    requirements: {
      shardCost: 16,
      catalystId: 'catalyst_legendary',
      materials: [
        { materialId: 'material_void_scale', quantity: 8 },
        { materialId: 'material_demon_ichor', quantity: 8 },
        { materialId: 'material_silk_thread', quantity: 12 },
        { materialId: 'material_ash_crystal', quantity: 8 },
        { materialId: 'material_cursed_steel', quantity: 6 },
      ],
      components: [
        { materialId: 'comp_prestige_courier_frame', quantity: 1 },
        { materialId: 'comp_prestige_speed_system', quantity: 1 },
        { materialId: 'comp_prestige_stealth_coating', quantity: 1 },
        { materialId: 'comp_prestige_phantom_drive', quantity: 1 },
      ],
    },
  },
]
