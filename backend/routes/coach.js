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

router.use(authMiddleware);

// GET chat history
router.get("/", async (req, res) => {
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
  // We'll import the helper or just implement essentially the same thing here
  // But since we can't easily share the local helper, let's at least ensure defaults.
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

// POST new message & get AI reply
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { messages: history, newMessage } = req.body;

    if (!newMessage) return res.status(400).json({ error: "Message required" });

    // 1. Get user log
    let userLog = await getLog(userId);

    // 2. Add user message to DB
    const userMsg = { from: "user", text: newMessage.text, date: new Date() };
    if (!userLog.messages) userLog.messages = [];
    userLog.messages.push(userMsg);

    // 3. Get AI reply
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a gentle, empathetic AI life coach.
You help users process their emotions, improve habits, and reflect on daily moods.
Be warm, conversational, and emotionally aware.
Keep replies under 150 words.`,
        },
        ...userLog.messages.slice(-10).map((m) => ({
          role: m.from === "user" ? "user" : "assistant",
          content: m.text,
        })),
      ],
    });

    const replyText = completion.choices[0].message.content;
    const aiMsg = { from: "ai", text: replyText, date: new Date() };

    // 4. Add AI message to DB
    userLog.messages.push(aiMsg);
    await userLog.save();

    res.json({ reply: replyText });
  } catch (err) {
    console.error("Coach API error:", err);
    res.status(500).json({ error: "Failed to get AI reply" });
  }
});

// DELETE history
router.delete("/", async (req, res) => {
  try {
    const userId = req.user.id;
    await LifeLog.findOneAndUpdate({ userId }, { $set: { messages: [] } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

export default router;
