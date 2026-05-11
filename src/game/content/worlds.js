export const WORLDS = [
  {
    id: "ember",
    name: "Ember Wastes",
    shortName: "Ember",
    theme: 0xe85d75,
    accent: 0xf4c15d,
    hazard: "cinder storms",
    dungeon: "Ashen Vault",
    objective: "Break the furnace seals and defeat the Inferno Commander.",
    monsters: ["cinderling", "slag brute", "ember wraith"]
  },
  {
    id: "verdant",
    name: "Verdant Ruins",
    shortName: "Verdant",
    theme: 0x5ec6a8,
    accent: 0xb6f079,
    hazard: "living vines",
    dungeon: "Rootbound Labyrinth",
    objective: "Rescue the lost hero echo and tame the thorn gate.",
    monsters: ["moss fiend", "thorn stalker", "spore knight"]
  },
  {
    id: "frost",
    name: "Frost Rift",
    shortName: "Frost",
    theme: 0x83a9ff,
    accent: 0xf3f7ff,
    hazard: "shatter ice",
    dungeon: "Glassdeep Keep",
    objective: "Hold the beacon until the rift commander appears.",
    monsters: ["rime crawler", "mirror shade", "ice maw"]
  },
  {
    id: "void",
    name: "Void Citadel",
    shortName: "Void",
    theme: 0x8d6cff,
    accent: 0xe85d75,
    hazard: "gravity wells",
    dungeon: "Black Crown Spire",
    objective: "Survive the crown ritual and open the demon gate.",
    monsters: ["null seeker", "veil assassin", "abyss juggernaut"]
  }
];

export const WORLD_SIZE = {
  width: 2200,
  height: 1600
};

export function getWorld(id) {
  return WORLDS.find((world) => world.id === id) || WORLDS[0];
}
