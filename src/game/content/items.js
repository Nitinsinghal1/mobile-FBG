export const REWARD_POOL = [
  {
    id: "sun-splitter",
    name: "Sun Splitter",
    type: "weapon",
    rarity: "mythic",
    description: "A rifle-staff that chains bonus fire damage after a world conquest.",
    stats: { damageMult: 1.35, attackSpeed: 1.1, manaRegen: 0.08 },
    effect: "Gain +12% damage for 8s after world conquest"
  },
  {
    id: "thorn-regalia",
    name: "Thorn Regalia",
    type: "outfit",
    rarity: "legendary",
    description: "A living armor set that heals when monsters adapt to your tactics.",
    stats: { armor: 18, hpRegen: 0.15, maxHp: 25 },
    effect: "Restore 3% HP when monster adapts to your strategy"
  },
  {
    id: "glass-veil",
    name: "Glass Veil",
    type: "outfit",
    rarity: "epic",
    description: "Reduces burst damage while teleporting between worlds.",
    stats: { armor: 12, burstReduction: 0.25, teleportCooldown: -0.2 },
    effect: "Reduce next 15s burst damage by 25% after teleport"
  },
  {
    id: "void-anchor",
    name: "Void Anchor",
    type: "weapon",
    rarity: "legendary",
    description: "Creates a gravity snare on perfect ability casts.",
    stats: { damageMult: 1.28, abilityPower: 1.15, cooldownReduction: -0.1 },
    effect: "Perfect ability cast creates 3s slow field (50% movement penalty)"
  },
  {
    id: "commander-mask",
    name: "Commander Mask",
    type: "outfit",
    rarity: "rare",
    description: "Increases leaderboard score from dungeon performance.",
    stats: { armor: 8, scoreBonus: 1.15, dungeonRewardBonus: 0.25 },
    effect: "+15% leaderboard score, +25% dungeon rewards"
  },
  {
    id: "oath-pistol",
    name: "Oath Pistol",
    type: "weapon",
    rarity: "epic",
    description: "A sidearm that gains power while temporary allies survive.",
    stats: { damageMult: 1.18, allyDamageBonus: 0.2, accuracy: 0.95 },
    effect: "+20% damage per active temporary ally"
  }
];

export const TACTICAL_ARTIFACTS = [
  {
    id: "seer-orb",
    name: "Seer Orb",
    type: "artifact",
    role: "scout",
    rarity: "rare",
    maxCharges: 2,
    description: "Reveals nearby monsters and drops a tactical ping for the squad.",
    effect: "Reveal 320px radius, team ping placed"
  },
  {
    id: "shield-totem",
    name: "Shield Totem",
    type: "artifact",
    role: "defense",
    rarity: "rare",
    maxCharges: 1,
    description: "Creates a short protective ward that reduces monster and corruption damage.",
    effect: "-40% damage for 6s, affects squad in 160px radius"
  },
  {
    id: "rift-anchor",
    name: "Rift Anchor",
    type: "artifact",
    role: "control",
    rarity: "uncommon",
    maxCharges: 1,
    description: "Slows nearby enemies and punishes monsters trying to rush the player.",
    effect: "Slow 50% + 140% damage return on melee hits for 5s"
  },
  {
    id: "monster-lure",
    name: "Monster Lure",
    type: "artifact",
    role: "utility",
    rarity: "uncommon",
    maxCharges: 1,
    description: "Marks a lure point that draws nearby monsters away from the player.",
    effect: "Divert monsters in 280px radius for 8s"
  }
];

export const LOOT_KINDS = {
  potion: {
    id: "aether-potion",
    type: "consumable",
    name: "Aether Potion",
    rarity: "common",
    description: "Auto-used when health is low, otherwise stored. Restores 40% health.",
    healing: 0.4,
    stackable: true
  },
  armor: {
    id: "runic-armor",
    type: "armor",
    name: "Runic Armor",
    rarity: "uncommon",
    description: "Auto-equips when stronger than current armor. Provides protection.",
    stats: { armor: 8 },
    stackable: false
  },
  crystal: {
    id: "mana-crystal",
    type: "crafting",
    name: "Mana Crystal",
    rarity: "uncommon",
    description: "Restores mana and can recharge artifacts. Restores 30% mana.",
    manaRestore: 0.3,
    stackable: true
  },
  artifact: {
    id: "tactical-artifact",
    type: "artifact",
    name: "Tactical Artifact",
    rarity: "rare",
    description: "Adds or recharges a tactical artifact.",
    stackable: false
  }
};

export const ARMOR_TIERS = [
  {
    id: "tattered-robes",
    name: "Tattered Robes",
    type: "armor",
    rarity: "common",
    armorValue: 4,
    description: "Basic starting protection."
  },
  {
    id: "reinforced-hide",
    name: "Reinforced Hide",
    type: "armor",
    rarity: "uncommon",
    armorValue: 8,
    description: "Monster-dropped leather with reinforced seams."
  },
  {
    id: "enchanted-mail",
    name: "Enchanted Mail",
    type: "armor",
    rarity: "rare",
    armorValue: 14,
    description: "Warded chain mail from a commander's treasury."
  },
  {
    id: "crystalline-plate",
    name: "Crystalline Plate",
    type: "armor",
    rarity: "epic",
    armorValue: 22,
    description: "Hardened with world corruption, highly resistant."
  },
  {
    id: "obsidian-aegis",
    name: "Obsidian Aegis",
    type: "armor",
    rarity: "legendary",
    armorValue: 32,
    description: "Forged from demon king remains, nearly unbreakable."
  }
];

export function rewardForConquest(worldIndex, scoreSeed = 0) {
  const index = Math.abs((worldIndex * 3 + scoreSeed) % REWARD_POOL.length);
  return REWARD_POOL[index];
}

export const INVENTORY_CONFIG = {
  maxSlots: 24,
  equipmentSlots: {
    weapon: 1,
    outfit: 1,
    accessory: 2
  },
  stackLimit: {
    potion: 8,
    crystal: 6,
    artifact: 4
  }
};

export const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export function getRarityColor(rarity) {
  const colors = {
    common: "#a0a0a0",
    uncommon: "#4caf50",
    rare: "#2196f3",
    epic: "#9c27b0",
    legendary: "#ff9800",
    mythic: "#ffc107"
  };
  return colors[rarity] || "#a0a0a0";
}

export function artifactById(id) {
  return TACTICAL_ARTIFACTS.find((artifact) => artifact.id === id) || TACTICAL_ARTIFACTS[0];
}
