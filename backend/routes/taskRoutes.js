import express from "express";
import { getTasks, addTask, updateTask, deleteTask, toggleTask } from "../controllers/taskController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET all tasks
router.get("/", getTasks);

// POST create new task
router.post("/", addTask);

// PUT update task
router.put("/:taskId", updateTask);

// DELETE task
router.delete("/:taskId", deleteTask);

// PUT toggle task status (quick complete/uncomplete)
router.put("/:taskId/toggle", toggleTask);

export default router;
