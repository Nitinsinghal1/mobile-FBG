export const DEFAULT_ACTION_STATE = {
  moveX: 0,
  moveY: 0,
  aimX: 1,
  aimY: 0,
  attack: false,
  ability: false,
  teleport: null,
  interact: false,
  sprint: false
};

export function createActionState() {
  return { ...DEFAULT_ACTION_STATE };
}

export function normalizeVector(x, y) {
  const length = Math.hypot(x, y);
  if (!length) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}
