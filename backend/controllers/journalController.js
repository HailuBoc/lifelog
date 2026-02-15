import LifeLog from "../models/lifelogModel.js";

// ✅ Get paginated journals for a user
export const getJournals = async (req, res) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    // Find user's lifelog document
    const userLog = await LifeLog.findOne({ userId });
    
    if (!userLog) {
      return res.json({
        journals: [],
        total: 0,
        totalPages: 0,
        currentPage: page,
      });
    }

    // Get total count of journals
    const total = userLog.journals.length;
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    // Get paginated journals (newest first)
    const journals = userLog.journals
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
      .slice(skip, skip + limit);

    res.json({
      journals,
      total,
      totalPages,
      currentPage: page,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
