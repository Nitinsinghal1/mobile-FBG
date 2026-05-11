import pkg from "pg";
import { config } from "./env.mjs";

const { Pool } = pkg;

export const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("[Database] Unexpected error on idle client:", err);
});

export async function initializeDatabase() {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    console.log("[Database] Connected successfully at", result.rows[0].now);
  } catch (error) {
    console.error("[Database] Connection failed:", error);
    throw error;
  }
}

export async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (error) {
    console.error("[Database] Query error:", error);
    throw error;
  }
}
