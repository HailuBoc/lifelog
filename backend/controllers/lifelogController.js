import LifeLog from "../models/lifelogModel.js";

// Helper: auto-reset habits daily
function resetDailyHabits(userLog) {
  const today = new Date().toDateString();
  if (userLog.lastReset !== today) {
    userLog.habits.forEach((h) => (h.completed = false));
    userLog.lastReset = today;
  }
}

// ✅ Get or create lifelog for user
export const getLifeLog = async (req, res) => {
  const { userId } = req.params;

  try {
    let userLog = await LifeLog.findOne({ userId });

    if (!userLog) {
      userLog = await LifeLog.create({
        userId,
        todayMood: "😊 Happy",
        habits: [
          { name: "Read 30 mins" },
          { name: "Exercise 20 mins" },
          { name: "Meditate" },
        ],
        journals: [],
        insights: ["Stay consistent!", "Reflect on progress weekly."],
        lastReset: new Date().toDateString(),
      });
    } else {
      resetDailyHabits(userLog);
      await userLog.save();
    }

    res.json(userLog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update mood
export const updateMood = async (req, res) => {
  const { userId } = req.params;
  const { todayMood } = req.body;

  try {
    const userLog = await LifeLog.findOneAndUpdate(
      { userId },
      { todayMood },
      { new: true }
    );
    res.json(userLog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Add a new habit
export const addHabit = async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;

  try {
    const userLog = await LifeLog.findOne({ userId });
    if (!userLog) return res.status(404).json({ message: "User not found" });

    const newHabit = { name, completed: false, streak: 0 };
    userLog.habits.push(newHabit);
    await userLog.save();

    res.json(userLog.habits[userLog.habits.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Toggle habit completion
export const toggleHabit = async (req, res) => {
  const { userId, habitId } = req.params;

  try {
    const userLog = await LifeLog.findOne({ userId });
    if (!userLog) return res.status(404).json({ message: "User not found" });

    const habit = userLog.habits.id(habitId);
    if (!habit) return res.status(404).json({ message: "Habit not found" });

    habit.completed = !habit.completed;
    habit.streak = habit.completed
      ? habit.streak + 1
      : Math.max(0, habit.streak - 1);

    await userLog.save();
    res.json(habit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete a habit
export const deleteHabit = async (req, res) => {
  const { userId, habitId } = req.params;

  try {
    const userLog = await LifeLog.findOne({ userId });
    if (!userLog) return res.status(404).json({ message: "User not found" });

    userLog.habits = userLog.habits.filter((h) => h._id.toString() !== habitId);
    await userLog.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Add journal entry
export const addJournal = async (req, res) => {
  const { userId } = req.params;
  const { text } = req.body;

  try {
    const userLog = await LifeLog.findOne({ userId });
    const newEntry = { text, date: new Date() };
    userLog.journals.unshift(newEntry);
    await userLog.save();

    res.json(userLog.journals[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete journal
export const deleteJournal = async (req, res) => {
  const { userId, journalId } = req.params;

  try {
    const userLog = await LifeLog.findOne({ userId });
    userLog.journals = userLog.journals.filter(
      (j) => j._id.toString() !== journalId
    );
    await userLog.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update theme
export const updateTheme = async (req, res) => {
  const { userId } = req.params;
  const { theme } = req.body;

  try {
    const userLog = await LifeLog.findOneAndUpdate(
      { userId },
      { theme },
      { new: true }
    );
    res.json(userLog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Search habits and journals
export const searchLifeLog = async (req, res) => {
  const { userId } = req.params;
  const { q } = req.query;

  if (!q) return res.status(400).json({ message: "Query is required" });

  try {
    const userLog = await LifeLog.findOne({ userId });
    if (!userLog) return res.status(404).json({ message: "User not found" });

    const query = q.toLowerCase();
    const results = [];

    // Search habits
    userLog.habits.forEach((h) => {
      if (h.name.toLowerCase().includes(query)) {
        results.push({
          type: "Habit",
          text: h.name,
          date: userLog.updatedAt || new Date(),
        });
      }
    });

    // Search journals
    userLog.journals.forEach((j) => {
      if (j.text.toLowerCase().includes(query)) {
        results.push({
          type: "Journal",
          text: j.text,
          date: j.date || j.createdAt,
        });
      }
    });

    res.json({
      results: results.sort((a, b) => new Date(b.date) - new Date(a.date)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
