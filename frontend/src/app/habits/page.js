"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useAuth from "@/hooks/useAuth";
import { store } from "@/lib/storage";

const defaultHabits = [
  { _id: "1", name: "Read 30 mins", completed: false, streak: 2 },
  { _id: "2", name: "Morning workout", completed: false, streak: 5 },
];

export default function HabitsPage() {
  const { user, token, loading } = useAuth(false);
  const [habits, setHabits] = useState([]);
  const [newName, setNewName] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const announceRef = useRef(null);
  const inputRef = useRef(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const LIFELOG_API = `${API_URL}/api/lifelog`;

  useEffect(() => {
    setPrefersReducedMotion(
      typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    async function loadHabits() {
      // First, always try to load from local storage for immediate display
      const saved = store.get(user?.id) || {};
      let localHabits = saved.habits ?? defaultHabits;
      
      // Data Migration: Ensure every habit has a unique _id as string
      localHabits = localHabits.map(h => {
        const finalId = (h._id || h.id || "").toString() || `local-${Math.random().toString(36).substr(2, 9)}`;
        return { ...h, _id: finalId };
      });
      
      setHabits(localHabits);
      
      // If we have a user and token, try backend to sync data
      if (user && token) {
        try {
          const res = await fetch(`${LIFELOG_API}`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (!res.ok) {
            console.warn("Backend unavailable, using local data");
          } else {
            const data = await res.json();
            const backendHabits = (Array.isArray(data.habits) ? data.habits : []).map(h => {
              const finalId = (h._id || h.id || "").toString() || `local-${Math.random().toString(36).substr(2, 9)}`;
              return { ...h, _id: finalId };
            });
            
            // Merge backend habits with local habits
            // For now, we'll prioritize backend but keep local if backend is empty
            const finalHabits = backendHabits.length > 0 ? backendHabits : localHabits;
            setHabits(finalHabits);
            
            // Save back to local storage
            const updatedStore = { ...saved, habits: finalHabits };
            store.set(user?.id, updatedStore);
            
            setIsInitialLoad(false);
            return;
          }
        } catch (e) {
          console.error("Backend load failed, using local data:", e);
        }
      }

      setIsInitialLoad(false);
    }

    if (!loading) {
      loadHabits();
    }
  }, [loading, user, token, LIFELOG_API]);

  // ✅ Save locally for offline use (ONLY AFTER INITIAL LOAD)
  useEffect(() => {
    if (isInitialLoad) return;
    
    try {
      const existing = store.get(user?.id) || {};
      existing.habits = habits;
      store.set(user?.id, existing);
    } catch (e) {
      // ignore
    }
  }, [habits, isInitialLoad, user?.id]);

  function announce(msg) {
    if (!announceRef.current) return;
    announceRef.current.textContent = msg;
    setTimeout(() => {
      if (announceRef.current) announceRef.current.textContent = "";
    }, 900);
  }

  async function addHabit() {
    const name = newName.trim();
    if (!name) return;
    
    // optimistic update
    const tempId = `local-${Date.now()}`;
    const h = { _id: tempId, name, completed: false, streak: 0, _entering: true };
    setHabits((s) => [h, ...s]);
    setNewName("");
    announce("Adding habit...");

      if (!user || !token) {
        // Guest mode - just finish
        setHabits((s) => s.map((item) => item._id === tempId ? { ...h, _entering: false } : item));
        announce("Habit added locally");
        return;
      }

    try {
      const res = await fetch(`${LIFELOG_API}/habit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name }),
      });
      const saved = await res.json();
      if (saved && saved._id) {
        setHabits((s) => s.map((item) => item._id === tempId ? saved : item));
      }
      announce("Habit added");
    } catch (err) {
      console.error(err);
      announce("Failed to add habit");
    }

    setTimeout(
      () =>
        setHabits((s) =>
          s.map((hh) => (hh.name === name ? { ...hh, _entering: false } : hh))
        ),
      prefersReducedMotion ? 0 : 300
    );
    inputRef.current?.focus();
  }

  async function toggleHabit(id) {
    if (!id) return;
    const idStr = id.toString();
    setHabits((s) =>
      s.map((h) => {
        if (h._id.toString() !== idStr) return h;
        const completed = !h.completed;
        return {
          ...h,
          completed,
          streak: completed
            ? (h.streak || 0) + 1
            : Math.max(0, (h.streak || 0) - 1),
          _toggling: true,
        };
      })
    );

    if (!user || !token) {
      announce("Local update saved");
      return;
    }

    try {
      const res = await fetch(`${LIFELOG_API}/habit/${id}/toggle`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) {
        console.warn("Toggle update failed - fallback to optimistic");
        return;
      }

      const updated = await res.json();
      if (!updated || !updated._id) return;

      setHabits((s) => s.map((h) => h._id.toString() === idStr ? { ...updated, _toggling: true } : h));
    } catch (err) {
      console.error(err);
      announce("Sync failed - reverting change.");
      // Revert optimistic change
      setHabits((s) =>
        s.map((h) => {
          if (h._id.toString() !== idStr) return h;
          const completed = !h.completed;
          return {
            ...h,
            completed,
            streak: completed
              ? (h.streak || 0) + 1
              : Math.max(0, (h.streak || 0) - 1),
          };
        })
      );
    }

    setTimeout(
      () => setHabits((s) => s.map((h) => h._id.toString() === idStr ? { ...h, _toggling: false } : h)),
      prefersReducedMotion ? 0 : 300
    );
    announce("Habit toggled");
  }

  async function removeHabit(id) {
    if (!id) return;
    const idStr = id.toString();
    
    // Truly optimistic delete: remove immediately
    setHabits((s) => s.filter((h) => (h._id || "").toString() !== idStr));
    announce("Habit removed");

    if (!user || !token) return;

    try {
      const res = await fetch(`${LIFELOG_API}/habit/${idStr}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        console.warn("Delete failed on server - but kept local removal for smoothness");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  const completedCount = habits.filter((h) => h.completed).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Guest Mode enabled

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-neu">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Habits & Goals
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Track progress, toggle completion, and build streaks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/habits/new"
              className="hidden sm:inline-flex items-center gap-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              ➕ Add New Habit
            </Link>
          </div>
        </header>

        {/* Add Form */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addHabit();
              if (e.key === "Escape") setNewName("");
            }}
            placeholder="Habit name (e.g., 'Meditate 10 mins')"
            aria-label="New habit name"
            className="sm:col-span-2 w-full rounded-md p-3 bg-slate-900/50 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setNewName("")}
              className="px-3 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Clear
            </button>
            <button
              onClick={addHabit}
              className="px-3 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Add
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-slate-300">Completed</div>
            <div className="text-2xl font-medium text-emerald-300">
              {completedCount}/{habits.length || 0}
            </div>
          </div>
          <div className="flex-1 ml-4">
            <div className="h-3 bg-slate-900/40 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${
                    habits.length ? (completedCount / habits.length) * 100 : 0
                  }%`,
                }}
                aria-hidden="true"
              />
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Consistency helps build lasting habits.
            </div>
          </div>
        </div>

        {/* List */}
        <ul className="mt-6 space-y-3">
          {habits.length === 0 && (
            <li className="text-center text-slate-400 py-6">
              No habits yet — add your first one.
            </li>
          )}

          {habits.map((h) => (
            <li
              key={h._id}
              className={`flex items-center justify-between gap-4 p-3 rounded-lg border border-slate-700 bg-slate-800/60 transition-transform duration-300
                ${h._entering ? "translate-y-2 opacity-0" : ""} ${
                h._removing
                  ? "opacity-0 -translate-x-4 scale-95"
                  : "hover:scale-[1.01]"
              } ${h._toggling ? "opacity-80 scale-95" : ""}`}
              tabIndex={0}
              aria-label={`${h.name}, streak ${h.streak}, ${
                h.completed ? "completed" : "not completed"
              }`}
            >
              <div>
                <div className="text-sm font-medium text-slate-100">
                  {h.name}
                </div>
                <div className="text-xs text-slate-400">Streak: {h.streak}</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleHabit(h._id)}
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
                  onClick={() => removeHabit(h._id)}
                  aria-label={`Remove ${h.name}`}
                  className="px-2 py-1 text-xs rounded-md bg-rose-600 hover:bg-rose-500 text-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 text-xs text-slate-400">
          Tip: use Enter to add, Esc to clear. Accessible controls and
          animations included.
        </div>

        <div className="sr-only" aria-live="polite" ref={announceRef} />
      </div>
    </section>
  );
}
// ...existing code...
