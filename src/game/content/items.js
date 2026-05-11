export const REWARD_POOL = [
  {
    id: "sun-splitter",
    name: "Sun Splitter",
    type: "weapon",
    rarity: "mythic",
    description: "A rifle-staff that chains bonus fire damage after a world conquest."
  },
  {
    id: "thorn-regalia",
    name: "Thorn Regalia",
    type: "outfit",
    rarity: "legendary",
    description: "A living armor set that heals when monsters adapt to your tactics."
  },
  {
    id: "glass-veil",
    name: "Glass Veil",
    type: "outfit",
    rarity: "epic",
    description: "Reduces burst damage while teleporting between worlds."
  },
  {
    id: "void-anchor",
    name: "Void Anchor",
    type: "weapon",
    rarity: "legendary",
    description: "Creates a gravity snare on perfect ability casts."
  },
  {
    id: "commander-mask",
    name: "Commander Mask",
    type: "outfit",
    rarity: "rare",
    description: "Increases leaderboard score from dungeon performance."
  },
  {
    id: "oath-pistol",
    name: "Oath Pistol",
    type: "weapon",
    rarity: "epic",
    description: "A sidearm that gains power while temporary allies survive."
  }
];

export const TACTICAL_ARTIFACTS = [
  {
    id: "seer-orb",
    name: "Seer Orb",
    role: "scout",
    maxCharges: 2,
    description: "Reveals nearby monsters and drops a tactical ping for the squad."
  },
  {
    id: "shield-totem",
    name: "Shield Totem",
    role: "defense",
    maxCharges: 1,
    description: "Creates a short protective ward that reduces monster and corruption damage."
  },
  {
    id: "rift-anchor",
    name: "Rift Anchor",
    role: "control",
    maxCharges: 1,
    description: "Slows nearby enemies and punishes monsters trying to rush the player."
  },
  {
    id: "monster-lure",
    name: "Monster Lure",
    role: "utility",
    maxCharges: 1,
    description: "Marks a lure point that draws nearby monsters away from the player."
  }
];

export const LOOT_KINDS = {
  potion: {
    name: "Aether Potion",
    description: "Auto-used when health is low, otherwise stored."
  },
  armor: {
    name: "Runic Armor",
    description: "Auto-equips when stronger than current armor."
  },
  crystal: {
    name: "Mana Crystal",
    description: "Restores mana and can recharge artifacts."
  },
  artifact: {
    name: "Tactical Artifact",
    description: "Adds or recharges a tactical artifact."
  }
};

export function rewardForConquest(worldIndex, scoreSeed = 0) {
  const index = Math.abs((worldIndex * 3 + scoreSeed) % REWARD_POOL.length);
  return REWARD_POOL[index];
}

export function artifactById(id) {
  return TACTICAL_ARTIFACTS.find((artifact) => artifact.id === id) || TACTICAL_ARTIFACTS[0];
}
