import { WORLDS, getWorld } from "../game/content/worlds.js";
import { applyStoryChoice, updateLeaderboard } from "../game/simulation/systems/progression.js";
import { chooseNpcEvent } from "../game/simulation/systems/aiDirector.js";
import { getPingTypes, recallAtShrine, sendPing, useArtifact } from "../game/simulation/systems/survival.js";
import { saveLeaderboardEntry, saveState, clearState } from "../game/simulation/persistence.js";

export function createHud(root, state, commands) {
  root.innerHTML = `
    <div class="hud">
      <div class="top-strip">
        <div class="fighter">
          <strong data-field="fighter"></strong>
          <div data-field="power" class="muted"></div>
          <div class="bars">
            <div class="bar hp" aria-label="Health"><span data-bar="hp"></span></div>
            <div class="bar mana" aria-label="Mana"><span data-bar="mana"></span></div>
          </div>
        </div>
        <div class="world-progress" data-field="worlds"></div>
      </div>

      <div class="side-drawer" data-panel="drawer">
        <div class="drawer-tabs">
          <button class="hud-button is-active" data-tab="worlds">Worlds</button>
          <button class="hud-button" data-tab="gear">Gear</button>
          <button class="hud-button" data-tab="team">Team</button>
          <button class="hud-button" data-tab="pings">Pings</button>
          <button class="hud-button" data-tab="chat">Chat</button>
          <button class="hud-button" data-tab="forum">Forum</button>
        </div>
        <div data-field="drawerContent"></div>
      </div>

      <div class="bottom-strip">
        <div class="joystick" data-joystick aria-label="Move joystick"><div class="joystick-knob" data-knob></div></div>
        <div class="objective" data-field="objective"></div>
        <div class="actions">
          <button class="action-button" data-action="attack">Attack</button>
          <button class="action-button" data-action="ability">Power</button>
          <button class="action-button secondary" data-action="sprint">Dash</button>
          <button class="action-button secondary" data-action="menu">Menu</button>
        </div>
      </div>

      <div class="toast hidden" data-field="toast"></div>
      <div data-field="modal"></div>
    </div>
  `;

  const hud = {
    root,
    tab: "worlds",
    drawerOpen: false,
    lastDrawerKey: "",
    lastModalKey: "",
    fields: {
      fighter: root.querySelector('[data-field="fighter"]'),
      power: root.querySelector('[data-field="power"]'),
      hp: root.querySelector('[data-bar="hp"]'),
      mana: root.querySelector('[data-bar="mana"]'),
      worlds: root.querySelector('[data-field="worlds"]'),
      objective: root.querySelector('[data-field="objective"]'),
      drawer: root.querySelector('[data-panel="drawer"]'),
      drawerContent: root.querySelector('[data-field="drawerContent"]'),
      toast: root.querySelector('[data-field="toast"]'),
      modal: root.querySelector('[data-field="modal"]'),
      joystick: root.querySelector("[data-joystick]"),
      knob: root.querySelector("[data-knob]")
    },
    commands
  };

  wireHud(hud);
  updateHud(hud, state);
  return hud;
}

export function updateHud(hud, state) {
  hud.fields.fighter.textContent = `${state.profile.codename} ${state.profile.mode === "solo" ? "Solo Legend" : "Hero Team"}`;
  hud.fields.power.textContent = `${state.profile.power.name}: ${state.profile.power.description}`;
  hud.fields.hp.style.setProperty("--value", `${Math.max(0, (state.player.hp / state.player.maxHp) * 100)}%`);
  hud.fields.mana.style.setProperty("--value", `${Math.max(0, (state.player.mana / state.player.maxMana) * 100)}%`);
  hud.fields.worlds.innerHTML = state.worlds
    .map((worldState, index) => {
      const world = WORLDS[index];
      const classes = ["world-dot"];
      if (world.id === state.currentWorldId) classes.push("is-current");
      if (worldState.conquered) classes.push("is-done");
      return `<span class="${classes.join(" ")}" title="${world.name}">${index + 1}</span>`;
    })
    .join("");
  const world = getWorld(state.currentWorldId);
  const worldState = state.worlds.find((item) => item.id === state.currentWorldId);
  const outsideZone = Math.max(0, Math.round(Math.hypot(state.player.x - state.zone.x, state.player.y - state.zone.y) - state.zone.radius));
  hud.fields.objective.innerHTML = `
    <strong>${world.name} ${Math.floor(worldState.progress)}%</strong>
    ${world.objective}<br />
    Dungeon: ${world.dungeon}. Hazard: ${world.hazard}.<br />
    Corruption: stage ${state.zone.stage}${outsideZone ? `, ${outsideZone}m outside` : ", safe"}.${state.player.spawnProtected ? "<br />Sanctuary shield active until first action." : ""}
  `;
  hud.fields.drawer.classList.toggle("is-open", hud.drawerOpen);
  hud.fields.toast.textContent = state.toast || "";
  hud.fields.toast.classList.toggle("hidden", !state.toast);
  renderDrawer(hud, state);
  renderModal(hud, state);
}

