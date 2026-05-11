import { WORLDS, WORLD_SIZE } from "../content/worlds.js";
import { assignNarrativeCast, createAdaptiveMemory, selectMagicPower } from "./systems/aiDirector.js";
import { spawnWorldEntities } from "./systems/combat.js";
import { createSurvivalState, hydrateSurvivalState } from "./systems/survival.js";

export function createProfile({ codename, mode = "solo", instinct = "strategist" }) {
  const safeName = String(codename || "Wanderer").trim().slice(0, 18) || "Wanderer";
  const profile = {
    id: cryptoRandomId(),
    codename: safeName,
    mode,
    instinct,
    createdAt: new Date().toISOString()
  };
  profile.power = selectMagicPower(safeName, instinct);
  return profile;
}

export function createGameState(profile) {
  const cast = assignNarrativeCast(profile);
  const state = {
    version: 1,
    profile,
    cast,
    currentWorldId: WORLDS[0].id,
    worlds: WORLDS.map((world) => ({
      id: world.id,
      progress: 0,
      conquered: false,
      spawned: false
    })),
    player: {
      x: WORLD_SIZE.width / 2,
      y: WORLD_SIZE.height / 2,
      hp: profile.mode === "solo" ? 170 : 145,
      maxHp: profile.mode === "solo" ? 170 : 145,
      mana: 100,
      maxMana: 100,
      alive: true,
      reviveAt: 0,
      spawnProtected: true
    },
    ...createSurvivalState(WORLDS[0].id),
    team: createTeam(profile.mode, cast.companions),
    monsters: [],
    projectiles: [],
    floaters: [],
    inventory: [],
    cooldowns: {
      attack: 0,
      ability: 0
    },
    adaptiveMemory: createAdaptiveMemory(),
    story: {
      choices: [],
      log: ["The demon gates opened because the four worlds stopped sharing the same sky."],
      availableBranches: 3
    },
    pendingStory: null,
    stats: {
      damageDone: 0,
      monstersDefeated: 0,
      worldsConquered: 0,
      rewardScore: 0,
      deaths: 0,
      pings: 0,
      artifactsUsed: 0,
      survivalMs: 0
    },
    chat: {
      team: [
        { from: "System", text: "Team channel online. Voice ping is simulated in this offline build." },
        { from: "HeroNet", text: "Temporary mission alliances can be formed from story choices." }
      ],
      forum: [
        { from: "Global Forum", text: "First squad to conquer all four worlds becomes the season myth." },
        { from: "Arena Ops", text: "Leaderboards score world performance, skill, team level, and rewards." }
      ]
    },
    leaderboard: [],
    leaderboardScore: 0,
    deathState: null,
    toast: "Find the dungeon seal, defeat commanders, and conquer all four worlds.",
    toastTimer: 4200,
    time: 0
  };
  state.monsters = spawnWorldEntities(state, state.currentWorldId);
  return state;
}

export function normalizeGameState(savedState) {
  if (!savedState?.profile) return null;
  const state = hydrateSurvivalState(savedState);
  state.version = Math.max(2, state.version || 1);
  state.worlds ||= WORLDS.map((world) => ({
    id: world.id,
    progress: 0,
    conquered: false,
    spawned: false
  }));
  state.projectiles ||= [];
  state.floaters ||= [];
  state.inventory ||= [];
  state.cooldowns ||= { attack: 0, ability: 0 };
  state.chat ||= { team: [], forum: [] };
  state.leaderboardScore ||= 0;
  state.toast ||= "";
  state.toastTimer ||= 0;
  state.time ||= 0;
  return state;
}

function createTeam(mode, companions) {
  const members = mode === "team"
    ? companions.slice(0, 4).map((hero, index) => ({
        id: `hero-${index}`,
        name: hero.name,
        role: hero.role,
        buff: hero.buff,
        alive: true,
        reviveAt: 0
      }))
    : [];
  return {
    level: mode === "team" ? 1 : 0,
    alive: mode === "team" ? members.length + 1 : 1,
    temporaryAllies: 0,
    members
  };
}

function cryptoRandomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
