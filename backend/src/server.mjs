import express from "express";
import cors from "cors";
import helmet from "helmet";
import "express-async-errors";
import { config } from "./config/env.mjs";
import { initializeDatabase, pool } from "./config/database.mjs";
import { initializeRedis, redis } from "./config/redis.mjs";
import { errorHandler } from "./middleware/errorHandler.mjs";
import authRoutes from "./routes/auth.mjs";
import profileRoutes from "./routes/profile.mjs";
import leaderboardRoutes from "./routes/leaderboard.mjs";
import savesRoutes from "./routes/saves.mjs";
import chatRoutes from "./routes/chat.mjs";

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGINS || ["http://localhost:4173", "https://fourbattleground.com"],
  credentials: true
}));
app.use(express.json({ limit: "5mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/saves", savesRoutes);
app.use("/api/chat", chatRoutes);

// Error handling
app.use(errorHandler);

// Initialize and start
async function start() {
  try {
    console.log("[Server] Initializing database...");
    await initializeDatabase();
    
    console.log("[Server] Initializing Redis...");
    await initializeRedis();
    
    const PORT = config.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Server] SIGTERM received, shutting down gracefully...");
  try {
    await pool.end();
    await redis.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("[Server] Shutdown error:", error);
    process.exit(1);
  }
});

start();

export { app, pool, redis };
