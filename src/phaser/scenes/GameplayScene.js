import { WORLD_SIZE, getWorld } from "../../game/content/worlds.js";
import { createActionState, normalizeVector } from "../../game/input/actions.js";
import { updateCombat, teleportToWorld } from "../../game/simulation/systems/combat.js";
import { createHud, updateHud, bindHudCommands } from "../../ui/hud.js";
import { saveState } from "../../game/simulation/persistence.js";
import { createTextures } from "../view/createTextures.js";

export class GameplayScene extends Phaser.Scene {
  constructor() {
    super("GameplayScene");
    this.stateRef = null;
    this.actions = createActionState();
    this.keys = null;
    this.monsterSprites = new Map();
    this.projectileSprites = new Map();
    this.lootSprites = new Map();
    this.shrineSprites = new Map();
    this.pingSprites = new Map();
  }

  init(data = {}) {
    this.stateRef = data.stateRef || globalThis.__FOUR_WORLDS_STATE_REF__;
  }

  create() {
    if (!this.stateRef) {
      throw new Error("Gameplay state reference was not initialized.");
    }
    createTextures(this);
    this.cameras.main.setBounds(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    this.cameras.main.setZoom(window.innerWidth < 760 ? 0.68 : 0.82);
    this.createWorldLayer();
    this.dungeonSeal = this.add.image(WORLD_SIZE.width * 0.5, WORLD_SIZE.height * 0.18, "dungeon-seal");
    this.player = this.add.image(0, 0, "player-core");
    this.powerAura = this.add.circle(0, 0, 42, this.stateRef.get().profile.power.color, 0.2);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT");
    this.input.on("pointermove", (pointer) => this.updateAimFromPointer(pointer));
    this.input.on("pointerdown", (pointer) => {
      this.updateAimFromPointer(pointer);
      this.actions.attack = true;
    });
    this.input.on("pointerup", () => {
      this.actions.attack = false;
    });

    const hudRoot = document.getElementById("hud-root");
    const commands = bindHudCommands(this.stateRef, {
      actions: this.actions,
      setMove: (x, y) => {
        this.actions.moveX = x;
        this.actions.moveY = y;
      },
      setButtonAction: (action, active) => {
        this.actions[action] = active;
      },
      teleport: (worldId) => {
        this.stateRef.set(teleportToWorld(this.stateRef.get(), worldId));
        saveState(this.stateRef.get());
        this.rebuildWorld();
      },
      render: () => updateHud(this.hud, this.stateRef.get())
    });
    this.hud = createHud(hudRoot, this.stateRef.get(), commands);
    this.rebuildWorld();
  }

  update(_, delta) {
    this.mergeKeyboardInput();
    const current = this.stateRef.get();
    const next = updateCombat(current, this.actions, delta);
    this.stateRef.set(next);
    this.renderState(next);
    updateHud(this.hud, next);
    if (Math.floor(next.time / 1000) !== Math.floor(current.time / 1000)) saveState(next);
  }

  createWorldLayer() {
    this.worldGraphics = this.add.graphics();
    this.gridGraphics = this.add.graphics();
    this.zoneGraphics = this.add.graphics();
    this.backgroundLabel = this.add.text(60, 60, "", {
      fontFamily: "system-ui",
      fontSize: "42px",
      color: "#f3f7ff"
    });
  }

  rebuildWorld() {
    this.monsterSprites.forEach((sprite) => sprite.destroy());
    this.projectileSprites.forEach((sprite) => sprite.destroy());
    this.lootSprites.forEach((sprite) => sprite.destroy());
    this.shrineSprites.forEach((sprite) => sprite.destroy());
    this.pingSprites.forEach((sprite) => sprite.destroy(true));
    this.monsterSprites.clear();
    this.projectileSprites.clear();
    this.lootSprites.clear();
    this.shrineSprites.clear();
    this.pingSprites.clear();
    this.drawWorld();
    this.renderState(this.stateRef.get());
    updateHud(this.hud, this.stateRef.get());
  }

  drawWorld() {
    const state = this.stateRef.get();
    const world = getWorld(state.currentWorldId);
    this.worldGraphics.clear();
    this.gridGraphics.clear();
    this.worldGraphics.fillStyle(0x0b1015, 1);
    this.worldGraphics.fillRect(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
    this.worldGraphics.fillStyle(world.theme, 0.18);
    for (let i = 0; i < 22; i += 1) {
      const x = (i * 137) % WORLD_SIZE.width;
      const y = (i * 211) % WORLD_SIZE.height;
      this.worldGraphics.fillCircle(x, y, 120 + (i % 5) * 36);
    }
    this.gridGraphics.lineStyle(1, 0xffffff, 0.06);
    for (let x = 0; x < WORLD_SIZE.width; x += 120) this.gridGraphics.lineBetween(x, 0, x, WORLD_SIZE.height);
    for (let y = 0; y < WORLD_SIZE.height; y += 120) this.gridGraphics.lineBetween(0, y, WORLD_SIZE.width, y);
    this.backgroundLabel.setText(world.name);
    this.backgroundLabel.setAlpha(0.18);
    this.dungeonSeal?.setTint(world.accent);
  }

  mergeKeyboardInput() {
    if (!this.keys) return;
    const keyboardX = Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown);
    const keyboardY = Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown);
    if (keyboardX || keyboardY) {
      const move = normalizeVector(keyboardX, keyboardY);
      this.actions.moveX = move.x;
      this.actions.moveY = move.y;
    } else if (!this.input.activePointer.isDown) {
      this.actions.moveX *= 0.92;
      this.actions.moveY *= 0.92;
      if (Math.abs(this.actions.moveX) < 0.02) this.actions.moveX = 0;
      if (Math.abs(this.actions.moveY) < 0.02) this.actions.moveY = 0;
    }
    this.actions.ability = this.actions.ability || this.keys.SPACE.isDown;
    this.actions.sprint = this.actions.sprint || this.keys.SHIFT.isDown;
  }

