import assert from "node:assert/strict";
import { createGameState, createProfile } from "../src/game/simulation/state.js";
import { selectMagicPower, storyChoicesForWorld } from "../src/game/simulation/systems/aiDirector.js";
import {
  updateCombat,
  teleportToWorld
} from "../src/game/simulation/systems/combat.js";
import {
  applyStoryChoice,
  calculateLeaderboardScore,
  recordWorldConquest,
  resolveDeath
} from "../src/game/simulation/systems/progression.js";
import { recallAtShrine, sendPing, useArtifact } from "../src/game/simulation/systems/survival.js";
import { WORLDS } from "../src/game/content/worlds.js";

const profile = createProfile({ codename: "Nitin", mode: "team", instinct: "hunter" });
const samePower = selectMagicPower("Nitin", "hunter");
assert.equal(profile.power.id, samePower.id, "AI magic selection should be deterministic per account inputs");

let state = createGameState(profile);
assert.equal(state.worlds.length, 4, "game should have four conquerable worlds");
assert.equal(state.cast.demonKings.length, 7, "game should include seven demon kings");
assert.equal(state.cast.commanders.length, 15, "game should include fifteen commanders");
assert.equal(state.team.members.length, 4, "team mode should get four heroes");

const beforeScore = calculateLeaderboardScore(state);
state.stats.damageDone = 1000;
state.stats.monstersDefeated = 6;
assert.ok(calculateLeaderboardScore(state) > beforeScore, "skill performance should raise leaderboard score");

const protectedProgress = updateCombat(teleportToWorld(state, WORLDS[1].id), {
  moveX: 0,
  moveY: 0,
  aimX: 1,
  aimY: 0,
  attack: false,
  ability: false,
  teleport: null,
  interact: false,
  sprint: false
}, 1000, 1000);
assert.equal(
  protectedProgress.worlds.find((world) => world.id === WORLDS[1].id).progress,
  0,
  "sanctuary shield should not allow passive dungeon progress"
);

let dangerState = structuredClone(state);
dangerState.player.spawnProtected = false;
dangerState.zone.radius = 12;
dangerState.zone.x = 0;
dangerState.zone.y = 0;
dangerState.player.x = 500;
dangerState.player.y = 500;
const damagedByZone = updateCombat(dangerState, {
  moveX: 0,
  moveY: 0,
  aimX: 1,
  aimY: 0,
  attack: false,
  ability: false,
  teleport: null,
  interact: false,
  sprint: false
}, 1000, 2000);
assert.ok(damagedByZone.player.hp < dangerState.player.hp, "corruption zone should damage players outside safe magic");

let lootState = structuredClone(state);
lootState.loot.push({
  id: "test-armor",
  kind: "armor",
  armorLevel: 3,
  x: lootState.player.x,
  y: lootState.player.y,
  picked: false
});
lootState = updateCombat(lootState, {
  moveX: 0,
  moveY: 0,
  aimX: 1,
  aimY: 0,
  attack: false,
  ability: false,
  teleport: null,
  interact: false,
  sprint: false
}, 16, 2016);
assert.equal(lootState.supplies.armorLevel, 3, "auto-loot should equip superior armor");
assert.equal(lootState.loot.length, 0, "auto-loot should remove picked drops");

const artifactState = useArtifact(state, "shield-totem");
assert.ok(artifactState.survival.shieldUntil > artifactState.time, "shield artifact should create a timed ward");
assert.equal(artifactState.stats.artifactsUsed, 1, "artifact use should be tracked");

const pingState = sendPing(state, "dungeon");
assert.equal(pingState.pings.length, state.pings.length + 1, "ping should create a map marker");
assert.equal(pingState.stats.pings, 1, "ping count should be tracked");

state = recordWorldConquest(state, WORLDS[0].id);
assert.equal(state.stats.worldsConquered, 1, "conquest should increment world count");
assert.ok(state.inventory.length >= 1, "conquest should grant reward gear");
assert.ok(state.pendingStory.length === 3, "conquest should open three story decisions");

const choice = storyChoicesForWorld(WORLDS[0])[2];
state = applyStoryChoice(state, choice);
assert.equal(state.story.choices.includes(choice.id), true, "story choices should be recorded");
assert.equal(state.team.temporaryAllies, 1, "temporary mission alliance should be supported");

let recallState = structuredClone(state);
recallState.team.members[0].alive = false;
recallState.team.members[0].reviveAt = 999999;
recallState.player.x = recallState.reviveShrines[0].x;
recallState.player.y = recallState.reviveShrines[0].y;
recallState = recallAtShrine(recallState);
assert.equal(recallState.team.members[0].alive, true, "revive shrine should recall a fallen teammate");
assert.equal(recallState.survival.recallsUsed, 1, "recall usage should be tracked");

let death = resolveDeath(state, "player", 1000);
assert.equal(death.deathState.type, "team-member", "team member death should recover after 30 minutes if allies live");
assert.equal(death.player.reviveAt, 1000 + 30 * 60 * 1000, "team survivor revive timer should be 30 minutes");

const solo = createGameState(createProfile({ codename: "Solo", mode: "solo", instinct: "strategist" }));
death = resolveDeath(solo, "player", 5000);
assert.equal(death.deathState.type, "solo", "solo death should use solo recovery state");
assert.equal(death.player.reviveAt, 5000 + 60 * 60 * 1000, "solo player revive timer should be 1 hour");

console.log("Simulation tests passed");
