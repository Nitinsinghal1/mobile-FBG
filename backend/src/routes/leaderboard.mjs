import express from "express";
import { query } from "../config/database.mjs";
import { cacheGet, cacheSet, cacheDelete } from "../config/redis.mjs";
import { verifyToken } from "../middleware/auth.mjs";
import { ApiError } from "../middleware/errorHandler.mjs";

const router = express.Router();

// Get global leaderboard
router.get("/global", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "100"), 1000);
  const offset = Math.max(parseInt(req.query.offset || "0"), 0);

  try {
    const cached = await cacheGet(`leaderboard:global:${Math.floor(offset / limit)}`);
    if (cached) return res.json(cached);

    const result = await query(
      `SELECT id, username, score, worlds_conquered, rank_global, updated_at
       FROM leaderboard
       WHERE season = 1
       ORDER BY score DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const data = { entries: result.rows, total: result.rows.length, offset, limit };
    await cacheSet(`leaderboard:global:${Math.floor(offset / limit)}`, data, 3600);

    res.json(data);
  } catch (error) {
    throw new ApiError("Failed to get leaderboard", 500);
  }
});

// Get regional leaderboard
router.get("/regional/:region", async (req, res) => {
  const { region } = req.params;
  const limit = Math.min(parseInt(req.query.limit || "100"), 1000);
  const offset = Math.max(parseInt(req.query.offset || "0"), 0);

  if (!["us", "eu", "asia", "oceania"].includes(region)) {
    throw new ApiError("Invalid region", 400);
  }

  try {
    const cached = await cacheGet(`leaderboard:${region}:${Math.floor(offset / limit)}`);
    if (cached) return res.json(cached);

    const result = await query(
      `SELECT id, username, score, worlds_conquered, rank_region, updated_at
       FROM leaderboard
       WHERE season = 1 AND rank_region = $1
       ORDER BY score DESC
       LIMIT $2 OFFSET $3`,
      [region, limit, offset]
    );

    const data = { entries: result.rows, total: result.rows.length, offset, limit, region };
    await cacheSet(`leaderboard:${region}:${Math.floor(offset / limit)}`, data, 1800);

    res.json(data);
  } catch (error) {
    throw new ApiError("Failed to get regional leaderboard", 500);
  }
});

// Get player rank
router.get("/me", verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, username, score, worlds_conquered, rank_global, rank_region, updated_at
       FROM leaderboard
       WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = $1)
       ORDER BY score DESC LIMIT 1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ message: "No leaderboard entry yet" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    throw new ApiError("Failed to get player rank", 500);
  }
});

// Update leaderboard (internal, called after save)
export async function updateLeaderboardEntry(profileId, username, score, worldsConquered, region = "us") {
  try {
    await query(
      `INSERT INTO leaderboard (profile_id, username, score, worlds_conquered, rank_region, season)
       VALUES ($1, $2, $3, $4, $5, 1)
       ON CONFLICT (profile_id) DO UPDATE SET
         score = $3, worlds_conquered = $4, rank_region = $5, updated_at = NOW()`,
      [profileId, username, score, worldsConquered, region]
    );

    // Invalidate cache
    for (let i = 0; i < 10; i++) {
      await cacheDelete(`leaderboard:global:${i}`);
      await cacheDelete(`leaderboard:${region}:${i}`);
    }
  } catch (error) {
    console.error("[Leaderboard] Update failed:", error);
  }
}

export default router;
