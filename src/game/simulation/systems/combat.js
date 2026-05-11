import { WORLD_SIZE, getWorld } from "../../content/worlds.js";
import { chooseMonsterIntent, updateAdaptiveMemory } from "./aiDirector.js";
import { recordWorldConquest, resolveDeath, recoverExpiredRevives, calculateLeaderboardScore } from "./progression.js";
import {
  calculateIncomingDamage,
  createLootDrop,
  resetWorldSurvival,
  updateSurvivalSystems
} from "./survival.js";

const PLAYER_SPEED = 250;
const SPRINT_SPEED = 330;
const PROJECTILE_SPEED = 680;
const MONSTER_SPEED = 112;
const COMMANDER_SPEED = 92;

export function spawnWorldEntities(state, worldId) {
  const world = getWorld(worldId);
  const worldState = state.worlds.find((item) => item.id === worldId);
  const commanderName = state.cast.commanders[state.worlds.findIndex((item) => item.id === worldId)];
  const demonName = state.cast.demonKings[state.stats.worldsConquered % state.cast.demonKings.length];
  const baseThreat = 5 + state.stats.worldsConquered * 2;
  const monsters = Array.from({ length: baseThreat }, (_, index) => {
    const angle = (index / baseThreat) * Math.PI * 2;
    const radius = 380 + (index % 4) * 120;
    const monsterType = world.monsters[index % world.monsters.length];
    return {
      id: `${worldId}-monster-${Date.now()}-${index}`,
      kind: monsterType,
      role: index % 3 === 0 ? "tank" : "stalker",
      x: WORLD_SIZE.width / 2 + Math.cos(angle) * radius,
      y: WORLD_SIZE.height / 2 + Math.sin(angle) * radius,
      hp: index % 3 === 0 ? 130 : 82,
      maxHp: index % 3 === 0 ? 130 : 82,
      damage: index % 3 === 0 ? 14 : 9,
      radius: index % 3 === 0 ? 24 : 18,
      intent: "stalk",
      attackTimer: 0
    };
  });

  monsters.push({
    id: `${worldId}-commander`,
    kind: commanderName,
    role: "commander",
    x: WORLD_SIZE.width * 0.76,
    y: WORLD_SIZE.height * 0.36,
    hp: 360 + state.stats.worldsConquered * 80,
    maxHp: 360 + state.stats.worldsConquered * 80,
    damage: 22,
    radius: 34,
    intent: "pressure",
    attackTimer: 0,
    isCommander: true
  });

  if (state.stats.worldsConquered >= 3 && worldId === "void") {
    monsters.push({
      id: `${worldId}-demon-king`,
      kind: demonName,
      role: "demon-king",
      x: WORLD_SIZE.width * 0.5,
      y: WORLD_SIZE.height * 0.18,
      hp: 720,
      maxHp: 720,
      damage: 30,
      radius: 44,
      intent: "guard-gate",
      attackTimer: 0,
      isDemonKing: true
    });
  }

  worldState.spawned = true;
  return monsters;
}

export function teleportToWorld(state, worldId) {
  let next = structuredClone(state);
  if (!next.worlds.some((world) => world.id === worldId)) return next;
  next = resetWorldSurvival(next, worldId);
  next.currentWorldId = worldId;
  next.player.x = WORLD_SIZE.width / 2;
  next.player.y = WORLD_SIZE.height / 2;
  next.player.mana = Math.min(next.player.maxMana, next.player.mana + 18);
  next.player.spawnProtected = true;
  next.projectiles = [];
  next.floaters = [];
  next.adaptiveMemory = updateAdaptiveMemory(next.adaptiveMemory, { type: "teleport" });
  next.monsters = spawnWorldEntities(next, worldId);
  next.toast = `Teleported to ${getWorld(worldId).name}.`;
  return next;
}

