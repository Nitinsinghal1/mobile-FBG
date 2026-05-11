# Four Worlds Battleground

Four Worlds Battleground is a mobile-first playable foundation for a magic survival-conquest game. The pitch is close to the pressure of a battle royale, but the core fantasy is different: every player receives an AI-selected magic bloodline, teleports between four worlds, fights adaptive monsters, clears dungeons, makes story-shaping decisions, and wins by conquering all four worlds.

This repository is a production-oriented vertical slice. It is not a complete online PUBG-scale MMO yet, but the code is structured so the local/offline systems can later be replaced by authoritative multiplayer, real accounts, cloud leaderboards, voice chat, and hosted AI services without rewriting the Phaser scene.

## Current Status

- Playable mobile web game prototype
- Static PWA, installable in supported mobile browsers
- No build step required in the current environment
- Phaser loads from the jsDelivr CDN
- Local storage is used for save data and leaderboard records
- Chat, forum, and AI behavior are simulated locally as backend-ready surfaces
- New survival systems include world corruption, auto-loot, tactical artifacts, squad pings, and revive shrines

## Quick Start

```powershell
node server.mjs
```

Open:

```text
http://localhost:4173
```

The current workspace does not expose `npm`, so the app intentionally avoids a package install step. It runs from static files through `server.mjs` and loads Phaser from jsDelivr.

## Tests

```powershell
node tests/simulation.test.mjs
node scripts/check-syntax.mjs
```

Validated areas:

- Account power selection is deterministic for the same account inputs
- Four world state is created correctly
- Seven demon kings and fifteen commanders exist in the story roster
- Team mode creates four hero companions
- Leaderboard score responds to skill performance
- World conquest grants reward gear and story choices
- Temporary mission alliances are supported
- Death timers match the requested rules
- Sanctuary shield does not allow passive dungeon progress
- Corruption zones damage players outside safe magic
- Auto-loot equips superior armor and clears picked drops
- Tactical artifacts, pings, and shrine recall are covered by simulation tests
- JavaScript syntax checks pass across source, scripts, and tests

## Game Loop

1. Create a fighter with a codename, mode, and instinct.
2. The fate engine assigns a magic bloodline.
3. Enter the first world with a temporary sanctuary shield.
4. Move, attack, cast powers, and survive monster pressure.
5. Stay inside the shrinking corruption zone or take damage.
6. Auto-loot stronger armor, potions, crystals, and tactical artifacts from defeated enemies.
7. Use artifacts, pings, and revive shrines to keep the run alive.
8. Teleport between the four worlds.
9. Defeat monsters, commanders, and dungeon threats.
10. Conquer a world to unlock reward gear and a story decision.
11. Make choices that affect trust, allies, score, and future routes.
12. Conquer all four worlds to win.
13. Rank by world progress, skill, reward score, story choices, and team level.

## Player Modes

### Solo Legend

Solo players are supported as a self-contained campaign path. They receive the solo legend companion concept and recover after one hour when defeated.

### Hero Team

Team mode creates four named hero companions. Team death rules follow the requested design:

- If one member falls and at least one player survives, defeated members return after 30 minutes.
- If the whole team is wiped, the team can deploy again after 1 day.
- Temporary mission alliances can be created through story choices.
- Revive shrines can recall fallen team members when the surviving player reaches an active shrine.

## Magic Powers

Account creation assigns one of the current power bloodlines:

- Pyroclasm
- Stormbind
- Verdant Oath
- Voidmark
- Sunveil

The assignment is deterministic in this local build so players can reproduce the same account result from the same codename and instinct. In production, this can be replaced by a server-side AI selection service with fairness constraints and audit logging.

## Worlds

The game currently includes four conquerable worlds:

- Ember Wastes
- Verdant Ruins
- Frost Rift
- Void Citadel

Each world has:

- Distinct visual color treatment
- Dungeon objective
- Environmental hazard description
- Monster set
- Teleport gate
- Conquest progress
- Reward/story trigger
- A shrinking corruption zone that forces movement toward danger and objectives
- Two revive shrines for team recovery

## Enemies And Story Roster

The narrative roster includes:

- 7 demon kings
- 15 commanders
- 4 team heroes
- 1 solo legend
- NPC archetypes used by the adaptive story/event system

Monsters use a lightweight local adaptive-memory model. They react to player behavior such as ranged attacks, ability usage, teleport frequency, and monster defeats. This keeps the prototype playable offline while preserving a clean boundary for server-hosted AI later.

## Rewards

World conquest can unlock special weapons and outfits, including:

- Sun Splitter
- Thorn Regalia
- Glass Veil
- Void Anchor
- Commander Mask
- Oath Pistol

Rewards contribute to leaderboard score and are stored in the local save state.

## Survival And Tactical Systems

The current build adds several battle-royale-inspired systems reshaped for the magic world:

