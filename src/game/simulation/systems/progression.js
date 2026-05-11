import { WORLDS } from "../../content/worlds.js";
import { rewardForConquest } from "../../content/items.js";
import { storyChoicesForWorld, updateAdaptiveMemory, possibleStoryBranches } from "./aiDirector.js";

const HALF_HOUR = 30 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export function calculateLeaderboardScore(state) {
  const worldScore = state.stats.worldsConquered * 1500;
  const skillScore = Math.round(state.stats.damageDone * 0.45 + state.stats.monstersDefeated * 80);
  const teamScore = state.profile.mode === "team" ? state.team.level * 300 + state.team.alive * 120 : 500;
  const storyScore = state.story.choices.length * 150;
  const survivalPenalty = state.stats.deaths * 250;
  return Math.max(0, worldScore + skillScore + teamScore + storyScore - survivalPenalty + state.stats.rewardScore);
}

export function resolveDeath(state, defeatedMemberId = "player", now = Date.now()) {
  const next = structuredClone(state);
  next.stats.deaths += defeatedMemberId === "player" ? 1 : 0;

  if (next.profile.mode === "solo") {
    next.player.alive = false;
    next.player.reviveAt = now + ONE_HOUR;
    next.deathState = {
      type: "solo",
      message: "Solo legend defeated. Recovery unlocks in 1 hour.",
      reviveAt: next.player.reviveAt
    };
    return next;
  }

  const member = next.team.members.find((item) => item.id === defeatedMemberId);
  if (member) {
    member.alive = false;
    member.reviveAt = now + HALF_HOUR;
  }
  if (defeatedMemberId === "player") {
    next.player.alive = false;
    next.player.reviveAt = now + HALF_HOUR;
  }

  const aliveCount = next.team.members.filter((item) => item.alive).length + (next.player.alive ? 1 : 0);
  next.team.alive = aliveCount;

  if (aliveCount <= 0) {
    const reviveAt = now + ONE_DAY;
    next.player.reviveAt = reviveAt;
    next.team.members.forEach((item) => {
      item.reviveAt = reviveAt;
    });
    next.deathState = {
      type: "team-wipe",
      message: "Team wiped. The squad can deploy again after 1 day.",
      reviveAt
    };
  } else {
    next.deathState = {
      type: "team-member",
      message: "A team member fell. They return after 30 minutes if anyone survives.",
      reviveAt: now + HALF_HOUR
    };
  }
  return next;
}

export function recoverExpiredRevives(state, now = Date.now()) {
  const next = structuredClone(state);
  if (!next.player.alive && next.player.reviveAt && now >= next.player.reviveAt) {
    next.player.alive = true;
    next.player.hp = next.player.maxHp;
    next.player.mana = next.player.maxMana;
    next.player.reviveAt = 0;
    next.deathState = null;
  }
  next.team.members.forEach((member) => {
    if (!member.alive && member.reviveAt && now >= member.reviveAt) {
      member.alive = true;
      member.reviveAt = 0;
    }
  });
  next.team.alive = next.team.members.filter((member) => member.alive).length + (next.player.alive ? 1 : 0);
  return next;
}

export function recordWorldConquest(state, worldId) {
  const next = structuredClone(state);
  const worldIndex = WORLDS.findIndex((world) => world.id === worldId);
  const world = next.worlds.find((item) => item.id === worldId);
  if (!world || world.conquered) return next;

  world.conquered = true;
  world.progress = 100;
  next.stats.worldsConquered += 1;
  next.stats.rewardScore += 250;
  const reward = rewardForConquest(worldIndex, next.stats.monstersDefeated + next.story.choices.length);
  if (!next.inventory.some((item) => item.id === reward.id)) next.inventory.push(reward);
  next.pendingStory = storyChoicesForWorld(WORLDS[worldIndex]);
  next.story.availableBranches = possibleStoryBranches(next.story.choices.length + 1);
  next.leaderboardScore = calculateLeaderboardScore(next);
  return next;
}

export function applyStoryChoice(state, choice) {
  const next = structuredClone(state);
  next.story.choices.push(choice.id);
  next.story.log.unshift(`${choice.label}: ${choice.effect}`);
  next.story.availableBranches = possibleStoryBranches(next.story.choices.length);
  next.stats.rewardScore += choice.scoreDelta || 0;
  if (choice.temporaryAlly) {
    next.team.temporaryAllies += 1;
    next.team.level += 1;
  }
  next.adaptiveMemory = updateAdaptiveMemory(next.adaptiveMemory, {
    type: "story-choice",
    trustDelta: choice.trustDelta
  });
  next.pendingStory = null;
  next.leaderboardScore = calculateLeaderboardScore(next);
  return next;
}

export function updateLeaderboard(state) {
  const score = calculateLeaderboardScore(state);
  const entry = {
    codename: state.profile.codename,
    mode: state.profile.mode,
    power: state.profile.power.name,
    score,
    worlds: state.stats.worldsConquered,
    teamLevel: state.team.level,
    recordedAt: new Date().toISOString()
  };
  return { entry, score };
}
