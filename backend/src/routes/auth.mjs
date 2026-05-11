import express from "express";
import bcrypt from "bcrypt";
import { query } from "../config/database.mjs";
import { cacheSet, cacheDelete } from "../config/redis.mjs";
import { generateToken, generateRefreshToken, verifyToken } from "../middleware/auth.mjs";
import { ApiError } from "../middleware/errorHandler.mjs";
import { config } from "../config/env.mjs";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  const { email, username, password, confirmPassword } = req.body;

  if (!email || !username || !password || password !== confirmPassword) {
    throw new ApiError("Invalid input", 400);
  }

  if (password.length < 8) {
    throw new ApiError("Password must be at least 8 characters", 400);
  }

  try {
    // Check if user exists
    const existing = await query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username]);
    if (existing.rows.length > 0) {
      throw new ApiError("User already exists", 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

    // Create user
    const result = await query(
      "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username",
      [email, username, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      user: { id: user.id, email: user.email, username: user.username },
      token,
      refreshToken
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Signup failed", 500);
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError("Missing email or password", 400);
  }

  try {
    const result = await query("SELECT id, email, username, password_hash FROM users WHERE email = $1 AND is_active = true", [email]);

    if (result.rows.length === 0) {
      throw new ApiError("Invalid email or password", 401);
    }

    const user = result.rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      throw new ApiError("Invalid email or password", 401);
    }

    // Update last login
    await query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    const token = generateToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      user: { id: user.id, email: user.email, username: user.username },
      token,
      refreshToken
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Login failed", 500);
  }
});

// Refresh token
router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError("Missing refresh token", 400);
  }

  try {
    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    const token = generateToken(decoded.userId, null);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    res.json({ token, refreshToken: newRefreshToken });
  } catch (error) {
    throw new ApiError("Invalid refresh token", 401);
  }
});

// Logout
router.post("/logout", verifyToken, async (req, res) => {
  // Invalidate refresh tokens by clearing cache
  await cacheDelete(`refresh_tokens:${req.user.userId}`);
  
  res.json({ ok: true });
});

export default router;
