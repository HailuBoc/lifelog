import "./config/env.js"; // ✅ Must be first to fix hoisting
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import lifelogRoutes from "./routes/lifelogRoutes.js";
import journalRoutes from "./routes/journalRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import coachRouter from "./routes/coach.js";
import authRoutes from "./routes/authRoutes.js";
 
connectDB();

const app = express();
app.use(cors());
app.use(express.json());
 
// API routes
app.use("/api/lifelog", lifelogRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/coach", coachRouter);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.send("LifeLog API running ✅"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