function wireHud(hud) {
  hud.root.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.action;
    const tab = button.dataset.tab;
    const teleport = button.dataset.teleport;
    const choice = button.dataset.choice;
    const artifact = button.dataset.artifact;
    const ping = button.dataset.ping;

    if (action === "menu") {
      hud.drawerOpen = !hud.drawerOpen;
      hud.lastDrawerKey = "";
      hud.commands.requestRender();
    } else if (action === "reset") {
      hud.commands.reset();
    } else if (action === "recall") {
      hud.commands.recall();
    } else if (action === "attack") {
      hud.commands.setButtonAction("attack", true);
      setTimeout(() => hud.commands.setButtonAction("attack", false), 80);
    } else if (action === "ability") {
      hud.commands.setButtonAction("ability", true);
      setTimeout(() => hud.commands.setButtonAction("ability", false), 120);
    } else if (action === "sprint") {
      hud.commands.setButtonAction("sprint", !hud.commands.actions.sprint);
      button.classList.toggle("is-active", hud.commands.actions.sprint);
    } else if (tab) {
      hud.tab = tab;
      hud.drawerOpen = true;
      hud.lastDrawerKey = "";
      hud.commands.requestRender();
    } else if (teleport) {
      hud.commands.teleport(teleport);
    } else if (choice) {
      hud.commands.chooseStory(choice);
    } else if (artifact) {
      hud.commands.useArtifact(artifact);
    } else if (ping) {
      hud.commands.ping(ping);
    }
  });

  hud.root.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const input = form.querySelector("input");
    if (!input?.value.trim()) return;
    hud.commands.postChat(form.dataset.channel, input.value.trim());
    input.value = "";
  });

  wireJoystick(hud);
}

function wireJoystick(hud) {
  let activePointer = null;
  const max = 34;
  const reset = () => {
    activePointer = null;
    hud.fields.knob.style.transform = "";
    hud.commands.setMove(0, 0);
  };
  const update = (event) => {
    if (activePointer !== null && event.pointerId !== activePointer) return;
    const rect = hud.fields.joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(max, length) / length;
    hud.fields.knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    hud.commands.setMove((dx * scale) / max, (dy * scale) / max);
  };
  hud.fields.joystick.addEventListener("pointerdown", (event) => {
    activePointer = event.pointerId;
    hud.fields.joystick.setPointerCapture(event.pointerId);
    update(event);
  });
  hud.fields.joystick.addEventListener("pointermove", update);
  hud.fields.joystick.addEventListener("pointerup", reset);
  hud.fields.joystick.addEventListener("pointercancel", reset);
}

function renderDrawer(hud, state) {
  hud.root.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === hud.tab);
  });
  const key = [
    hud.tab,
    state.currentWorldId,
    state.worlds.map((world) => `${world.id}:${Math.floor(world.progress)}:${world.conquered}`).join(","),
    state.inventory.map((item) => item.id).join(","),
    `${state.supplies.armorLevel}:${state.supplies.potions}:${state.supplies.crystals}`,
    state.artifacts.map((item) => `${item.id}:${item.charges}`).join(","),
    state.reviveShrines.map((item) => `${item.id}:${item.active}:${item.cooldownUntil}`).join(","),
    state.pings.length,
    state.team.level,
    state.team.temporaryAllies,
    state.chat.team.length,
    state.chat.forum.length,
    state.stats.worldsConquered,
    state.leaderboardScore
  ].join("|");
  if (hud.lastDrawerKey === key) return;
  hud.lastDrawerKey = key;
  const renderers = {
    worlds: renderWorldsPanel,
    gear: renderGearPanel,
    team: renderTeamPanel,
    pings: renderPingsPanel,
    chat: renderChatPanel,
    forum: renderForumPanel
  };
  hud.fields.drawerContent.innerHTML = renderers[hud.tab](state);
}

