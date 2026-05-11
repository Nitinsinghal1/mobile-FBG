import { artifactById, TACTICAL_ARTIFACTS } from "../../content/items.js";
import { WORLD_SIZE, getWorld } from "../../content/worlds.js";

const ZONE_INTERVAL = 28000;
const ZONE_MIN_RADIUS = 280;
const ZONE_DAMAGE_PER_SECOND = 5.5;
const AUTO_LOOT_RADIUS = 82;
const SHRINE_RADIUS = 96;
const PING_LIFE = 10000;

const PING_TYPES = {
  enemy: { label: "Enemy", text: "Enemy contact" },
  monster: { label: "Monster", text: "Monster pack" },
  dungeon: { label: "Dungeon", text: "Dungeon objective" },
  teleport: { label: "Teleport", text: "Teleport gate" },
  heal: { label: "Need heal", text: "Need healing" },
  retreat: { label: "Retreat", text: "Fall back" },
  attack: { label: "Attack", text: "Push now" }
};

export function createSurvivalState(worldId) {
  return {
    supplies: {
      armorLevel: 1,
      potions: 1,
      crystals: 0
    },
    artifacts: [
      createArtifact("seer-orb", 2),
      createArtifact("shield-totem", 1)
    ],
    loot: [],
    zone: createCorruptionZone(worldId),
    reviveShrines: createReviveShrines(worldId),
    pings: [],
    survival: {
      autoLooted: 0,
      zoneDamageTaken: 0,
      recallsUsed: 0,
      shieldUntil: 0,
      lure: null
    }
  };
}

export function hydrateSurvivalState(state) {
  const worldId = state.currentWorldId || "ember";
  state.supplies ||= createSurvivalState(worldId).supplies;
  state.artifacts ||= createSurvivalState(worldId).artifacts;
  state.loot ||= [];
  state.zone ||= createCorruptionZone(worldId);
  state.reviveShrines ||= createReviveShrines(worldId);
  state.pings ||= [];
  state.survival ||= {
    autoLooted: 0,
    zoneDamageTaken: 0,
    recallsUsed: 0,
    shieldUntil: 0,
    lure: null
  };
  state.stats.pings ||= 0;
  state.stats.artifactsUsed ||= 0;
  state.stats.survivalMs ||= 0;
  return state;
}

export function createCorruptionZone(worldId) {
  const worldIndex = ["ember", "verdant", "frost", "void"].indexOf(worldId);
  const offset = Math.max(0, worldIndex);
  return {
    x: WORLD_SIZE.width * (0.46 + offset * 0.035),
    y: WORLD_SIZE.height * (0.48 - offset * 0.04),
    radius: 1080,
    minRadius: ZONE_MIN_RADIUS,
    stage: 1,
    nextShrinkAt: ZONE_INTERVAL,
    damagePerSecond: ZONE_DAMAGE_PER_SECOND + offset,
    label: `${getWorld(worldId).shortName} corruption`
  };
}

export function createReviveShrines(worldId) {
  const offset = Math.max(0, ["ember", "verdant", "frost", "void"].indexOf(worldId));
  return [
    {
      id: `${worldId}-shrine-north`,
      x: WORLD_SIZE.width * 0.22,
      y: WORLD_SIZE.height * (0.24 + offset * 0.04),
      active: true,
      cooldownUntil: 0
    },
    {
      id: `${worldId}-shrine-south`,
      x: WORLD_SIZE.width * 0.78,
      y: WORLD_SIZE.height * (0.78 - offset * 0.035),
      active: true,
      cooldownUntil: 0
    }
  ];
}

export function resetWorldSurvival(state, worldId) {
  const next = structuredClone(state);
  next.zone = createCorruptionZone(worldId);
  next.zone.nextShrinkAt = next.time + ZONE_INTERVAL;
  next.reviveShrines = createReviveShrines(worldId);
  next.loot = [];
  next.pings = next.pings.filter((ping) => ping.kind === "system").slice(0, 3);
  next.survival.lure = null;
  return next;
}

