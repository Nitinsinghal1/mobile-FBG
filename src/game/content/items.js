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

export function rewardForConquest(worldIndex, scoreSeed = 0) {
  const index = Math.abs((worldIndex * 3 + scoreSeed) % REWARD_POOL.length);
  return REWARD_POOL[index];
}