export function updateCombat(state, actions, deltaMs, now = Date.now()) {
  let next = recoverExpiredRevives(state, now);
  if (!next.player.alive) return next;

  const delta = Math.min(deltaMs, 50) / 1000;
  next.time += deltaMs;
  next.toastTimer = Math.max(0, next.toastTimer - deltaMs);
  if (next.toastTimer === 0) next.toast = "";

  if (actions.teleport) {
    next = teleportToWorld(next, actions.teleport);
    next.toastTimer = 2600;
  }

  if (Math.hypot(actions.moveX, actions.moveY) > 0.08 || actions.attack || actions.ability) {
    next.player.spawnProtected = false;
  }

  const speed = actions.sprint && next.player.mana > 1 ? SPRINT_SPEED : PLAYER_SPEED;
  if (actions.sprint && (Math.abs(actions.moveX) + Math.abs(actions.moveY) > 0.1)) {
    next.player.mana = Math.max(0, next.player.mana - 18 * delta);
  } else {
    next.player.mana = Math.min(next.player.maxMana, next.player.mana + 10 * delta);
  }
  next.player.x = clamp(next.player.x + actions.moveX * speed * delta, 40, WORLD_SIZE.width - 40);
  next.player.y = clamp(next.player.y + actions.moveY * speed * delta, 40, WORLD_SIZE.height - 40);

  next.cooldowns.attack = Math.max(0, next.cooldowns.attack - deltaMs);
  next.cooldowns.ability = Math.max(0, next.cooldowns.ability - deltaMs);

  if (actions.attack && next.cooldowns.attack <= 0) {
    next = fireProjectile(next, actions.aimX, actions.aimY, false);
  }
  if (actions.ability && next.cooldowns.ability <= 0 && next.player.mana >= 28) {
    next = castAbility(next, actions.aimX, actions.aimY);
  }

  next.projectiles = next.projectiles
    .map((projectile) => ({
      ...projectile,
      x: projectile.x + projectile.vx * delta,
      y: projectile.y + projectile.vy * delta,
      life: projectile.life - deltaMs
    }))
    .filter((projectile) => projectile.life > 0 && inWorld(projectile.x, projectile.y));

  next = updateMonsters(next, delta, deltaMs);
  next = resolveProjectileHits(next);
  next = updateSurvivalSystems(next, deltaMs);
  next = resolveWorldProgress(next);
  next.leaderboardScore = calculateLeaderboardScore(next);
  return next.player.hp <= 0 ? resolveDeath(next, "player", now) : next;
}

function fireProjectile(state, aimX, aimY, empowered) {
  const next = structuredClone(state);
  const length = Math.hypot(aimX, aimY) || 1;
  const vx = (aimX / length) * PROJECTILE_SPEED;
  const vy = (aimY / length) * PROJECTILE_SPEED;
  next.projectiles.push({
    id: `bolt-${next.time}-${Math.random()}`,
    x: next.player.x,
    y: next.player.y,
    vx,
    vy,
    radius: empowered ? 18 : 10,
    damage: empowered ? 72 : 32,
    life: empowered ? 700 : 560,
    color: next.profile.power.color,
    empowered
  });
  next.cooldowns.attack = empowered ? 420 : 260;
  next.adaptiveMemory = updateAdaptiveMemory(next.adaptiveMemory, { type: "attack", range: empowered ? 360 : 280 });
  return next;
}

function castAbility(state, aimX, aimY) {
  let next = structuredClone(state);
  next.player.mana -= 28;
  next.cooldowns.ability = 6200;
  next.adaptiveMemory = updateAdaptiveMemory(next.adaptiveMemory, { type: "ability" });

  const powerId = next.profile.power.id;
  const radius = powerId === "voidmark" ? 190 : 150;
  const targetX = clamp(next.player.x + aimX * 160, 80, WORLD_SIZE.width - 80);
  const targetY = clamp(next.player.y + aimY * 160, 80, WORLD_SIZE.height - 80);

  next.floaters.push({
    id: `ability-${next.time}`,
    x: targetX,
    y: targetY,
    text: next.profile.power.abilityName,
    color: next.profile.power.color,
    life: 900
  });

  next.monsters = next.monsters.map((monster) => {
    const distance = Math.hypot(monster.x - targetX, monster.y - targetY);
    if (distance > radius) return monster;
    const damage = powerId === "pyroclasm" ? 112 : 82;
    const slowed = powerId === "stormbind" || powerId === "voidmark";
    return {
      ...monster,
      hp: monster.hp - damage,
      slowedFor: slowed ? 2400 : monster.slowedFor || 0
    };
  });

  if (powerId === "verdant-oath" || powerId === "sunveil") {
    next.player.hp = Math.min(next.player.maxHp, next.player.hp + (powerId === "sunveil" ? 28 : 42));
  }

  next = fireProjectile(next, aimX, aimY, true);
  next.cooldowns.ability = 6200;
  return next;
}