function renderWorldsPanel(state) {
  const leader = updateLeaderboard(state).entry;
  const zoneDistance = Math.max(0, Math.round(Math.hypot(state.player.x - state.zone.x, state.player.y - state.zone.y) - state.zone.radius));
  const worldButtons = WORLDS.map((world) => {
    const worldState = state.worlds.find((item) => item.id === world.id);
    return `<button class="hud-button" data-teleport="${world.id}">${world.shortName} ${Math.floor(worldState.progress)}%</button>`;
  }).join("");
  const rewards = state.inventory.length
    ? state.inventory.map((item) => `<li><strong>${item.name}</strong><br>${item.rarity} ${item.type}: ${item.description}</li>`).join("")
    : "<li>No special weapon or outfit unlocked yet.</li>";
  return `
    <section class="panel-section">
      <h2>Teleport Gates</h2>
      <div class="teleport-grid">${worldButtons}</div>
      <h3>Leaderboard Score</h3>
      <p>${leader.score} points from worlds, skill, team level, and reward score.</p>
      <h3>World Corruption</h3>
      <p>Stage ${state.zone.stage}. Radius ${Math.round(state.zone.radius)}m. ${zoneDistance ? `${zoneDistance}m outside safe magic.` : "Inside safe magic."}</p>
      <h3>Rewards</h3>
      <ul class="mini-list">${rewards}</ul>
      <button class="hud-button" data-action="reset">New fighter</button>
    </section>
  `;
}

function renderGearPanel(state) {
  const artifacts = state.artifacts.map((artifact) => `
    <li>
      <strong>${artifact.name}</strong> ${artifact.charges}/${artifact.maxCharges}<br>
      ${artifact.description}
      <button class="hud-button" data-artifact="${artifact.id}">Use</button>
    </li>
  `).join("");
  return `
    <section class="panel-section">
      <h2>Auto-Loot Gear</h2>
      <p>Armor L${state.supplies.armorLevel}. Potions ${state.supplies.potions}. Crystals ${state.supplies.crystals}. Auto-looted ${state.survival.autoLooted} drops.</p>
      <h3>Tactical Artifacts</h3>
      <ul class="mini-list">${artifacts}</ul>
    </section>
  `;
}

function renderTeamPanel(state) {
  const members = state.team.members.length
    ? state.team.members
        .map((member) => `<li><strong>${member.name}</strong> ${member.alive ? "ready" : `revives ${formatTime(member.reviveAt)}`}<br>${member.buff}</li>`)
        .join("")
    : `<li><strong>${state.cast.companions[0].name}</strong><br>${state.cast.companions[0].buff}</li>`;
  return `
    <section class="panel-section">
      <h2>${state.profile.mode === "team" ? "Four Heroes" : "Solo Legend"}</h2>
      <p>Team level ${state.team.level}. Temporary allies: ${state.team.temporaryAllies}.</p>
      <ul class="mini-list">${members}</ul>
      <h3>Revive Shrines</h3>
      <p>${state.reviveShrines.filter((shrine) => shrine.active).length} active shrines. Recalls used: ${state.survival.recallsUsed}.</p>
      <button class="hud-button" data-action="recall">Soul recall</button>
      <h3>Enemy Command</h3>
      <p>Commander now hunted: ${state.cast.commanders[state.stats.worldsConquered] || "final gate cleared"}.</p>
      <p>Demon king prophecy: ${state.cast.demonKings[state.stats.worldsConquered % state.cast.demonKings.length]}.</p>
    </section>
  `;
}

function renderPingsPanel(state) {
  const pingButtons = Object.entries(getPingTypes()).map(([kind, ping]) => (
    `<button class="hud-button" data-ping="${kind}">${ping.label}</button>`
  )).join("");
  const recent = state.pings.length
    ? state.pings.slice(-4).reverse().map((ping) => `<li><strong>${ping.text}</strong><br>${Math.ceil(ping.life / 1000)}s remaining</li>`).join("")
    : "<li>No active pings.</li>";
  return `
    <section class="panel-section">
      <h2>Squad Pings</h2>
      <div class="teleport-grid">${pingButtons}</div>
      <h3>Active Marks</h3>
      <ul class="mini-list">${recent}</ul>
    </section>
  `;
}

function renderChatPanel(state) {
  const rows = state.chat.team.map((item) => `<div class="chat-row"><strong>${item.from}</strong><br>${item.text}</div>`).join("");
  return `
    <section class="panel-section">
      <h2>Team Talk</h2>
      <div class="chat-log">${rows}</div>
      <form class="chat-form" data-channel="team">
        <input maxlength="90" placeholder="Message team" />
        <button class="hud-button">Send</button>
      </form>
    </section>
  `;
}

