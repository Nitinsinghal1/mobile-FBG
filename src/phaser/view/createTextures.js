export function createTextures(scene) {
  if (scene.textures.exists("player-core")) return;
  makeCircle(scene, "player-core", 34, 0xf3f7ff, 0x10151b);
  makeCircle(scene, "monster-stalker", 28, 0xe85d75, 0x39161f);
  makeCircle(scene, "monster-tank", 40, 0xf4c15d, 0x453516);
  makeCircle(scene, "commander", 58, 0x8d6cff, 0x20163f);
  makeCircle(scene, "projectile", 18, 0xf3f7ff, 0x83a9ff);
  makeDiamond(scene, "dungeon-seal", 120, 0xf4c15d);
}

function makeCircle(scene, key, size, fill, stroke) {
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(fill, 1);
  graphics.lineStyle(4, stroke, 1);
  graphics.fillCircle(size / 2, size / 2, size / 2 - 4);
  graphics.strokeCircle(size / 2, size / 2, size / 2 - 4);
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}

function makeDiamond(scene, key, size, fill) {
  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
  graphics.fillStyle(fill, 0.24);
  graphics.lineStyle(4, fill, 0.9);
  graphics.beginPath();
  graphics.moveTo(size / 2, 0);
  graphics.lineTo(size, size / 2);
  graphics.lineTo(size / 2, size);
  graphics.lineTo(0, size / 2);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
  graphics.generateTexture(key, size, size);
  graphics.destroy();
}