  updateAimFromPointer(pointer) {
    const worldPoint = pointer.positionToCamera(this.cameras.main);
    const state = this.stateRef.get();
    const aim = normalizeVector(worldPoint.x - state.player.x, worldPoint.y - state.player.y);
    this.actions.aimX = aim.x || this.actions.aimX;
    this.actions.aimY = aim.y || this.actions.aimY;
  }

  renderState(state) {
    this.player.setPosition(state.player.x, state.player.y);
    this.player.setTint(state.profile.power.color);
    this.powerAura.setPosition(state.player.x, state.player.y);
    this.powerAura.setFillStyle(state.profile.power.color, 0.18 + Math.sin(state.time / 180) * 0.04);
    this.dungeonSeal.setRotation(state.time / 2200);
    this.renderZone(state);
    this.renderLoot(state);
    this.renderShrines(state);
    this.renderPings(state);

    const seenMonsters = new Set();
    for (const monster of state.monsters) {
      const key = monster.isDemonKing || monster.isCommander ? "commander" : monster.role === "tank" ? "monster-tank" : "monster-stalker";
      let sprite = this.monsterSprites.get(monster.id);
      if (!sprite) {
        sprite = this.add.image(monster.x, monster.y, key);
        this.monsterSprites.set(monster.id, sprite);
      }
      sprite.setPosition(monster.x, monster.y);
      sprite.setScale(monster.isDemonKing ? 1.24 : 1);
      sprite.setAlpha(monster.revealedUntil > state.time ? 1 : monster.intent === "flank" ? 0.82 : 1);
      sprite.setTint(monster.revealedUntil > state.time ? 0xf4c15d : 0xffffff);
      seenMonsters.add(monster.id);
    }
    for (const [id, sprite] of this.monsterSprites.entries()) {
      if (!seenMonsters.has(id)) {
        sprite.destroy();
        this.monsterSprites.delete(id);
      }
    }

    const seenProjectiles = new Set();
    for (const projectile of state.projectiles) {
      let sprite = this.projectileSprites.get(projectile.id);
      if (!sprite) {
        sprite = this.add.image(projectile.x, projectile.y, "projectile");
        this.projectileSprites.set(projectile.id, sprite);
      }
      sprite.setPosition(projectile.x, projectile.y);
      sprite.setTint(projectile.color);
      sprite.setScale(projectile.empowered ? 1.25 : 0.82);
      seenProjectiles.add(projectile.id);
    }
    for (const [id, sprite] of this.projectileSprites.entries()) {
      if (!seenProjectiles.has(id)) {
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    }
  }

  renderZone(state) {
    this.zoneGraphics.clear();
    this.zoneGraphics.lineStyle(8, 0xe85d75, 0.72);
    this.zoneGraphics.strokeCircle(state.zone.x, state.zone.y, state.zone.radius);
    this.zoneGraphics.lineStyle(2, 0xf4c15d, 0.38);
    this.zoneGraphics.strokeCircle(state.zone.x, state.zone.y, Math.max(40, state.zone.radius - 30));
  }

  renderLoot(state) {
    const seen = new Set();
    const tintByKind = {
      potion: 0xe85d75,
      armor: 0x83a9ff,
      crystal: 0x8d6cff,
      artifact: 0xf4c15d
    };
    for (const loot of state.loot) {
      let sprite = this.lootSprites.get(loot.id);
      if (!sprite) {
        sprite = this.add.image(loot.x, loot.y, "loot-drop");
        this.lootSprites.set(loot.id, sprite);
      }
      sprite.setPosition(loot.x, loot.y);
      sprite.setTint(tintByKind[loot.kind] || 0x5ec6a8);
      sprite.setScale(1 + Math.sin((state.time + loot.x) / 260) * 0.08);
      seen.add(loot.id);
    }
    for (const [id, sprite] of this.lootSprites.entries()) {
      if (!seen.has(id)) {
        sprite.destroy();
        this.lootSprites.delete(id);
      }
    }
  }

  renderShrines(state) {
    const seen = new Set();
    for (const shrine of state.reviveShrines) {
      let sprite = this.shrineSprites.get(shrine.id);
      if (!sprite) {
        sprite = this.add.image(shrine.x, shrine.y, "revive-shrine");
        this.shrineSprites.set(shrine.id, sprite);
      }
      sprite.setPosition(shrine.x, shrine.y);
      sprite.setAlpha(shrine.active ? 0.92 : 0.28);
      sprite.setTint(shrine.active ? 0xf4c15d : 0x606875);
      seen.add(shrine.id);
    }
    for (const [id, sprite] of this.shrineSprites.entries()) {
      if (!seen.has(id)) {
        sprite.destroy();
        this.shrineSprites.delete(id);
      }
    }
  }

  renderPings(state) {
    const seen = new Set();
    for (const ping of state.pings) {
      let marker = this.pingSprites.get(ping.id);
      if (!marker) {
        marker = this.add.container(ping.x, ping.y);
        marker.add(this.add.image(0, 0, "ping-marker").setTint(0xe85d75));
        marker.add(this.add.text(18, -18, ping.text, {
          fontFamily: "system-ui",
          fontSize: "18px",
          color: "#f3f7ff",
          backgroundColor: "rgba(16,21,27,0.72)",
          padding: { x: 6, y: 4 }
        }));
        this.pingSprites.set(ping.id, marker);
      }
      marker.setPosition(ping.x, ping.y);
      marker.setAlpha(Math.min(1, ping.life / 1200));
      seen.add(ping.id);
    }
    for (const [id, marker] of this.pingSprites.entries()) {
      if (!seen.has(id)) {
        marker.destroy(true);
        this.pingSprites.delete(id);
      }
    }
  }
}
