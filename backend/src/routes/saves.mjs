import express from "express";
import { query } from "../config/database.mjs";
import { verifyToken } from "../middleware/auth.mjs";
import { ApiError } from "../middleware/errorHandler.mjs";
import { updateLeaderboardEntry } from "./leaderboard.mjs";

const router = express.Router();

// Save game state
router.post("/save", verifyToken, async (req, res) => {
  const { gameState, checksum } = req.body;

  if (!gameState || !gameState.profile || typeof gameState !== "object") {
    throw new ApiError("Invalid game state", 400);
  }

  try {
    // Get or create profile
    let profile = await query(
      "SELECT id FROM profiles WHERE user_id = $1 AND codename = $2",
      [req.user.userId, gameState.profile.codename]
    );

    let profileId;
    if (profile.rows.length === 0) {
      const newProfile = await query(
        `INSERT INTO profiles (user_id, codename, power_id, mode, instinct)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [req.user.userId, gameState.profile.codename, gameState.profile.power.id, gameState.profile.mode, gameState.profile.instinct]
      );
      profileId = newProfile.rows[0].id;
    } else {
      profileId = profile.rows[0].id;
    }

    // Save game state
    const saveState = await query(
      `INSERT INTO game_saves (profile_id, state_data, checksum, version)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (profile_id) DO UPDATE SET
         state_data = $2, checksum = $3, updated_at = NOW()
       RETURNING id, updated_at`,
      [profileId, JSON.stringify(gameState), checksum || ""]
    );

    // Update leaderboard
    const score = gameState.leaderboardScore || 0;
    const worldsConquered = gameState.stats?.worldsConquered || 0;
    await updateLeaderboardEntry(profileId, gameState.profile.codename, score, worldsConquered);

    res.json({
      ok: true,
      saveId: saveState.rows[0].id,
      savedAt: saveState.rows[0].updated_at
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Failed to save game state", 500);
  }
});

// Load game state
router.get("/load/:codename", verifyToken, async (req, res) => {
  const { codename } = req.params;

  try {
    const result = await query(
      `SELECT gs.state_data, gs.updated_at, gs.checksum
       FROM game_saves gs
       JOIN profiles p ON gs.profile_id = p.id
       WHERE p.user_id = $1 AND p.codename = $2
       LIMIT 1`,
      [req.user.userId, codename]
    );

    if (result.rows.length === 0) {
      throw new ApiError("Save not found", 404);
    }

    const save = result.rows[0];
    res.json({
      gameState: save.state_data,
      savedAt: save.updated_at,
      checksum: save.checksum
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Failed to load game state", 500);
  }
});

// List all saves
router.get("/", verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.codename, gs.updated_at, p.mode, p.power_id
       FROM game_saves gs
       JOIN profiles p ON gs.profile_id = p.id
       WHERE p.user_id = $1
       ORDER BY gs.updated_at DESC
       LIMIT 20`,
      [req.user.userId]
    );

    res.json({ saves: result.rows });
  } catch (error) {
    throw new ApiError("Failed to list saves", 500);
  }
});

// Delete save
router.delete("/:codename", verifyToken, async (req, res) => {
  const { codename } = req.params;

  try {
    const result = await query(
      `DELETE FROM game_saves
       WHERE profile_id IN (
         SELECT id FROM profiles WHERE user_id = $1 AND codename = $2
       )
       RETURNING profile_id`,
      [req.user.userId, codename]
    );

    if (result.rows.length === 0) {
      throw new ApiError("Save not found", 404);
    }

    res.json({ ok: true, deleted: codename });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Failed to delete save", 500);
  }
});

export default router;
