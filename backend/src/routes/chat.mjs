import express from "express";
import { query } from "../config/database.mjs";
import { verifyToken } from "../middleware/auth.mjs";
import { ApiError } from "../middleware/errorHandler.mjs";

const router = express.Router();

// Get messages from a room
router.get("/:room", verifyToken, async (req, res) => {
  const { room } = req.params;
  const limit = Math.min(parseInt(req.query.limit || "50"), 100);

  if (!["team", "forum"].includes(room)) {
    throw new ApiError("Invalid room", 400);
  }

  try {
    const result = await query(
      `SELECT id, sender_id, (SELECT username FROM users WHERE id = sender_id) as from, content, created_at
       FROM chat_messages
       WHERE room = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [room, limit]
    );

    res.json({ room, messages: result.rows.reverse() });
  } catch (error) {
    throw new ApiError("Failed to get messages", 500);
  }
});

// Post message to a room
router.post("/:room", verifyToken, async (req, res) => {
  const { room } = req.params;
  const { content } = req.body;

  if (!["team", "forum"].includes(room)) {
    throw new ApiError("Invalid room", 400);
  }

  if (!content || content.trim().length === 0 || content.length > 500) {
    throw new ApiError("Invalid message content", 400);
  }

  try {
    const safeContent = content.replace(/[<>]/g, "").trim();

    const result = await query(
      `INSERT INTO chat_messages (sender_id, room, content)
       VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [req.user.userId, room, safeContent]
    );

    res.status(201).json({
      id: result.rows[0].id,
      room,
      from: req.user.email,
      content: safeContent,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    throw new ApiError("Failed to post message", 500);
  }
});

// Delete message (own only)
router.delete("/:room/:messageId", verifyToken, async (req, res) => {
  const { room, messageId } = req.params;

  try {
    const result = await query(
      `DELETE FROM chat_messages
       WHERE id = $1 AND sender_id = $2 AND room = $3
       AND created_at > NOW() - INTERVAL '1 hour'
       RETURNING id`,
      [messageId, req.user.userId, room]
    );

    if (result.rows.length === 0) {
      throw new ApiError("Message not found or cannot be deleted", 404);
    }

    res.json({ ok: true, deleted: messageId });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Failed to delete message", 500);
  }
});

export default router;
