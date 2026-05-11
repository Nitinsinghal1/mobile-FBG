import { createClient } from "redis";
import { config } from "./env.mjs";

export let redis = null;

export async function initializeRedis() {
  try {
    redis = createClient({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    redis.on("error", (err) => console.log("[Redis] Error:", err));
    redis.on("connect", () => console.log("[Redis] Connected"));
    redis.on("reconnecting", () => console.log("[Redis] Reconnecting..."));

    await redis.connect();
    console.log("[Redis] Connected successfully");
  } catch (error) {
    console.error("[Redis] Connection failed:", error);
    throw error;
  }
}

export async function cacheGet(key) {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn("[Redis] Get error:", error);
    return null;
  }
}

export async function cacheSet(key, value, ttl = 3600) {
  try {
    await redis.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.warn("[Redis] Set error:", error);
  }
}

export async function cacheDelete(key) {
  try {
    await redis.del(key);
  } catch (error) {
    console.warn("[Redis] Delete error:", error);
  }
}

export async function cacheIncrement(key, ttl = 3600) {
  try {
    const val = await redis.incr(key);
    if (val === 1) await redis.expire(key, ttl);
    return val;
  } catch (error) {
    console.warn("[Redis] Increment error:", error);
    return 0;
  }
}