function renderForumPanel(state) {
  const rows = state.chat.forum.map((item) => `<div class="chat-row"><strong>${item.from}</strong><br>${item.text}</div>`).join("");
  return `
    <section class="panel-section">
      <h2>Global Forum</h2>
      <div class="forum-log">${rows}</div>
      <form class="chat-form" data-channel="forum">
        <input maxlength="90" placeholder="Post to global forum" />
        <button class="hud-button">Post</button>
      </form>
      <p>${chooseNpcEvent(state)}</p>
    </section>
  `;
}

function renderModal(hud, state) {
  const modalKey = state.deathState
    ? `death:${state.deathState.type}:${state.deathState.reviveAt}`
    : state.pendingStory
      ? `story:${state.pendingStory.map((choice) => choice.id).join(",")}:${state.story.availableBranches}`
      : state.stats.worldsConquered === 4
        ? `winner:${state.leaderboardScore}`
        : "none";
  if (hud.lastModalKey === modalKey) return;
  hud.lastModalKey = modalKey;

  if (state.deathState) {
    const recallButton = state.profile.mode === "team" && state.deathState.type === "team-member"
      ? '<button class="hud-button" data-action="recall">Spend soul recall</button>'
      : "";
    hud.fields.modal.innerHTML = `
      <div class="death-panel">
        <h2>Defeated</h2>
        <p>${state.deathState.message}</p>
        <p>Revive time: ${formatTime(state.deathState.reviveAt)}</p>
        ${recallButton}
        <button class="hud-button" data-action="reset">New fighter</button>
      </div>
    `;
    return;
  }
  if (state.pendingStory) {
    hud.fields.modal.innerHTML = `
      <div class="story-panel">
        <h2>Story Branch</h2>
        <p>Your decisions have opened ${state.story.availableBranches.toLocaleString()} possible routes.</p>
        <div class="choice-grid">
          ${state.pendingStory
            .map((choice) => `<button data-choice="${choice.id}"><strong>${choice.label}</strong><br>${choice.effect}</button>`)
            .join("")}
        </div>
      </div>
    `;
    return;
  }
  if (state.stats.worldsConquered === 4) {
    const entry = updateLeaderboard(state).entry;
    saveLeaderboardEntry(entry);
    saveState(state);
    hud.fields.modal.innerHTML = `
      <div class="story-panel">
        <h2>Winner</h2>
        <p>${state.profile.codename} conquered all four worlds with ${entry.score} leaderboard points.</p>
        <button class="hud-button" data-action="menu">Open records</button>
      </div>
    `;
    return;
  }
  hud.fields.modal.innerHTML = "";
}

export function bindHudCommands(stateRef, sceneCommands) {
  return {
    actions: sceneCommands.actions,
    requestRender: () => sceneCommands.render(),
    setMove: sceneCommands.setMove,
    setButtonAction: sceneCommands.setButtonAction,
    teleport: sceneCommands.teleport,
    chooseStory: (choiceId) => {
      const state = stateRef.get();
      const choice = state.pendingStory?.find((item) => item.id === choiceId);
      if (!choice) return;
      const next = applyStoryChoice(state, choice);
      stateRef.set(next);
      saveState(next);
      sceneCommands.render();
    },
    useArtifact: (artifactId) => {
      const next = useArtifact(stateRef.get(), artifactId);
      stateRef.set(next);
      saveState(next);
      sceneCommands.render();
    },
    ping: (kind) => {
      const next = sendPing(stateRef.get(), kind);
      stateRef.set(next);
      saveState(next);
      sceneCommands.render();
    },
    recall: () => {
      const next = recallAtShrine(stateRef.get());
      stateRef.set(next);
      saveState(next);
      sceneCommands.render();
    },
    postChat: (channel, text) => {
      const state = stateRef.get();
      const safeText = text.replace(/[<>]/g, "").slice(0, 90);
      const next = structuredClone(state);
      next.chat[channel === "forum" ? "forum" : "team"].unshift({
        from: channel === "forum" ? state.profile.codename : "You",
        text: safeText
      });
      stateRef.set(next);
      saveState(next);
      sceneCommands.render();
    },
    reset: () => {
      clearState();
      location.reload();
    }
  };
}

function formatTime(timestamp) {
  if (!timestamp) return "ready";
  const remaining = Math.max(0, timestamp - Date.now());
  const minutes = Math.ceil(remaining / 60000);
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes}m`;
}
