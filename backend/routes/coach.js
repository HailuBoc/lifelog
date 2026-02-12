// routes/coach.js
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

import authMiddleware from "../middleware/authMiddleware.js";
import LifeLog from "../models/lifelogModel.js";

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Routes ---

// GET chat history (requires auth for DB history)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLog = await LifeLog.findOne({ userId });
    res.json({ messages: userLog?.messages || [] });
  } catch (err) {
    res.status(500).json({ error: "Failed to load history" });
  }
});

// Helper: unified log access
const getLog = async (userId) => {
  let userLog = await LifeLog.findOne({ userId });
  if (!userLog) {
    userLog = await LifeLog.create({ 
      userId, 
      messages: [],
      habits: [
        { name: "Read 30 mins" },
        { name: "Exercise 20 mins" },
        { name: "Meditate" },
      ],
      journals: [],
      todayMood: "😊 Happy",
      lastReset: new Date().toDateString()
    });
  }
  return userLog;
};

// POST new message & get AI reply (optional auth)
router.post("/", async (req, res) => {
  // Manual optional auth check
  let user = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const jwt = (await import("jsonwebtoken")).default;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret_key");
      user = decoded;
    } catch (e) {
      console.warn("Optional auth failed:", e.message);
    }
  }

  try {
    const { newMessage } = req.body;
    if (!newMessage) return res.status(400).json({ error: "Message required" });

    let userLog = null;
    if (user) {
      userLog = await getLog(user.id);
      const userMsg = { from: "user", text: newMessage.text, date: new Date() };
      if (!userLog.messages) userLog.messages = [];
      userLog.messages.push(userMsg);
    }

    let replyText;
    try {
      // Prepare messages for OpenAI
      const chatMessages = [
        {
          role: "system",
          content: `You are a gentle, empathetic AI life coach.
  You help users process their emotions, improve habits, and reflect on daily moods.
  Be warm, conversational, and emotionally aware.
  Keep replies under 150 words.`,
        }
      ];

      // Add history if available
      if (userLog && userLog.messages) {
        chatMessages.push(...userLog.messages.slice(-10).map((m) => ({
          role: m.from === "user" ? "user" : "assistant",
          content: m.text,
        })));
      } else {
        chatMessages.push({ role: "user", content: newMessage.text });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatMessages,
      });
      replyText = completion.choices[0].message.content;
    } catch (apiErr) {
      console.warn("OpenAI API fail, using fallback:", apiErr.message);
      const lower = newMessage.text.toLowerCase();
      if (lower.includes("sad") || lower.includes("bad") || lower.includes("low")) {
        replyText = "I'm sorry you're feeling this way. Remember that it's okay to have tough days. I'm here to listen if you want to share more about what's on your mind.";
      } else if (lower.includes("happy") || lower.includes("good") || lower.includes("great")) {
        replyText = "That's wonderful to hear! I love seeing you in such a great mood. What made your day so special today?";
      } else if (lower.includes("habit") || lower.includes("routine")) {
        replyText = "Building habits takes time and patience. You're doing the work just by being aware of it. How's your progress feeling overall?";
      } else {
        replyText = "I hear you. Thank you for sharing that with me. I'm here to support you in whatever you're going through today. Tell me more?";
      }
    }

    if (user && userLog) {
      const aiMsg = { from: "ai", text: replyText, date: new Date() };
      userLog.messages.push(aiMsg);
      await userLog.save();
    }

    res.json({ reply: replyText });
  } catch (err) {
    console.error("Coach API error:", err);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// DELETE history (requires auth)
router.delete("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await LifeLog.findOneAndUpdate({ userId }, { $set: { messages: [] } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

export default router;
