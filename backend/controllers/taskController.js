import LifeLog from "../models/lifelogModel.js";

// ✅ Get all tasks for a user
export const getTasks = async (req, res) => {
  const userId = req.user.id;

  try {
    const userLog = await LifeLog.findOne({ userId });
    
    if (!userLog) {
      return res.json({ tasks: [] });
    }

    // Sort tasks by createdAt (newest first)
    const tasks = userLog.tasks.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Add a new task
export const addTask = async (req, res) => {
  const userId = req.user.id;
  const { title, description, priority, dueDate } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }

  try {
    let userLog = await LifeLog.findOne({ userId });
    
    if (!userLog) {
      userLog = await LifeLog.create({
        userId,
        todayMood: "😊 Happy",
        habits: [],
        journals: [],
        tasks: [],
        messages: [],
        insights: ["Stay consistent!", "Reflect on progress weekly."],
        lastReset: new Date().toDateString(),
      });
    }

    const newTask = {
      title: title.trim(),
      description: description?.trim() || "",
      priority: priority || "medium",
      status: "pending",
      dueDate: dueDate ? new Date(dueDate) : null,
      createdAt: new Date(),
    };

    userLog.tasks.push(newTask);
    await userLog.save();

    res.json(userLog.tasks[userLog.tasks.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update a task
export const updateTask = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;
  const { title, description, priority, status, dueDate } = req.body;

  try {
    const userLog = await LifeLog.findOne({ userId });
    
    if (!userLog) {
      return res.status(404).json({ message: "User not found" });
    }

    const task = userLog.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description?.trim() || "";
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) {
      task.status = status;
      if (status === "completed" && !task.completedAt) {
        task.completedAt = new Date();
      } else if (status !== "completed") {
        task.completedAt = null;
      }
    }
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;

    await userLog.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete a task
export const deleteTask = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;

  try {
    const userLog = await LifeLog.findOne({ userId });
    
    if (!userLog) {
      return res.status(404).json({ message: "User not found" });
    }

    userLog.tasks = userLog.tasks.filter((t) => t._id.toString() !== taskId);
    await userLog.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Toggle task status (quick complete/uncomplete)
export const toggleTask = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;

  try {
    const userLog = await LifeLog.findOne({ userId });
    
    if (!userLog) {
      return res.status(404).json({ message: "User not found" });
    }

    const task = userLog.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status === "completed") {
      task.status = "pending";
      task.completedAt = null;
    } else {
      task.status = "completed";
      task.completedAt = new Date();
    }

    await userLog.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
