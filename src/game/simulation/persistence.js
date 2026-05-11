const SAVE_KEY = "four-worlds-save";
const LEADERBOARD_KEY = "four-worlds-leaderboard";

export function saveState(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
}

export function clearState() {
  localStorage.removeItem(SAVE_KEY);
}

export function saveLeaderboardEntry(entry) {
  const board = loadLeaderboard();
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board.slice(0, 20)));
  return board.slice(0, 20);
}

export function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
  } catch {
    return [];
  }
}
