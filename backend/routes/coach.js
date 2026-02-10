// routes/coach.js
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.use(authMiddleware);

router.post("/", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ error: "Invalid messages" });

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
        ...messages.map((m) => ({
          role: m.from === "user" ? "user" : "assistant",
          content: m.text,
        })),
      ],
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("Coach API error:", err);
    res.status(500).json({ error: "Failed to get AI reply" });
  }
});

export default router;
