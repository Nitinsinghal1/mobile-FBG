import express from "express";
import { query } from "../config/database.mjs";
import { cacheSet, cacheGet } from "../config/redis.mjs";
import { verifyToken } from "../middleware/auth.mjs";
import { ApiError } from "../middleware/errorHandler.mjs";

const router = express.Router();

// Get user profile
router.get("/me", verifyToken, async (req, res) => {
  try {
    const cached = await cacheGet(`profile:${req.user.userId}`);
    if (cached) return res.json(cached);

    const result = await query(
      "SELECT u.id, u.username, u.email, u.created_at, COUNT(p.id) as profiles FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = $1 GROUP BY u.id",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError("User not found", 404);
    }

    const user = result.rows[0];
    await cacheSet(`profile:${req.user.userId}`, user, 300);
    
    res.json(user);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Failed to get profile", 500);
  }
});

// Get profile progression
router.get("/progression", verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.id, p.codename, p.power_id, pr.worlds_conquered, pr.leaderboard_score, 
              pr.damage_done, pr.monsters_defeated, pr.deaths, pr.updated_at
       FROM profiles p
       LEFT JOIN progression pr ON p.id = pr.profile_id
       WHERE p.user_id = $1
       ORDER BY pr.updated_at DESC LIMIT 10`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    throw new ApiError("Failed to get progression", 500);
  }
});

// Create or update progression
router.post("/progression", verifyToken, async (req, res) => {
  const { profileId, worldsConquered, leaderboardScore, damageDone, monstersDefeated, deaths } = req.body;

  try {
    // Verify profile belongs to user
    const profile = await query("SELECT id FROM profiles WHERE id = $1 AND user_id = $2", [profileId, req.user.userId]);
    if (profile.rows.length === 0) {
      throw new ApiError("Profile not found", 404);
    }

    // Upsert progression
    const result = await query(
      `INSERT INTO progression (profile_id, worlds_conquered, leaderboard_score, damage_done, monsters_defeated, deaths)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (profile_id) DO UPDATE SET
         worlds_conquered = $2, leaderboard_score = $3, damage_done = $4, monsters_defeated = $5, deaths = $6, updated_at = NOW()
       RETURNING *`,
      [profileId, worldsConquered, leaderboardScore, damageDone, monstersDefeated, deaths]
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Failed to update progression", 500);
  }
});

export default router;
