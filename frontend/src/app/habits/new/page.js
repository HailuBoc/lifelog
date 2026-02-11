"use client";
import { useState } from "react";

export default function NewHabitPage() {
  const [habit, setHabit] = useState("");

  return (
    <section className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
        Add a New Habit
      </h1>
      <input
        type="text"
        placeholder="Habit name (e.g., 'Read 30 mins')"
        value={habit}
        onChange={(e) => setHabit(e.target.value)}
        className="mt-4 w-full border border-slate-300 dark:border-slate-700 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md">
        Save Habit
      </button>
    </section>
  );
}
// ...existing code...
