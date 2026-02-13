
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

// Explicitly setup for OpenRouter
const BASE_URL = "https://openrouter.ai/api/v1";
const KEY = process.env.OPENAI_API_KEY;

console.log("Testing OpenRouter...");
console.log("URL:", BASE_URL);
console.log("Key Prefix:", KEY ? KEY.substring(0, 10) + "..." : "MISSING");

const openai = new OpenAI({
  apiKey: KEY,
  baseURL: BASE_URL,
});

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.2-3b-instruct:free", // Updated to valid model
      messages: [
        { role: "user", content: "Hello! Are you working?" }
      ],
      extraHeaders: {
        "HTTP-Referer": "https://lifelog.app", 
        "X-Title": "LifeLog AI Coach Debug",
      },
    });

    console.log("✅ Success!");
    console.log("Response:", completion.choices[0].message.content);
  } catch (error) {
    console.error("❌ Failed!");
    console.error("Error Type:", error.constructor.name);
    console.error("Message:", error.message);
    if (error.response) {
        console.error("Status:", error.status);
        console.error("Data:", JSON.stringify(error.response.data || {}, null, 2));
    }
  }
}

main();
