import express from "express";
import {
  getLifeLog,
  updateMood,
  addJournal,
  deleteJournal,
  updateTheme,
  addHabit,
  toggleHabit,
  deleteHabit,
} from "../controllers/lifelogController.js";

const router = express.Router();

// GET user lifelog
router.get("/:userId", getLifeLog);

// MOOD
router.put("/:userId/mood", updateMood);

// JOURNALS
router.post("/:userId/journal", addJournal);
router.delete("/:userId/journal/:journalId", deleteJournal);

// HABITS
router.post("/:userId/habit", addHabit);
router.put("/:userId/habit/:habitId/toggle", toggleHabit);
router.delete("/:userId/habit/:habitId", deleteHabit);

// THEME
router.put("/:userId/theme", updateTheme);

export default router;