function updateMonsters(state, delta, deltaMs) {
  const next = structuredClone(state);
  const aliveMonsters = [];
  for (const monster of next.monsters) {
    if (monster.hp <= 0) {
      next.stats.monstersDefeated += 1;
      next.stats.rewardScore += monster.isCommander ? 320 : monster.isDemonKing ? 700 : 35;
      next.adaptiveMemory = updateAdaptiveMemory(next.adaptiveMemory, { type: "monster-defeated" });
      next.floaters.push({
        id: `defeated-${monster.id}`,
        x: monster.x,
        y: monster.y,
        text: monster.isCommander || monster.isDemonKing ? "Boss defeated" : "+35",
        color: 0xf4c15d,
        life: 900
      });
      const loot = createLootDrop(monster, next);
      if (loot) next.loot.push(loot);
      continue;
    }

    const intent = chooseMonsterIntent(monster, next);
    const lureActive = next.survival.lure && next.survival.lure.until > next.time;
    const lureDistance = lureActive ? Math.hypot(monster.x - next.survival.lure.x, monster.y - next.survival.lure.y) : Infinity;
    const target = lureDistance < 640 ? next.survival.lure : next.player;
    const dx = target.x - monster.x;
    const dy = target.y - monster.y;
    const targetDistance = Math.hypot(dx, dy) || 1;
    const playerDistance = Math.hypot(next.player.x - monster.x, next.player.y - monster.y) || 1;
    const baseSpeed = monster.isCommander || monster.isDemonKing ? COMMANDER_SPEED : MONSTER_SPEED;
    const speed = monster.slowedFor > 0 ? baseSpeed * 0.48 : baseSpeed;
    const flank = intent === "flank" ? Math.PI / 2 : 0;
    const angle = Math.atan2(dy, dx) + flank;
    const guardScale = intent === "guard-gate" && targetDistance < 220 ? -0.35 : 1;

    monster.x = clamp(monster.x + Math.cos(angle) * speed * guardScale * delta, 30, WORLD_SIZE.width - 30);
    monster.y = clamp(monster.y + Math.sin(angle) * speed * guardScale * delta, 30, WORLD_SIZE.height - 30);
    monster.intent = intent;
    monster.slowedFor = Math.max(0, (monster.slowedFor || 0) - deltaMs);
    monster.attackTimer = Math.max(0, monster.attackTimer - deltaMs);

    if (!next.player.spawnProtected && playerDistance < monster.radius + 34 && monster.attackTimer <= 0) {
      next.player.hp -= calculateIncomingDamage(next, monster.damage);
      monster.attackTimer = monster.isDemonKing ? 580 : 760;
    }
    aliveMonsters.push(monster);
  }
  next.monsters = aliveMonsters;
  next.floaters = next.floaters.map((floater) => ({ ...floater, life: floater.life - deltaMs })).filter((floater) => floater.life > 0);
  return next;
}

function resolveProjectileHits(state) {
  const next = structuredClone(state);
  const remainingProjectiles = [];
  for (const projectile of next.projectiles) {
    let hit = false;
    next.monsters = next.monsters.map((monster) => {
      if (hit) return monster;
      const distance = Math.hypot(monster.x - projectile.x, monster.y - projectile.y);
      if (distance < monster.radius + projectile.radius) {
        hit = true;
        next.stats.damageDone += projectile.damage;
        return { ...monster, hp: monster.hp - projectile.damage };
      }
      return monster;
    });
    if (!hit || projectile.empowered) remainingProjectiles.push(projectile);
  }
  next.projectiles = remainingProjectiles;
  return next;
}

function resolveWorldProgress(state) {
  let next = structuredClone(state);
  const worldState = next.worlds.find((world) => world.id === next.currentWorldId);
  if (!worldState || worldState.conquered) return next;
  if (next.player.spawnProtected) return next;
  const commanderAlive = next.monsters.some((monster) => monster.isCommander || monster.isDemonKing);
  const cleared = next.monsters.length === 0 || (!commanderAlive && next.monsters.length <= 2);
  const dungeonDistance = Math.hypot(next.player.x - WORLD_SIZE.width * 0.5, next.player.y - WORLD_SIZE.height * 0.18);
  const sealBonus = dungeonDistance < 160 ? 0.04 : 0.012;
  worldState.progress = clamp(worldState.progress + sealBonus + (cleared ? 0.32 : 0), 0, 100);
  if (worldState.progress >= 100 && !commanderAlive) {
    next = recordWorldConquest(next, next.currentWorldId);
    next.toast = `${getWorld(next.currentWorldId).name} conquered. Choose how the story moves.`;
    next.toastTimer = 4200;
  }
  return next;
}

function inWorld(x, y) {
  return x >= -100 && y >= -100 && x <= WORLD_SIZE.width + 100 && y <= WORLD_SIZE.height + 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