export function createLootDrop(monster, state) {
  const seed = Math.abs(hashText(`${monster.id}:${monster.kind}:${state.stats.monstersDefeated}`));
  const roll = seed % 100;
  const base = {
    id: `loot-${monster.id}`,
    x: monster.x,
    y: monster.y,
    createdAt: state.time,
    picked: false
  };
  if (monster.isCommander || monster.isDemonKing) {
    const artifact = TACTICAL_ARTIFACTS[(seed >> 2) % TACTICAL_ARTIFACTS.length];
    return { ...base, kind: "artifact", artifactId: artifact.id, rarity: monster.isDemonKing ? "mythic" : "epic" };
  }
  if (roll < 36) return { ...base, kind: "potion", amount: 1, rarity: "common" };
  if (roll < 62) return { ...base, kind: "crystal", amount: 1, rarity: "common" };
  if (roll < 82) return { ...base, kind: "armor", armorLevel: 2 + (seed % 2), rarity: "rare" };
  const artifact = TACTICAL_ARTIFACTS[seed % TACTICAL_ARTIFACTS.length];
  return { ...base, kind: "artifact", artifactId: artifact.id, rarity: "rare" };
}

export function updateSurvivalSystems(state, deltaMs) {
  let next = structuredClone(state);
  if (!next.player.alive) return next;
  next.stats.survivalMs += deltaMs;
  next.pings = next.pings.map((ping) => ({ ...ping, life: ping.life - deltaMs })).filter((ping) => ping.life > 0);
  next.reviveShrines = next.reviveShrines.map((shrine) => ({
    ...shrine,
    active: !shrine.cooldownUntil || shrine.cooldownUntil <= next.time
  }));

  if (!next.player.spawnProtected) {
    next = updateCorruptionZone(next, deltaMs);
  }
  next = resolveAutoLoot(next);
  return next;
}

export function calculateIncomingDamage(state, rawDamage) {
  const armorReduction = [0, 0.08, 0.16, 0.24][state.supplies?.armorLevel || 0] || 0;
  const shieldReduction = state.survival?.shieldUntil > state.time ? 0.42 : 0;
  return Math.max(1, rawDamage * (1 - armorReduction - shieldReduction));
}

export function useArtifact(state, artifactId) {
  const next = structuredClone(state);
  const artifact = next.artifacts.find((item) => item.id === artifactId);
  if (!artifact || artifact.charges <= 0) {
    next.toast = "Artifact has no charge.";
    next.toastTimer = 1800;
    return next;
  }

  artifact.charges -= 1;
  next.stats.artifactsUsed += 1;
  const definition = artifactById(artifactId);

  if (artifactId === "seer-orb") {
    next.pings.push(createPing("monster", next.player.x, next.player.y, `${definition.name}: nearby threats revealed`));
    next.monsters = next.monsters.map((monster) => {
      const distance = Math.hypot(monster.x - next.player.x, monster.y - next.player.y);
      return distance < 620 ? { ...monster, revealedUntil: next.time + 9000 } : monster;
    });
  } else if (artifactId === "shield-totem") {
    next.survival.shieldUntil = next.time + 8500;
  } else if (artifactId === "rift-anchor") {
    next.monsters = next.monsters.map((monster) => {
      const distance = Math.hypot(monster.x - next.player.x, monster.y - next.player.y);
      return distance < 420 ? { ...monster, slowedFor: Math.max(monster.slowedFor || 0, 5200), hp: monster.hp - 18 } : monster;
    });
  } else if (artifactId === "monster-lure") {
    next.survival.lure = { x: next.player.x + 220, y: next.player.y, until: next.time + 9000 };
    next.pings.push(createPing("monster", next.survival.lure.x, next.survival.lure.y, "Lure active"));
  }

  next.toast = `${definition.name} activated.`;
  next.toastTimer = 2200;
  return next;
}

export function sendPing(state, kind) {
  const next = structuredClone(state);
  const pingType = PING_TYPES[kind] || PING_TYPES.enemy;
  next.pings.push(createPing(kind, next.player.x, next.player.y, pingType.text));
  next.stats.pings += 1;
  next.chat.team.unshift({ from: next.profile.codename, text: `[Ping] ${pingType.text}` });
  next.toast = `${pingType.label} ping sent.`;
  next.toastTimer = 1800;
  return next;
}

