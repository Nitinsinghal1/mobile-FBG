import jwt from "jsonwebtoken";
import { config } from "../config/env.mjs";

export function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(403).json({ error: "Invalid token" });
  }
}

export function generateToken(userId, email) {
  return jwt.sign(
    { userId, email },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRY }
  );
}

export function generateRefreshToken(userId) {
  return jwt.sign(
    { userId },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRY }
  );
}
