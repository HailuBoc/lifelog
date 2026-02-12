
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./backend/models/userModel.js";

dotenv.config({ path: "./backend/.env" });

const API_URL = "http://localhost:5000/api";

async function test() {
  console.log("--- TEST: Mood Persistence (with DB Setup) ---");

  // 1. Connect to DB
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI missing");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB Connected");

  // 2. Create Verified User
  const email = `moodtest_${Date.now()}@example.com`;
  const password = "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: "Mood Tester",
    email,
    passwordHash,
    isVerified: true,
    reminders: true,
    timezone: "UTC"
  });
  console.log(`User created: ${email}`);

  // 3. Login to get token
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error("Login failed:", loginData);
    process.exit(1);
  }
  const token = loginData.token;
  console.log("Got token.");

  // 4. Set Mood
  const mood = "🚀 Testing Mood Persistence";
  console.log(`Setting mood to: ${mood}`);
  const moodRes = await fetch(`${API_URL}/lifelog/mood`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ todayMood: mood }),
  });

  if (!moodRes.ok) {
    console.error("Set mood failed:", await moodRes.text());
    process.exit(1);
  }
  console.log("Set mood success.");

  // 5. Get Lifelog to verify
  console.log("Fetching lifelog to verify...");
  const getRes = await fetch(`${API_URL}/lifelog`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  const getData = await getRes.json();
  console.log("Current Mood in DB:", getData.todayMood);

  // Cleanup
  await User.deleteOne({ _id: user._id });
  // Also clean lifelog if possible, but minimal impact
  await mongoose.disconnect();

  if (getData.todayMood === mood) {
    console.log("✅ SUCCESS: Mood persisted correctly.");
    process.exit(0);
  } else {
    console.error(`❌ FAILURE: Expected '${mood}' but got '${getData.todayMood}'.`);
    process.exit(1);
  }
}

test();