- World corruption: a shrinking danger ring damages players outside safe magic.
- Auto-loot: nearby drops are picked up automatically for mobile comfort.
- Superior armor: stronger runic armor auto-equips when found.
- Potions and crystals: supplies restore health, mana, and artifact charges.
- Tactical artifacts: Seer Orb, Shield Totem, Rift Anchor, and Monster Lure provide scouting, defense, control, and monster manipulation.
- Squad pings: quick tactical marks can be sent for enemies, monsters, dungeons, teleport gates, healing, retreat, and attack calls.
- Revive shrines: team mode can recover fallen allies through active shrines.

## Story Branching

After a world conquest, the player receives story choices. Choices can affect:

- NPC trust
- Reward score
- Temporary allies
- Future story branch count
- Monster adaptation pressure

The current system calculates exponential possible routes from repeated decisions. The authored branch choices are intentionally small in this vertical slice, but the simulation boundary is ready for a generated narrative service.

## Controls

### Mobile

- Left joystick: move
- Attack: fire a magic projectile
- Power: cast bloodline ability
- Dash: sprint while mana is available
- Menu: open world, gear, team, pings, chat, and forum panels

### Desktop

- `WASD` or arrow keys: move
- Pointer/touch direction: aim
- Click/tap: attack
- `Space`: cast power
- `Shift`: sprint

## Mobile UX

The HUD is designed for a phone-first playfield:

- Top strip shows identity, power, health, mana, and world status.
- Bottom strip keeps movement and action buttons near thumbs.
- Side drawer holds dense systems like teleport, team, chat, and forum.
- Gear and ping panels keep tactical controls out of the playfield until needed.
- Sanctuary shield prevents instant punishment while a new player reads the HUD.
- Dungeon progress is disabled while sanctuary shield is active, so progression still requires real engagement.

## Architecture

The project follows a game/runtime split:

```text
src/
  game/
    content/              Authored worlds, rosters, rewards
    input/                Action state and vector helpers
    simulation/           Saveable gameplay state and rules
      systems/            AI director, combat, progression
  phaser/
    scenes/               Phaser scene orchestration
    view/                 Texture and render helpers
  ui/                     DOM HUD and menus
```

Important rule: Phaser renders the game, but simulation state is the source of truth. This makes the project easier to test and prepares it for an authoritative server.

## Main Files

- `index.html` - app shell and account/game screens
- `src/main.js` - bootstraps saved state and Phaser
- `src/phaser/scenes/GameplayScene.js` - world rendering and scene integration
- `src/game/simulation/state.js` - profile and initial game state
- `src/game/simulation/systems/combat.js` - movement, combat, monster behavior, teleporting
- `src/game/simulation/systems/progression.js` - conquest, rewards, death timers, leaderboard scoring
- `src/game/simulation/systems/aiDirector.js` - local power selection, adaptive memory, NPC/story decisions
- `src/game/simulation/systems/survival.js` - corruption zones, auto-loot, artifacts, pings, and revive shrines
- `src/ui/hud.js` - mobile HUD, drawer panels, chat/forum, story modal
- `docs/production-architecture.md` - production backend and AI service notes

## Persistence

The current build saves locally with `localStorage`.

Production should replace this with:

- Authenticated player profiles
- Server-side inventory
- Server-side death timers
- Season leaderboard records
- Match history
- Team membership and temporary alliance records

## PWA Support

Included:

- `manifest.webmanifest`
- `sw.js`
- SVG app icon
- Fullscreen mobile display mode
- App-shell caching for the static client

Phaser is loaded from a CDN in this repository version, so complete offline play depends on the browser cache or a future package/build step that bundles Phaser locally.

## Production Backend Roadmap

To turn this vertical slice into a real online game, add:

- Account/auth service
- Authoritative gameplay server
- Matchmaking for solo, teams, and temporary missions
- Realtime state sync
- Persistent inventory/rewards
- Anti-cheat validation
- Voice chat and team signaling
- Text chat moderation
- Global forum backend
- Cloud leaderboard service
- Hosted NPC and monster AI service
- Narrative branch validation service
- Analytics and balancing dashboards

## AI Safety And Design Notes

The production AI layer should be constrained:

- Power selection should be explainable and fairness-checked.
- NPC dialogue should be moderated and grounded in approved lore.
- Monster adaptation should use server-approved utility weights, not unrestricted live generation.
- Story generation should pass through a rules engine before affecting progression.
- Leaderboard and reward decisions should never be delegated directly to a generative model.

## Deployment Options

Simple web deploy:

1. Serve the repository root as static files.
2. Ensure `src/`, `assets/`, `manifest.webmanifest`, and `sw.js` are public.
3. Use HTTPS for PWA installation and service worker support.

Mobile wrapper path:

- Package the static client with Capacitor or a native WebView shell.
- Keep multiplayer and account logic server-side.
- Reuse the simulation contracts for future native or 3D clients.

## Known Limitations

- No real multiplayer server yet
- No real account authentication yet
- No live voice transport yet
- Chat and forum are local UI simulations
- AI is deterministic/local rather than hosted
- Art is procedural/simple placeholder art
- Combat is a 2D top-down vertical slice, not a full 3D shooter
- Tactical systems are local simulation rules, not network-authoritative yet

## GitHub Publish Notes

This project was prepared for `Nitinsinghal1/mobile-FBG` as the initial vertical slice.
