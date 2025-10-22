"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";

export default function HomePage() {
  const [data, setData] = useState({
    todayMood: "",
    habits: [],
    journals: [],
    insights: [],
  });
  const [theme, setTheme] = useState("light");
  const [newJournal, setNewJournal] = useState("");
  const [moodDraft, setMoodDraft] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const statusRef = useRef(null);
  const [newHabit, setNewHabit] = useState("");

  const USER_ID = "demo"; // Replace with auth/user ID if implemented
  const API_BASE = "https://lifelog-7qzu.onrender.com/api/lifelog";

  const completedHabitsCount = data.habits.filter((h) => h.completed).length;

  // Fetch initial data from backend
  useEffect(() => {
    setPrefersReducedMotion(
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    fetch(`${API_BASE}/${USER_ID}`)
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch(() => {
        // fallback to empty data
        setData({
          todayMood: "😊 Happy",
          habits: [],
          journals: [],
          insights: [],
        });
      });

    const storedTheme = localStorage.getItem("lifelog:theme");
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = storedTheme || (prefersDark ? "dark" : "light");
    setTheme(currentTheme);
    document.documentElement.classList.toggle("dark", currentTheme === "dark");
  }, []);

  // Theme toggle
  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("lifelog:theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    announce(`Switched to ${newTheme} mode`);

    // Persist theme to backend if needed
    fetch(`${API_BASE}/${USER_ID}/theme`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  }

  // Accessibility announcer
  function announce(msg) {
    if (statusRef.current) {
      statusRef.current.textContent = msg;
      setTimeout(() => {
        if (statusRef.current) statusRef.current.textContent = "";
      }, 1200);
    }
  }

  // Update mood
  function updateMood() {
    if (!moodDraft.trim()) return;
    setData((d) => ({ ...d, todayMood: moodDraft.trim() }));
    fetch(`${API_BASE}/${USER_ID}/mood`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todayMood: moodDraft.trim() }),
    }).catch(() => {});
    setMoodDraft("");
    announce("Mood updated");
  }

  // Add journal
  // ...existing code...
  // Add journal
  function addJournalEntry() {
    if (!newJournal.trim()) return;

    // optimistic local entry so it appears immediately in Recent Entries
    const optimistic = {
      id: `local:${Date.now()}`,
      date: new Date().toISOString(),
      text: newJournal.trim(),
    };

    setData((d) => ({ ...d, journals: [optimistic, ...d.journals] }));
    setNewJournal("");
    announce("Journal entry added");

    // send to backend, replace optimistic entry with saved entry when returned
    fetch(`${API_BASE}/${USER_ID}/journal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: optimistic.text }),
    })
      .then((res) => res.json())
      .then((savedEntry) => {
        setData((d) => ({
          ...d,
          journals: d.journals.map((j) =>
            // match optimistic by its temporary id, replace with server entry
            j.id === optimistic.id ? savedEntry : j
          ),
        }));
      })
      .catch(() => {
        // keep optimistic entry if backend fails (no-op)
      });
  }

  // Remove journal
  function removeJournalEntry(id) {
    // if it's a local optimistic entry, remove locally without contacting backend
    if (String(id).startsWith("local:")) {
      setData((d) => ({
        ...d,
        journals: d.journals.filter((j) => (j.id ?? j._id) !== id),
      }));
      announce("Journal entry removed");
      return;
    }

    fetch(`${API_BASE}/${USER_ID}/journal/${id}`, { method: "DELETE" })
      .then(() =>
        setData((d) => ({
          ...d,
          journals: d.journals.filter((j) => (j._id ?? j.id) !== id),
        }))
      )
      .catch(() => {
        // ignore
      });
    announce("Journal entry removed");
  }
  // ...existing code...

  // Toggle habit
  // ...existing code...
  // Toggle habit
  function toggleHabit(id) {
    fetch(`${API_BASE}/${USER_ID}/habit/${id}/toggle`, { method: "PUT" })
      .then((res) => res.json())
      .then((updatedHabit) =>
        setData((d) => ({
          ...d,
          habits: d.habits.map((h) => (h._id === id ? updatedHabit : h)),
        }))
      )
      .catch(() => {});
    announce("Habit toggled");
  }

  // Set habit daily time (HH:MM) - updates UI optimistically and tries backend
  function setHabitTime(id) {
    const time = prompt(
      "Set daily time for this habit (HH:MM), leave blank to clear:"
    );
    if (time === null) return; // cancelled
    setData((d) => ({
      ...d,
      habits: d.habits.map((h) =>
        h._id === id || h.id === id ? { ...h, time: time || undefined } : h
      ),
    }));
    // persist to backend (best-effort)
    fetch(`${API_BASE}/${USER_ID}/habit/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ time: time || null }),
    }).catch(() => {});
    announce(time ? `Habit time set to ${time}` : "Habit time cleared");
  }

  // Set habit category/tag (e.g., Work, Personal)
  function setHabitCategory(id) {
    const cat = prompt(
      "Set habit category (e.g. Work, Personal), leave blank to clear:"
    );
    if (cat === null) return;
    setData((d) => ({
      ...d,
      habits: d.habits.map((h) =>
        h._id === id || h.id === id ? { ...h, category: cat || undefined } : h
      ),
    }));
    fetch(`${API_BASE}/${USER_ID}/habit/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: cat || null }),
    }).catch(() => {});
    announce(cat ? `Habit category set to ${cat}` : "Habit category cleared");
  }
  // ...existing code...

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 p-4 sm:p-6 transition-colors duration-500">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-sm bg-slate-900/50 border-b border-slate-800 rounded-b-md p-3 mb-4 flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="text-indigo-300 text-lg font-semibold">
            🧠 LifeLog
          </div>
          <div className="hidden md:inline text-slate-300 text-sm">
            Reflect • Track • Grow
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Mobile Nav Drawer */}
        <nav
          className={`md:w-64 w-full md:flex-shrink-0 md:block bg-slate-800/60 border border-slate-700 rounded-lg p-4 transition-transform duration-200 ease-in-out
            ${
              mobileNavOpen
                ? "translate-y-0"
                : "-translate-y-2 md:translate-y-0"
            } md:static md:translate-y-0`}
          role="navigation"
          aria-label="Main navigation"
        >
          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                className="block p-2 rounded-md hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                🏠 Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/journal"
                className="block p-2 rounded-md hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                📝 Journal
              </Link>
            </li>
            <li>
              <a
                href="/analytics"
                className="block p-2 rounded-md hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                📊 Analytics
              </a>
            </li>
            <li>
              <a
                href="/coach"
                className="block p-2 rounded-md hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                💬 Coach
              </a>
            </li>
            <li>
              <a
                href="/habits"
                className="block p-2 rounded-md hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                ⏱️ Habits
              </a>
            </li>
            <li>
              <a
                href="/settings"
                className="block p-2 rounded-md hover:bg-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                ⚙️ Settings
              </a>
            </li>
          </ul>
        </nav>

        {/* Main column */}
        <main className="flex-1">
          <div className="mx-auto max-w-5xl">
            {/* Quick Stats Grid (responsive) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* 🌤 Today’s Mood */}
              <div className="bg-slate-800/60 backdrop-blur-sm p-4 sm:p-5 rounded-xl shadow-neu border border-slate-700 transition transform duration-200 w-full max-w-md mx-auto">
                <h2 className="font-semibold text-slate-300 mb-1 text-base sm:text-lg">
                  Today’s Mood
                </h2>
                <p
                  className="text-xl sm:text-2xl text-indigo-300 transition-all duration-300 break-words"
                  aria-live="polite"
                >
                  {data.todayMood || "No mood set yet."}
                </p>

                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    value={moodDraft}
                    onChange={(e) => setMoodDraft(e.target.value)}
                    placeholder="Update mood (e.g., 😊 Excited)"
                    className="flex-1 rounded-md bg-slate-900/40 border border-slate-700 p-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    aria-label="Update mood"
                  />
                  <button
                    onClick={updateMood}
                    className="px-3 py-2 bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-sm font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* 🧠 Habit Tracker */}
              <div className="bg-slate-800/60 backdrop-blur-sm p-4 sm:p-5 rounded-xl shadow-neu border border-slate-700 transition transform duration-200 w-full max-w-md mx-auto">
                <h2 className="font-semibold text-slate-300 mb-2 flex justify-between items-center">
                  <span>Habit Progress</span>
                  <span className="text-xs text-slate-400">
                    {completedHabitsCount}/{data.habits.length} done
                  </span>
                </h2>

                {/* Progress Bar */}
                <div className="w-full bg-slate-900/30 rounded-full h-2.5 mb-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2.5 transition-all duration-500"
                    style={{
                      width:
                        data.habits.length > 0
                          ? `${
                              (completedHabitsCount / data.habits.length) * 100
                            }%`
                          : "0%",
                    }}
                  ></div>
                </div>

                {/* ➕ Add Habit */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newHabit.trim()) return;

                    try {
                      const res = await fetch(
                        `https://lifelog-7qzu.onrender.com/api/lifelog/${USER_ID}/habit`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: newHabit.trim() }),
                        }
                      );

                      const added = await res.json();
                      setData((prev) => ({
                        ...prev,
                        habits: [...prev.habits, added],
                      }));
                      setNewHabit("");
                    } catch (err) {
                      console.error("Error adding habit:", err);
                    }
                  }}
                  className="mt-3 flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Add new habit..."
                    value={newHabit}
                    onChange={(e) => setNewHabit(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md bg-slate-900/50 text-slate-100 placeholder-slate-500 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white text-sm transition"
                  >
                    Add
                  </button>
                </form>

                {/* 🗂 Habit List */}
                <ul className="mt-4 space-y-2" role="list">
                  {data.habits.length === 0 && (
                    <li className="text-slate-400 text-sm italic">
                      No habits yet. Add one!
                    </li>
                  )}

                  {data.habits.map((h) => (
                    <li
                      key={h._id || h.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/30 p-3 rounded-md transition-all duration-200 ${
                        h._toggling
                          ? "scale-95 opacity-70"
                          : "hover:scale-[1.01]"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-100">
                          {h.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          🔥 Streak: {h.streak}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `https://lifelog-7qzu.onrender.com/api/lifelog/${USER_ID}/habit/${h._id}/toggle`,
                                { method: "PUT" }
                              );
                              const updated = await res.json();
                              setData((prev) => ({
                                ...prev,
                                habits: prev.habits.map((x) =>
                                  x._id === h._id ? updated : x
                                ),
                              }));
                            } catch (err) {
                              console.error("Toggle error:", err);
                            }
                          }}
                          aria-pressed={h.completed}
                          className={`px-3 py-1 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 ${
                            h.completed
                              ? "bg-emerald-500 text-black"
                              : "bg-slate-700/60 text-white hover:bg-slate-700"
                          }`}
                        >
                          {h.completed ? "Done" : "Mark"}
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              await fetch(
                                `https://lifelog-7qzu.onrender.com/api/lifelog/${USER_ID}/habit/${h._id}`,
                                { method: "DELETE" }
                              );
                              setData((prev) => ({
                                ...prev,
                                habits: prev.habits.filter(
                                  (x) => x._id !== h._id
                                ),
                              }));
                            } catch (err) {
                              console.error("Delete error:", err);
                            }
                          }}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 rounded-md text-white text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 📖 Last Journal Entry */}
              <div className="bg-slate-800/60 backdrop-blur-sm p-4 sm:p-5 rounded-xl shadow-neu border border-slate-700 transition w-full max-w-md mx-auto">
                <h2 className="font-semibold text-slate-300 mb-2 text-base sm:text-lg">
                  Last Journal Entry
                </h2>
                <p className="text-slate-400 text-sm">
                  {data.journals.length
                    ? data.journals[0].text
                    : "No journal entries yet."}
                </p>
                <div className="mt-3 text-xs text-slate-500">
                  {data.journals.length
                    ? new Date(data.journals[0].date).toLocaleString()
                    : ""}
                </div>
              </div>
            </section>

            {/* Add Journal */}
            <section className="bg-slate-800/50 p-4 sm:p-6 rounded-2xl shadow-neu border border-slate-700 mb-6">
              <h2 className="text-lg font-bold text-slate-100 mb-2">
                New Journal Entry
              </h2>
              <textarea
                value={newJournal}
                onChange={(e) => setNewJournal(e.target.value)}
                placeholder="Write about your day..."
                className="w-full min-h-[90px] rounded-md p-3 bg-slate-900/40 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="New journal entry"
              />
              <div className="mt-3 flex justify-between items-center gap-2">
                <div className="text-xs text-slate-400">
                  Tip: press Enter + Ctrl to quickly add (keyboard accessible!)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewJournal("")}
                    className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Clear
                  </button>
                  <button
                    onClick={addJournalEntry}
                    className="px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-transform active:scale-95"
                  >
                    Add Entry
                  </button>
                </div>
              </div>
            </section>

            {/* Insights */}
            {/* AI Insights */}
            <section className="bg-gradient-to-r from-slate-800/50 via-slate-800/40 to-slate-900/40 p-4 sm:p-6 rounded-2xl shadow-neu border border-slate-700 mb-6">
              <h2 className="text-lg font-bold text-slate-100 mb-2">
                ✨ AI Insights
              </h2>
              <ul className="space-y-2 text-slate-300">
                {data.insights.length === 0 ? (
                  <li>Loading AI insights...</li>
                ) : (
                  data.insights.map((ins, i) => <li key={i}>{ins}</li>)
                )}
              </ul>
            </section>

            {/* Recent Journals (animated list) */}
            <section>
              <h2 className="text-lg font-bold text-slate-100 mb-4">
                Recent Journal Entries
              </h2>
              <div className="space-y-4">
                {data.journals.length === 0 && (
                  <div className="text-slate-400">No journal entries yet.</div>
                )}
                {data.journals.map((j, idx) => (
                  <article
                    key={`${j._id || j.id || "local"}-${idx}-${Date.now()}`}
                    role="article"
                    tabIndex={0}
                    className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 transition-transform hover:scale-[1.01]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm text-slate-300">
                        {new Date(j.date).toLocaleString()}
                      </div>
                      <button
                        onClick={() => removeJournalEntry(j._id)}
                        className="text-xs px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="mt-2 text-slate-100">{j.text}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
      {/* Rest of your existing dashboard */}
      {/* ⬇️ Your existing sections go here (mood, habits, journals, etc.) */}
      {/* Just paste back your full main dashboard code below this line */}
    </div>
  );
}
