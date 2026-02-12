"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { store } from "@/lib/storage";

// ...existing code...

export default function HomePage() {
  const { user, token, loading, logout } = useAuth(false);
  const router = useRouter();
  const [data, setData] = useState({
    todayMood: "",
    habits: [],
    journals: [],
    insights: [],
  });
  const [theme, setTheme] = useState("light");
  const [newJournal, setNewJournal] = useState("");
  const [moodDraft, setMoodDraft] = useState("");
  const [statusRef, setStatusRef] = useState(null);
  const [newHabit, setNewHabit] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const statusElRef = useRef(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const API_BASE = `${API_URL}/api/lifelog`;

  const completedHabitsCount = (data?.habits || []).filter((h) => h?.completed).length;

  useEffect(() => {
    // Reduced motion
    setPrefersReducedMotion(
      typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    // Theme setup (apply before fetch so UI doesn't flash)
    try {
      const storedTheme = localStorage.getItem("lifelog:theme");
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const currentTheme = storedTheme || (prefersDark ? "dark" : "light");
      setTheme(currentTheme);
      document.documentElement.classList.toggle(
        "dark",
        currentTheme === "dark"
      );
    } catch {}
  }, []);

  // Fetch user lifelog when user is resolved
  useEffect(() => {
    async function load() {
      // If we have a user and token, try backend
      if (user && token) {
        try {
          const res = await fetch(`${API_BASE}`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (!res.ok) {
            console.warn(`Backend unavailable: ${res.status}`);
          } else {
            const resData = await res.json();
            const backendHabits = (Array.isArray(resData?.habits) ? resData.habits : []).map(h => {
              const finalId = (h._id || h.id || "").toString() || `local-${Math.random().toString(36).substr(2, 9)}`;
              return { ...h, _id: finalId };
            });
            
            setData({
              todayMood: resData?.todayMood || "😊 Happy",
              habits: backendHabits,
              journals: Array.isArray(resData?.journals) ? resData.journals : [],
              insights: Array.isArray(resData?.insights) ? resData.insights : ["Stay consistent!"],
            });
            setIsInitialLoad(false);
            return;
          }
        } catch (err) {
          console.error("Backend fetch failed, falling back to local:", err);
        }
      }

      // Guest or Backend Failure: Try dedicated local storage
      try {
        const saved = store.get(user?.id);
        if (saved) {
          setData(prev => ({
            ...prev,
            ...saved
          }));
        } else if (!user) {
          // Default guest data if nothing stored
          const guestHabits = [
            { _id: "default-1", name: "Read 30 mins", completed: false, streak: 0 },
            { _id: "default-2", name: "Exercise 20 mins", completed: false, streak: 0 },
            { _id: "default-3", name: "Meditate", completed: false, streak: 0 },
          ];
          
          setData({
            todayMood: "😊 Thinking",
            habits: guestHabits,
            journals: [],
            insights: ["Login to save your progress permanently!"],
          });
        }

        // Migration: Ensure all habits have unique _id as string
        setData(prev => ({
          ...prev,
          habits: (prev.habits || []).map(h => {
            const finalId = (h._id || h.id || "").toString() || `local-${Math.random().toString(36).substr(2, 9)}`;
            return { ...h, _id: finalId };
          })
        }));
      } catch (e) {
        console.error("Local load failed:", e);
      } finally {
        setIsInitialLoad(false);
      }
    }

    if (!loading) {
      load();
    }
  }, [loading, user, token, API_BASE]);
 
  // ✅ Save locally for offline use (ONLY AFTER INITIAL LOAD)
  useEffect(() => {
    if (isInitialLoad) return;
    
    // Safety check: don't wipe local if data is suspiciously empty
    if (!data || (data.todayMood === "" && !data.habits?.length)) return;

    try {
      store.set(user?.id, {
        todayMood: data.todayMood,
        habits: data.habits,
        journals: data.journals,
        insights: data.insights
      });
    } catch (e) {
      console.warn("Local sync fail:", e);
    }
  }, [data, isInitialLoad, user?.id]);

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    try {
      localStorage.setItem("lifelog:theme", newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    } catch {}
    announce(`Switched to ${newTheme} mode`);

    // Persist theme (optional)
    fetch(`${API_BASE}/theme`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ theme: newTheme }),
    }).catch(() => {});
  }

  function announce(msg) {
    if (statusRef.current) {
      statusRef.current.textContent = msg;
      setTimeout(() => {
        if (statusRef.current) statusRef.current.textContent = "";
      }, 1200);
    }
  }

  function handleLogout() {
    logout();
  }

  function updateMood() {
    if (!moodDraft.trim()) return;
    setData((d) => ({ ...d, todayMood: moodDraft.trim() }));
    fetch(`${API_BASE}/mood`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ todayMood: moodDraft.trim() }),
    }).catch(() => {});
    setMoodDraft("");
    announce("Mood updated");
  }
  function formatEntryDate(entry) {
    const raw = entry?.date ?? entry?.createdAt ?? entry?.timestamp ?? null;
    if (!raw) return "";

    const d = new Date(raw);
    if (isNaN(d)) return String(raw);

    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false, // optional, show 24h format
    });
  }

  function addJournalEntry() {
    if (!newJournal.trim()) return;
    const optimistic = {
      id: `local:${Date.now()}`,
      date: new Date().toISOString(),
      text: newJournal.trim(),
    };
    setData((d) => ({ ...d, journals: [optimistic, ...d.journals] }));
    setNewJournal("");
    announce("Journal entry added");

    fetch(`${API_BASE}/journal`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ text: optimistic.text }),
    })
      .then((res) => res.json())
      .then((savedEntry) => {
        setData((d) => ({
          ...d,
          journals: d.journals.map((j) =>
            j.id === optimistic.id ? savedEntry : j
          ),
        }));
      })
      .catch(() => {});
  }

  function removeJournalEntry(id) {
    if (String(id).startsWith("local:")) {
      setData((d) => ({
        ...d,
        journals: d.journals.filter((j) => (j.id ?? j._id) !== id),
      }));
      announce("Journal entry removed");
      return;
    }
    fetch(`${API_BASE}/journal/${id}`, { 
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(() =>
        setData((d) => ({
          ...d,
          journals: d.journals.filter((j) => (j._id ?? j.id) !== id),
        }))
      )
      .catch(() => {});
    announce("Journal entry removed");
  }

  function toggleHabit(id) {
    fetch(`${API_BASE}/habit/${id}/toggle`, { 
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
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

  function setHabitCategory(id) {
    const cat = prompt("Set habit category (e.g. Work, Personal):");
    if (cat === null) return;
    setData((d) => ({
      ...d,
      habits: d.habits.map((h) =>
        h._id === id || h.id === id ? { ...h, category: cat || undefined } : h
      ),
    }));
    fetch(`${API_BASE}/habit/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ category: cat || null }),
    }).catch(() => {});
    announce(cat ? `Habit category set` : "Habit category cleared");
  }

  // ...existing JSX UI remains unchanged...

  // ...existing code...
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Guest Mode is enabled, so we don't return null if !user

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 p-4 sm:p-6 transition-colors duration-500">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-sm bg-slate-900/50 border-b border-slate-800 rounded-b-md p-3 mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-indigo-300 text-lg font-semibold">
            🧠 LifeLog
          </div>
          <div className="hidden md:inline text-slate-300 text-sm">
            Reflect • Track • Grow
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link
                href="/login"
                className="hidden sm:inline px-3 py-1 rounded-md text-sm text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-md shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Create an account"
              >
                ➕ Sign up
              </Link>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 rounded-md text-sm text-white"
            >
              Log out
            </button>
          )}
        </div>
      </header>

      {/* === Main Dashboard === */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <nav
          className={`md:w-64 w-full md:flex-shrink-0 md:block bg-slate-800/60 border border-slate-700 rounded-lg p-4 transition-transform duration-200 ease-in-out ${
            mobileNavOpen ? "translate-y-0" : "-translate-y-2 md:translate-y-0"
          } md:static md:translate-y-0`}
          role="navigation"
        >
          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                className="block p-2 rounded-md hover:bg-slate-700/60"
              >
                🏠 Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/journal"
                className="block p-2 rounded-md hover:bg-slate-700/60"
              >
                📝 Journal
              </Link>
            </li>
            <li>
              <Link
                href="/analytics"
                className="block p-2 rounded-md hover:bg-slate-700/60"
              >
                📊 Analytics
              </Link>
            </li>
            <li>
              <Link
                href="/coach"
                className="block p-2 rounded-md hover:bg-slate-700/60"
              >
                💬 Coach
              </Link>
            </li>
            <li>
              <Link
                href="/habits"
                className="block p-2 rounded-md hover:bg-slate-700/60"
              >
                ⏱️ Habits
              </Link>
            </li>
            <li>
              <Link
                href="/settings"
                className="block p-2 rounded-md hover:bg-slate-700/60"
              >
                ⚙️ Settings
              </Link>
            </li>
          </ul>
        </nav>

        {/* === Main Content === */}
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
                        `${API_BASE}/habit`,
                        {
                          method: "POST",
                          headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
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
                      key={h._id}
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
                            if (!h._id) return;
                            const hId = h._id.toString();
                            // Optimistic Update
                            const isCompleted = !h.completed;
                            setData(prev => ({
                              ...prev,
                              habits: (prev.habits || []).map(item => item._id?.toString() === hId ? { 
                                ...item, 
                                completed: isCompleted,
                                streak: isCompleted ? (item.streak || 0) + 1 : Math.max(0, (item.streak || 0) - 1),
                                _toggling: true 
                              } : item)
                            }));

                            setTimeout(() => {
                              setData(prev => ({
                                ...prev,
                                habits: (prev.habits || []).map(item => item._id?.toString() === hId ? { ...item, _toggling: false } : item)
                              }));
                            }, 300);

                            if (!user || !token) return;

                            try {
                              const res = await fetch(
                                `${API_BASE}/habit/${hId}/toggle`,
                                { 
                                  method: "PUT",
                                  headers: {
                                    "Authorization": `Bearer ${token}`
                                  }
                                }
                              );
                                if (!res.ok) {
                                  console.warn("Toggle update failed - keeping optimistic state");
                                  return;
                                }
                              const updated = await res.json();
                              setData((prev) => ({
                                ...prev,
                                habits: (prev.habits || []).map((x) =>
                                  x._id?.toString() === hId ? updated : x
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
                            if (!h._id) return;
                            const hId = h._id.toString();
                            // Optimistic delete
                            setData(prev => ({
                              ...prev,
                              habits: (prev.habits || []).filter(item => (item._id || item.id)?.toString() !== hId)
                            }));

                            if (!user || !token) return;

                            try {
                                const res = await fetch(
                                  `${API_BASE}/habit/${hId}`,
                                  { 
                                    method: "DELETE",
                                    headers: {
                                      "Authorization": `Bearer ${token}`
                                    }
                                  }
                                );
                                if (!res.ok) {
                                  console.warn("Delete failed - reverting local list (next reload will fix)");
                                  return;
                                }
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
                    ? formatEntryDate(data.journals[0])
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
                    key={`${j._id || j.id || "local"}-${idx}`}
                    role="article"
                    tabIndex={0}
                    className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 transition-transform hover:scale-[1.01]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* ✅ Display local time consistently */}
                      <div className="text-sm text-slate-300">
                        {formatEntryDate(j)}
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
    </div>
  );
}

{
  /* Main column */
}
// ...existing code...

{
  /* Recent Journals (animated list) */
}
