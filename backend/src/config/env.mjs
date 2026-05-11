import dotenv from "dotenv";

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "5000"),
  
  // Database
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: parseInt(process.env.DB_PORT || "5432"),
  DB_NAME: process.env.DB_NAME || "four_worlds",
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "password",
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379"),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-key-change-in-production",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  JWT_EXPIRY: process.env.JWT_EXPIRY || "15m",
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || "7d",
  
  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:4173"],
  
  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || "12"),
  
  // Features
  ENABLE_RATE_LIMIT: process.env.ENABLE_RATE_LIMIT !== "false",
  ENABLE_SAVE_VALIDATION: process.env.ENABLE_SAVE_VALIDATION !== "false"
};

// Validate required config
const required = ["JWT_SECRET", "DB_PASSWORD"];
for (const key of required) {
  if (!config[key] && config.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
