import { createGameState, createProfile } from "./game/simulation/state.js";
import { loadState, saveState } from "./game/simulation/persistence.js";
import { GameplayScene } from "./phaser/scenes/GameplayScene.js";

const accountScreen = document.getElementById("account-screen");
const gameScreen = document.getElementById("game-screen");
const accountForm = document.getElementById("account-form");

let phaserGame = null;
let state = loadState();
const stateRef = {
  get: () => state,
  set: (next) => {
    state = next;
  }
};

if (state?.profile) {
  startGame(state);
}

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(accountForm);
  const profile = createProfile({
    codename: formData.get("codename"),
    mode: formData.get("mode"),
    instinct: formData.get("instinct")
  });
  state = createGameState(profile);
  saveState(state);
  startGame(state);
});

function startGame(initialState) {
  stateRef.set(initialState);
  globalThis.__FOUR_WORLDS_STATE_REF__ = stateRef;
  accountScreen.classList.remove("is-active");
  gameScreen.classList.add("is-active");
  if (phaserGame) return;

  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game-root",
    backgroundColor: "#080b10",
    scale: {
      mode: Phaser.Scale.RESIZE,
      parent: "game-root",
      width: window.innerWidth,
      height: window.innerHeight
    },
    render: {
      antialias: true,
      pixelArt: false
    },
    scene: [GameplayScene]
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is nice to have in development; failure should not block the game.
    });
  });
}
