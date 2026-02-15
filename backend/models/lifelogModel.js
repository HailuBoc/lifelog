import mongoose from "mongoose";

const habitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  completed: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
});

const journalSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  status: { type: String, enum: ["pending", "in-progress", "completed"], default: "pending" },
  dueDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

const lifeLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  todayMood: { type: String, default: "😊 Happy" },
  habits: [habitSchema],
  journals: [journalSchema],
  tasks: [taskSchema],
  messages: [
    {
      from: { type: String, enum: ["ai", "user"], required: true },
      text: { type: String, required: true },
      date: { type: Date, default: Date.now },
    },
  ],
  insights: [String],
  theme: { type: String, default: "light" },
  lastReset: { type: String }, // tracks last reset date
});

const LifeLog = mongoose.model("LifeLog", lifeLogSchema);
export default LifeLog;
