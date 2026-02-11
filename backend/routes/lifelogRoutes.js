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

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// GET user lifelog
router.get("/", getLifeLog);

// MOOD
router.put("/mood", updateMood);

// JOURNALS
router.post("/journal", addJournal);
router.delete("/journal/:journalId", deleteJournal);

// HABITS
router.post("/habit", addHabit);
router.put("/habit/:habitId/toggle", toggleHabit);
router.delete("/habit/:habitId", deleteHabit);

// THEME
router.put("/theme", updateTheme);

// SEARCH
router.get("/search", (req, res, next) => {
  // We'll implement searchHabitsJournals in the controller
  import("../controllers/lifelogController.js").then(m => m.searchLifeLog(req, res));
});

export default router;
