import express from "express";
import { getJournals } from "../controllers/journalController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET paginated journals
router.get("/", getJournals);

export default router;
