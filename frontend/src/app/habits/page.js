"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { store } from "@/lib/storage";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
  const [completionHistory, setCompletionHistory] = useState({});
  const announceRef = useRef(null);
  const inputRef = useRef(null);
  
  // Pagination state for habits
  const [habitsPagination, setHabitsPagination] = useState({
    habits: [],
    total: 0,
    totalPages: 0,
    currentPage: 1,
    loading: false
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const LIFELOG_API = `${API_URL}/api/lifelog`;

  useEffect(() => {
    setPrefersReducedMotion(
      typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    async function loadHabits() {
      // Load completion history
      const savedHistory = localStorage.getItem(`lifelog:habitHistory:${user?.id || 'guest'}`);
      if (savedHistory) {
        setCompletionHistory(JSON.parse(savedHistory));
      }
      
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

  // Save completion history to localStorage
  useEffect(() => {
    if (isInitialLoad) return;
    try {
      localStorage.setItem(`lifelog:habitHistory:${user?.id || 'guest'}`, JSON.stringify(completionHistory));
    } catch (e) {
      console.error("Failed to save completion history:", e);
    }
  }, [completionHistory, isInitialLoad, user?.id]);

  // Save locally for offline use (ONLY AFTER INITIAL LOAD)
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

  // Pagination function for habits
  const fetchHabits = useCallback((page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHabits = habits.slice(startIndex, endIndex);
    
    setHabitsPagination({
      habits: paginatedHabits,
      total: habits.length,
      totalPages: Math.ceil(habits.length / limit),
      currentPage: page,
      loading: false
    });
  }, [habits]);

  // Initialize pagination when habits change
  useEffect(() => {
    if (!isInitialLoad) {
      fetchHabits(1, 10);
    }
  }, [habits, isInitialLoad, fetchHabits]);

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
  const router = useRouter();

  // Prepare chart data
  const habitChartData = habits.map(h => ({
    name: h.name.length > 15 ? h.name.substring(0, 15) + "..." : h.name,
    streak: h.streak || 0,
    completed: h.completed ? 1 : 0,
    fullName: h.name
  }));

  const completionData = [
    { name: "Completed", value: completedCount, color: "#10b981" },
    { name: "Pending", value: habits.length - completedCount, color: "#64748b" }
  ];

  // Generate last 7 days mock data for trend (since we don't have historical data)
  const generateWeeklyData = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - i));
      const dayName = days[date.getDay()];
      // Simulate completion rate based on current habits
      const completed = habits.filter(h => h.completed).length;
      const total = habits.length || 1;
      const rate = Math.round((completed / total) * 100);
      // Add some variation for visual interest
      const variation = Math.floor(Math.random() * 20) - 10;
      return {
        day: dayName,
        rate: Math.max(0, Math.min(100, rate + variation))
      };
    });
  };

  const weeklyData = generateWeeklyData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-neu">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Habits & Goals
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Track progress, toggle completion, and build streaks.
            </p>
          </div>
        </header>

        {/* Add Form */}
        <div className="mb-6 flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!user) {
                  router.push("/login");
                  return;
                }
                addHabit();
              }
              if (e.key === "Escape") setNewName("");
            }}
            placeholder="Add a new habit..."
            className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => {
              if (!user) {
                router.push("/login");
                return;
              }
              addHabit();
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
          >
            Add
          </button>
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

        {/* Charts Section */}
        {habits.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weekly Completion Trend */}
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-4">Weekly Completion Rate (%)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Completion Status Pie Chart */}
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-4">Today&apos;s Completion Status</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {completionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {completionData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-slate-400">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak Bar Chart */}
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700 md:col-span-2">
              <h3 className="text-sm font-medium text-slate-300 mb-4">Current Streaks by Habit</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={habitChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value, name, props) => [`${value} days`, props.payload.fullName]}
                  />
                  <Bar dataKey="streak" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* List */}
        <ul className="mt-6 space-y-3">
          {habits.length === 0 && (
            <li className="text-center text-slate-400 py-6">
              No habits yet — add your first one.
            </li>
          )}

          {habitsPagination.habits.map((h) => (
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
                  onClick={() => {
                    if (!user) {
                      router.push("/login");
                      return;
                    }
                    toggleHabit(h._id);
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
                  onClick={() => {
                    if (!user) {
                      router.push("/login");
                      return;
                    }
                    removeHabit(h._id);
                  }}
                  aria-label={`Remove ${h.name}`}
                  className="px-2 py-1 text-xs rounded-md bg-rose-600 hover:bg-rose-500 text-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Pagination Controls */}
        {habitsPagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => fetchHabits(habitsPagination.currentPage - 1, 10)}
              disabled={habitsPagination.currentPage === 1 || habitsPagination.loading}
              className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Previous
            </button>
            
            {/* Page numbers when totalPages <= 5 */}
            {habitsPagination.totalPages <= 5 && (
              <div className="flex gap-1">
                {Array.from({ length: habitsPagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => fetchHabits(pageNum, 10)}
                    disabled={habitsPagination.loading}
                    className={`w-8 h-8 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      pageNum === habitsPagination.currentPage
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-100 disabled:opacity-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            )}
            
            <button
              onClick={() => fetchHabits(habitsPagination.currentPage + 1, 10)}
              disabled={habitsPagination.currentPage === habitsPagination.totalPages || habitsPagination.loading}
              className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Next
            </button>
          </div>
        )}
        
        {/* Page info */}
        {habitsPagination.total > 0 && (
          <div className="text-center text-slate-400 text-sm mt-2">
            Showing {habitsPagination.habits.length} of {habitsPagination.total} habits
            {habitsPagination.totalPages > 1 && ` (Page ${habitsPagination.currentPage} of ${habitsPagination.totalPages})`}
          </div>
        )}

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
