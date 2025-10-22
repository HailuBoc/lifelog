import Journal from "../models/Journal.js";

export const getUserData = async (req, res) => {
  const { userId } = req.params;
  try {
    const journals = await Journal.find({ userId }).sort({ date: -1 });
    res.json({ journals });
  } catch (err) {
    res.status(500).json({ error: "Failed to load user data" });
  }
};

export const addJournal = async (req, res) => {
  const { userId } = req.params;
  const { text } = req.body;
  try {
    const newEntry = await Journal.create({ userId, text });
    res.json(newEntry);
  } catch (err) {
    res.status(500).json({ error: "Failed to add journal" });
  }
};

export const deleteJournal = async (req, res) => {
  const { userId, id } = req.params;
  try {
    await Journal.deleteOne({ _id: id, userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete journal" });
  }
};
