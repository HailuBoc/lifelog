import express from "express";
import {
  getUserData,
  addJournal,
  deleteJournal,
} from "../controllers/journalController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/:userId", getUserData);
router.post("/:userId/journal", addJournal);
router.delete("/:userId/journal/:id", deleteJournal);

export default router;
