// ═══════════════════════════════════════════════════════════════════════════
// EPIC HEROES (2)
// ═══════════════════════════════════════════════════════════════════════════

export const EPIC_HEROES = [
  {
    id: 'epic_hero_1',
    name: 'Nyx Shadowblade',
    description: 'A master rogue of Ember City who strikes demon commanders from the shadows.',
    type: 'hero',
    class: 'rogue',
    rarity: 'epic',
    spriteKey: 'hero_rogue_epic_01',
    supply: { max: 1000, minted: 0 },
    source: { type: 'standard_pack' },
  },
  {
    id: 'epic_hero_2',
    name: 'Arcanis Crystal Sage',
    description: 'A Sunspire mage who commands crystallized arcane energy against the undead.',
    type: 'hero',
    class: 'mage',
    rarity: 'epic',
    spriteKey: 'hero_mage_epic_01',
    supply: { max: 1000, minted: 0 },
    source: { type: 'standard_pack' },
  },
]

export default EPIC_HEROES
