import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import lifelogRoutes from "./routes/lifelogRoutes.js";
import journalRoutes from "./routes/journalRoutes.js";
import coachRouter from "./routes/coach.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/lifelog", lifelogRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/coach", coachRouter);
app.get("/", (req, res) => res.send("LifeLog API running ✅"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
