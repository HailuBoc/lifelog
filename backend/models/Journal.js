import mongoose from "mongoose";

const journalSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

export default mongoose.model("Journal", journalSchema);
