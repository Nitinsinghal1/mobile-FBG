# Production Architecture Notes

## Client

- Phaser renders the top-down world, combat, effects, and camera.
- DOM owns HUD, chat, forum, menus, and story decisions for accessibility and mobile layout.
- Simulation state stays outside Phaser so it can move to an authoritative server later.
- Local storage is used only for this offline vertical slice.

## Online Services Needed

- Account service with platform login, player profile, selected magic bloodline, inventory, and season data.
- Matchmaking service for solo, permanent team, and temporary mission alliance queues.
- Authoritative gameplay server for movement, combat, monster AI state, dungeon progress, death timers, and rewards.
- Realtime messaging service for team chat, voice session signaling, and global forum moderation.
- Leaderboard service with fraud checks and season snapshots.
- AI service for story direction, NPC personality memory, monster strategy evolution, and toxicity moderation.

## AI Model Boundaries

The current build uses deterministic local AI so the game remains playable offline. A production version should keep high-risk decisions server-side:

- Account power selection can use a transparent model prompt plus rules-based fairness constraints.
- NPCs can use retrieval memory per player, but must be rate-limited and filtered.
- Monsters should use server-controlled utility AI with learned weights rather than unrestricted text generation during combat.
- Story branches can be model-generated, then validated by a narrative rules engine before becoming canon.

## Mobile Release Path

- Web/PWA can ship first for testing.
- Capacitor or a native shell can package the same client for Android/iOS while backend services mature.
- A later 3D client can preserve the simulation contracts if the server protocol is kept renderer-agnostic.
