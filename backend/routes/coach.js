// routes/coach.js
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

import authMiddleware from "../middleware/authMiddleware.js";
import LifeLog from "../models/lifelogModel.js";

const router = express.Router();

// ✅ Support for OpenRouter or Standard OpenAI
const BASE_URL = process.env.OPENAI_BASE_URL || (process.env.OPENAI_API_KEY?.startsWith("sk-or-") ? "https://openrouter.ai/api/v1" : undefined);

console.log("🔑 OpenAI API Key:", process.env.OPENAI_API_KEY ? "Set" : "Not set");
console.log("🌐 Base URL:", BASE_URL || "Default OpenAI");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: BASE_URL,
});

// --- Routes ---

// GET chat history (requires auth for DB history)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLog = await LifeLog.findOne({ userId });
    
    // ✅ Ensure client receives 'id' for key props
    const messages = (userLog?.messages || []).map(m => ({
      ...m.toObject(),
      id: m._id || m.id || Date.now() + Math.random() // Fallback if _id missing
    }));

    res.json({ messages });
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
    let savedUserMsg = null;

    if (user) {
      userLog = await getLog(user.id);
      const userMsg = { from: "user", text: newMessage.text, date: new Date() };
      
      if (!userLog.messages) userLog.messages = [];
      userLog.messages.push(userMsg);
      
      // Save primarily to generate _id
      await userLog.save();
      savedUserMsg = userLog.messages[userLog.messages.length - 1]; // Get the saved msg with _id
    }

    let replyText;
    let modelUsed = "gpt-4o-mini"; 
    let apiError = null;

    // Adjust model if using OpenRouter
    const modelsToTry = [];
    if (BASE_URL?.includes("openrouter")) {
      modelsToTry.push(
        "meta-llama/llama-3.2-3b-instruct",
        "mistralai/mistral-7b-instruct", 
        "meta-llama/llama-3.2-1b-instruct",
        "huggingfaceh4/zephyr-7b-beta"
      );
    } else {
      modelsToTry.push(modelUsed);
    }

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
      // Exclude the just-added message to avoid duplication in context if needed, 
      // but here we grab the last 10 ignoring the one we *just* pushed 
      // (actually we just pushed it, so it's in the DB. Let's include it for context)
      chatMessages.push(...userLog.messages.slice(-11, -1).map((m) => ({ // Slice carefully
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      })));
    }
    
    chatMessages.push({ role: "user", content: newMessage.text });

    // Try each model until one works
    for (const model of modelsToTry) {
      try {
        modelUsed = model;
        console.log("🤖 Making AI API call with model:", modelUsed);
        console.log("🌐 Using base URL:", BASE_URL);

        const completion = await openai.chat.completions.create({
          model: modelUsed, 
          messages: chatMessages,
          // OpenRouter specific headers (optional but good practice)
          extraHeaders: BASE_URL?.includes("openrouter") ? {
            "HTTP-Referer": "https://lifelog.app", 
            "X-Title": "LifeLog AI Coach",
          } : undefined,
        });
        replyText = completion.choices[0].message.content;
        console.log("✅ AI reply received:", replyText?.substring(0, 50) + "...");
        break; // Success! Exit the loop
      } catch (apiErr) {
        apiError = apiErr;
        console.error(`❌ Model ${model} failed:`, {
          message: apiErr.message,
          status: apiErr.status,
          code: apiErr.code,
          type: apiErr.type
        });
        
        // If this is the last model, we'll use fallback
        if (model === modelsToTry[modelsToTry.length - 1]) {
          console.warn("All models failed, using fallback response");
        }
      }
    }

    // If all models failed, use fallback logic
    if (!replyText) {
      console.warn("AI API fail, using fallback:", apiError?.message);
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

    let savedAiMsg = { from: "ai", text: replyText, date: new Date(), id: Date.now() }; // Default ID if not saved

    if (user && userLog) {
      const aiMsg = { from: "ai", text: replyText, date: new Date() };
      userLog.messages.push(aiMsg);
      await userLog.save();
      savedAiMsg = userLog.messages[userLog.messages.length - 1]; // Get real _id
    }

    // Return the reply AND the IDs so frontend can update keys
    res.json({ 
      reply: replyText,
      userMsgId: savedUserMsg?._id || Date.now(),
      aiMsgId: savedAiMsg._id || savedAiMsg.id || Date.now() + 1
    });

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
