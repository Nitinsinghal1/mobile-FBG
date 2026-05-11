import { DEMON_KINGS, COMMANDERS, HEROES, SOLO_LEGENDS, NPC_ARCHETYPES } from "../../content/roster.js";

export const MAGIC_POWERS = [
  {
    id: "pyroclasm",
    name: "Pyroclasm",
    color: 0xe85d75,
    description: "Explosive fire magic that rewards direct pressure.",
    abilityName: "Meteor Step"
  },
  {
    id: "stormbind",
    name: "Stormbind",
    color: 0x83a9ff,
    description: "Lightning control for fast repositioning and chain attacks.",
    abilityName: "Thunder Snare"
  },
  {
    id: "verdant-oath",
    name: "Verdant Oath",
    color: 0x5ec6a8,
    description: "Nature magic that heals through conquest momentum.",
    abilityName: "Root Bloom"
  },
  {
    id: "voidmark",
    name: "Voidmark",
    color: 0x8d6cff,
    description: "Gravity magic for crowd control and survival.",
    abilityName: "Null Collapse"
  },
  {
    id: "sunveil",
    name: "Sunveil",
    color: 0xf4c15d,
    description: "Radiant shields and accurate burst damage.",
    abilityName: "Halo Break"
  }
];

export function hashText(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function selectMagicPower(codename, instinct = "strategist") {
  const seed = hashText(`${codename}:${instinct}`);
  const instinctBias = {
    aggressive: 0,
    protector: 2,
    hunter: 1,
    strategist: 3
  };
  const index = (seed + (instinctBias[instinct] || 0)) % MAGIC_POWERS.length;
  return { ...MAGIC_POWERS[index], seed };
}

export function assignNarrativeCast(profile) {
  const seed = hashText(`${profile.codename}:${profile.power.id}:${profile.mode}`);
  const commanderOffset = seed % COMMANDERS.length;
  const demonOffset = Math.floor(seed / 7) % DEMON_KINGS.length;
  const commanders = Array.from({ length: 15 }, (_, index) => COMMANDERS[(commanderOffset + index) % COMMANDERS.length]);
  const demonKings = Array.from({ length: 7 }, (_, index) => DEMON_KINGS[(demonOffset + index) % DEMON_KINGS.length]);
  const companions = profile.mode === "team" ? HEROES : SOLO_LEGENDS;
  return { commanders, demonKings, companions };
}

export function createAdaptiveMemory() {
  return {
    playerPrefersRange: 0,
    playerUsesAbility: 0,
    playerTeleportsOften: 0,
    monstersDefeated: 0,
    npcTrust: 35
  };
}

export function updateAdaptiveMemory(memory, event) {
  const next = { ...memory };
  if (event.type === "attack" && event.range > 240) next.playerPrefersRange += 1;
  if (event.type === "ability") next.playerUsesAbility += 1;
  if (event.type === "teleport") next.playerTeleportsOften += 1;
  if (event.type === "monster-defeated") next.monstersDefeated += 1;
  if (event.type === "story-choice") next.npcTrust += event.trustDelta || 0;
  next.npcTrust = Math.max(0, Math.min(100, next.npcTrust));
  return next;
}

export function chooseMonsterIntent(monster, state) {
  const memory = state.adaptiveMemory;
  const distanceToPlayer = Math.hypot(monster.x - state.player.x, monster.y - state.player.y);
  const learnedAggression = Math.min(0.45, memory.playerPrefersRange * 0.018 + memory.playerUsesAbility * 0.012);
  const injured = monster.hp / monster.maxHp < 0.35;
  if (injured && memory.monstersDefeated > 8) return "flank";
  if (distanceToPlayer > 360 && learnedAggression > 0.15) return "rush";
  if (memory.playerTeleportsOften > 3 && distanceToPlayer < 260) return "guard-gate";
  return monster.role === "tank" ? "pressure" : "stalk";
}

export function chooseNpcEvent(state) {
  const seed = hashText(`${state.profile.codename}:${state.story.choices.join("|")}:${state.stats.worldsConquered}`);
  const archetype = NPC_ARCHETYPES[seed % NPC_ARCHETYPES.length];
  if (state.adaptiveMemory.npcTrust > 70) {
    return `${archetype} offers a shortcut after remembering your mercy.`;
  }
  if (state.adaptiveMemory.npcTrust < 25) {
    return `${archetype} spreads a warning, making monsters more aggressive.`;
  }
  return `${archetype} watches your next decision before choosing a side.`;
}

export function storyChoicesForWorld(world) {
  return [
    {
      id: `${world.id}-mercy`,
      label: "Spare the defeated commander",
      effect: "NPC trust rises and a future betrayal becomes less likely.",
      trustDelta: 12,
      scoreDelta: 80
    },
    {
      id: `${world.id}-claim`,
      label: "Claim the dungeon core",
      effect: "Gain more reward score, but monsters learn faster.",
      trustDelta: -5,
      scoreDelta: 180
    },
    {
      id: `${world.id}-ally`,
      label: "Recruit a temporary mission ally",
      effect: "A helper joins the next world encounter.",
      trustDelta: 6,
      scoreDelta: 120,
      temporaryAlly: true
    }
  ];
}

export function possibleStoryBranches(decisionCount) {
  return Math.max(3, 3 ** Math.max(1, decisionCount));
}