export function recallAtShrine(state) {
  const next = structuredClone(state);
  if (next.profile.mode !== "team") {
    next.toast = "Soul recall is only available in team mode.";
    next.toastTimer = 2200;
    return next;
  }

  const shrine = nearestActiveShrine(next);
  const canSpendRemoteRecall = next.deathState?.type === "team-member" && next.team.alive > 0;
  if (!shrine && !canSpendRemoteRecall) {
    next.toast = "Move closer to an active revive shrine.";
    next.toastTimer = 2200;
    return next;
  }

  const fallenMember = next.team.members.find((member) => !member.alive);
  if (fallenMember) {
    fallenMember.alive = true;
    fallenMember.reviveAt = 0;
  } else if (!next.player.alive && canSpendRemoteRecall) {
    next.player.alive = true;
    next.player.hp = Math.ceil(next.player.maxHp * 0.55);
    next.player.mana = Math.ceil(next.player.maxMana * 0.6);
    next.player.reviveAt = 0;
    next.deathState = null;
  } else {
    next.toast = "No fallen teammate needs recall.";
    next.toastTimer = 2200;
    return next;
  }

  if (shrine) {
    shrine.active = false;
    shrine.cooldownUntil = next.time + 90000;
  }
  next.team.alive = next.team.members.filter((member) => member.alive).length + (next.player.alive ? 1 : 0);
  next.survival.recallsUsed += 1;
  next.stats.rewardScore += 90;
  next.toast = "Soul recall complete.";
  next.toastTimer = 2600;
  next.chat.team.unshift({ from: "Shrine", text: "Soul recall completed. Stay alive." });
  return next;
}

export function getPingTypes() {
  return PING_TYPES;
}

function updateCorruptionZone(state, deltaMs) {
  const next = structuredClone(state);
  if (next.time >= next.zone.nextShrinkAt && next.zone.radius > next.zone.minRadius) {
    next.zone.stage += 1;
    next.zone.radius = Math.max(next.zone.minRadius, next.zone.radius - 145);
    next.zone.nextShrinkAt = next.time + ZONE_INTERVAL;
    next.toast = `World corruption tightened to stage ${next.zone.stage}.`;
    next.toastTimer = 2600;
  }

  const distance = Math.hypot(next.player.x - next.zone.x, next.player.y - next.zone.y);
  if (distance > next.zone.radius) {
    const damage = calculateIncomingDamage(next, next.zone.damagePerSecond * (deltaMs / 1000));
    next.player.hp -= damage;
    next.survival.zoneDamageTaken += damage;
  }
  return next;
}

function resolveAutoLoot(state) {
  const next = structuredClone(state);
  const remainingLoot = [];
  const picked = [];
  for (const loot of next.loot) {
    const distance = Math.hypot(loot.x - next.player.x, loot.y - next.player.y);
    if (distance > AUTO_LOOT_RADIUS) {
      remainingLoot.push(loot);
      continue;
    }
    picked.push(applyLoot(next, loot));
  }
  next.loot = remainingLoot;
  if (picked.length) {
    next.survival.autoLooted += picked.length;
    next.toast = `Auto-looted ${picked.map((item) => item.name).join(", ")}.`;
    next.toastTimer = 2200;
  }
  return next;
}

function applyLoot(state, loot) {
  if (loot.kind === "potion") {
    if (state.player.hp < state.player.maxHp * 0.72) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 42);
      return { name: "used potion" };
    }
    state.supplies.potions += loot.amount || 1;
    return { name: "potion" };
  }
  if (loot.kind === "armor") {
    if ((loot.armorLevel || 1) > state.supplies.armorLevel) state.supplies.armorLevel = loot.armorLevel;
    return { name: `armor L${loot.armorLevel}` };
  }
  if (loot.kind === "crystal") {
    state.supplies.crystals += loot.amount || 1;
    state.player.mana = Math.min(state.player.maxMana, state.player.mana + 24);
    rechargeFirstArtifact(state);
    return { name: "mana crystal" };
  }
  if (loot.kind === "artifact") {
    const artifact = state.artifacts.find((item) => item.id === loot.artifactId);
    const definition = artifactById(loot.artifactId);
    if (artifact) artifact.charges = Math.min(artifact.maxCharges, artifact.charges + 1);
    else state.artifacts.push(createArtifact(definition.id, 1));
    return { name: definition.name };
  }
  return { name: "supplies" };
}

function rechargeFirstArtifact(state) {
  const artifact = state.artifacts.find((item) => item.charges < item.maxCharges);
  if (artifact) artifact.charges += 1;
}

function nearestActiveShrine(state) {
  return state.reviveShrines.find((shrine) => {
    const distance = Math.hypot(shrine.x - state.player.x, shrine.y - state.player.y);
    return shrine.active && distance < SHRINE_RADIUS;
  });
}

function createArtifact(id, charges) {
  const definition = artifactById(id);
  return {
    id: definition.id,
    name: definition.name,
    role: definition.role,
    charges,
    maxCharges: definition.maxCharges,
    description: definition.description
  };
}

function createPing(kind, x, y, text) {
  return {
    id: `ping-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    x,
    y,
    text,
    life: PING_LIFE
  };
}

function hashText(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
