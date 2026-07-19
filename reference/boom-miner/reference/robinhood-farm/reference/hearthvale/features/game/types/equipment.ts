/**
 * Equipment / gear system.
 * Each slot can hold an item with a set of combat/utility attributes.
 * "engineering" from the original schema is replaced with "mining"
 * and "ship" slot is replaced with "mount".
 */

export type EquipmentAttributes = {
  dodge:   number;
  damage:  number;
  defense: number;
  mining:  number;
  crit:    number;
  luck:    number;
};

export type EquipmentSlotName = "avatar" | "weapon" | "armor" | "mount" | "accessory";

export type EquipmentSlot = {
  item_number: number | null;
  item_id:     string | null;
  item_equipped: boolean;
  attributes:  EquipmentAttributes;
};

export type PlayerEquipment = Record<EquipmentSlotName, EquipmentSlot>;

export const EMPTY_ATTRIBUTES: EquipmentAttributes = {
  dodge:   0,
  damage:  0,
  defense: 0,
  mining:  0,
  crit:    0,
  luck:    0,
};

/** Player's root (base) stats — modified by level-ups, quests, etc. */
export const INITIAL_BASE_STATS: EquipmentAttributes = {
  damage:  5,
  defense: 5,
  crit:    1,
  dodge:   1,
  luck:    1,
  mining:  1,
};

/**
 * Derive the final `stats` object by summing base stats with every equipped
 * slot's attributes. Only slots where `item_equipped === true` contribute.
 */
export function computeStats(
  base: EquipmentAttributes,
  equipment: PlayerEquipment,
): EquipmentAttributes {
  const keys = Object.keys(base) as Array<keyof EquipmentAttributes>;
  const result = { ...base };

  for (const slot of Object.values(equipment)) {
    if (!slot.item_equipped) continue;
    for (const key of keys) {
      result[key] = (result[key] ?? 0) + (slot.attributes[key] ?? 0);
    }
  }

  return result;
}

const emptySlot = (): EquipmentSlot => ({
  item_number:   null,
  item_id:       null,
  item_equipped: false,
  attributes:    { ...EMPTY_ATTRIBUTES },
});

export const INITIAL_EQUIPMENT: PlayerEquipment = {
  avatar:  emptySlot(),
  weapon:  emptySlot(),
  armor:   emptySlot(),
  mount:   emptySlot(),
  accessory: emptySlot(),
};
