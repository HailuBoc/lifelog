import { useEffect, useMemo, useRef, useState } from "react";
import useAuth from "@/hooks/useAuth";

const STORAGE_KEY = "lifelog:data:v1";

/* simple localStorage wrapper */
function createStorage(key) {
  let memory = null;
  const hasLocal =
    typeof window !== "undefined" && typeof window.localStorage !== "undefined";

  return {
    get() {
      if (!hasLocal) return memory;
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : memory;
      } catch {
        return memory;
      }
    },
    set(value) {
      memory = value;
      if (!hasLocal) return;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
    clear() {
      memory = null;
      if (!hasLocal) return;
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };
}

const store = createStorage(STORAGE_KEY);

const STOPWORDS = new Set([
  "the",
  "and",
  "a",
  "to",
  "is",
  "it",
  "in",
  "of",
  "for",
  "on",
  "i",
  "you",
  "my",
  "that",
  "was",
  "with",
  "as",
  "at",
  "this",
  "be",
]);

function formatDateKey(d) {
  const dt = new Date(d);
  return dt.toISOString().split("T")[0];
}

/* Hydration-safe sparkline bar chart */
function SparkBars({ points = [] }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const max = Math.max(1, ...points);
  const safePoints = isClient ? points : points.map(() => 0);

  return (
    <div className="flex items-end gap-1 h-16">
      {safePoints.map((v, i) => (
        <div
          key={i}
          className="w-1/12 bg-indigo-500/80 rounded-t-sm transition-all duration-500"
          style={{ height: `${(v / max) * 100}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// --- AI-style insight generator ---
function generateInsights(journals = [], habits = [], rangeDays = 14) {
  const insights = [];

  // Journal stats
  const counts = Array(rangeDays).fill(0);
  const today = new Date();
  const map = new Map();
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (rangeDays - 1 - i));
    const key = formatDateKey(d);
    counts[i] = 0;
    map.set(key, 0);
  }
  journals.forEach((j) => {
    const key = formatDateKey(j.date || j.createdAt || Date.now());
    if (map.has(key)) map.set(key, map.get(key) + 1);
  });
  const totalEntries = Array.from(map.values()).reduce((a, b) => a + b, 0);

  if (totalEntries === 0)
    insights.push("No journaling yet — start small, even a line a day!");
  else if (totalEntries >= rangeDays)
    insights.push("Amazing streak! Your journaling habit is strong.");
  else
    insights.push(
      `You've written ${totalEntries} entries in the last ${rangeDays} days. Keep going!`
    );

  // Habit stats
  const totalHabits = habits.length;
  const completedHabits = habits.filter((h) => h.completed).length;
  if (totalHabits === 0)
    insights.push("No habits tracked yet — add one and start small!");
  else if (completedHabits === totalHabits)
    insights.push("Excellent! All habits completed consistently.");
  else if (completedHabits === 0)
    insights.push(
      "Looks like habits need some love — try focusing on one at a time."
    );
  else
    insights.push(
      `You've completed ${completedHabits}/${totalHabits} habits. Keep up the momentum!`
    );

  // Mood / emotional words
  const moodWords = {};
  journals.forEach((j) => {
    j.text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .forEach((w) => {
        if (!w || STOPWORDS.has(w) || w.length < 3) return;
        moodWords[w] = (moodWords[w] || 0) + 1;
      });
  });
  const sortedWords = Object.entries(moodWords).sort((a, b) => b[1] - a[1]);
  if (sortedWords.length > 0) {
    const topWords = sortedWords.slice(0, 5).map(([w]) => w);
    insights.push(`Common themes in your journal: ${topWords.join(", ")}.`);
  }

  // Random tip
  const tips = [
    "Remember to take a deep breath and pause for a moment.",
    "Reflect on one small win today — it helps build positivity.",
    "Even writing a single line can help you process your thoughts.",
    "Consistency beats intensity — small steps matter.",
    "Check in with yourself — what’s one thing you’re grateful for?",
  ];
  insights.push(tips[Math.floor(Math.random() * tips.length)]);

  return insights;
}

// --- Main component ---
export default function AnalyticsPage() {
  const { user, token, loading } = useAuth();
  const [data, setData] = useState({ journals: [], habits: [], insights: [] });
  const [rangeDays, setRangeDays] = useState(14);
  const announceRef = useRef(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const LIFELOG_API = `${API_URL}/api/lifelog`;

  useEffect(() => {
    async function load() {
      if (!user || !token) return;
      try {
        const res = await fetch(`${LIFELOG_API}/${user.id}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Backend unavailable");
        const resData = await res.json();
        setData(resData);
      } catch (e) {
        const saved = store.get();
        if (saved) setData(saved);
      }
    }

    if (!loading) {
      load();
    }
  }, [loading, user, token, LIFELOG_API]);

  // Update insights automatically
  useEffect(() => {
    const insights = generateInsights(data.journals, data.habits, rangeDays);
    setData((prev) => ({ ...prev, insights }));
  }, [data.journals, data.habits, rangeDays]);

  function clearAllData() {
    if (!confirm("Clear all stored LifeLog data? This cannot be undone."))
      return;
    store.clear();
    setData({ journals: [], habits: [], insights: [] });
    announce("All data cleared");
  }

  function exportJSON() {
    const payload = JSON.stringify(data, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifelog-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    announce("Export started");
  }

  function announce(msg) {
    if (!announceRef.current) return;
    announceRef.current.textContent = msg;
    setTimeout(() => {
      if (announceRef.current) announceRef.current.textContent = "";
    }, 1200);
  }

  // --- chart data ---
  const { labels, counts } = useMemo(() => {
    const today = new Date();
    const map = new Map();
    const labels = [];
    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (rangeDays - 1 - i));
      const key = formatDateKey(d);
      labels.push(key.slice(5));
      map.set(key, 0);
    }
    data.journals.forEach((j) => {
      const key = formatDateKey(j.date || j.createdAt || Date.now());
      if (map.has(key)) map.set(key, map.get(key) + 1);
    });
    return { labels, counts: Array.from(map.values()) };
  }, [data.journals, rangeDays]);

  const habitStats = useMemo(() => {
    const total = data.habits.length;
    const completed = data.habits.filter((h) => h.completed).length;
    const avgStreak =
      total === 0
        ? 0
        : Math.round(
            data.habits.reduce((s, h) => s + (h.streak || 0), 0) / total
          );
    const topStreak = data.habits.reduce(
      (max, h) => Math.max(max, h.streak || 0),
      0
    );
    return { total, completed, avgStreak, topStreak };
  }, [data.habits]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            Life Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Interactive summary of activity, habits, journaling — with friendly
            AI-style insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300">Range</label>
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            className="bg-slate-900/60 border border-slate-700 text-slate-100 rounded-md px-2 py-1 text-sm"
          >
            <option value={7}>7d</option>
            <option value={14}>14d</option>
            <option value={30}>30d</option>
          </select>
          <button
            onClick={exportJSON}
            className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
          >
            Export
          </button>
          <button
            onClick={clearAllData}
            className="px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Journal Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 bg-slate-800/60 p-4 rounded-2xl border border-slate-700 shadow-neu">
          <h2 className="font-semibold text-slate-200 mb-2 flex items-center justify-between">
            <span>Journal Activity</span>
            <span className="text-xs text-slate-400">Entries per day</span>
          </h2>
          <SparkBars points={counts} />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <div>{rangeDays} day overview</div>
            <div>
              {isClient ? counts.reduce((a, b) => a + b, 0) : 0} entries
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {labels.map((l, i) => (
              <div key={i} className="text-xs text-slate-400 text-center">
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Habit stats */}
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 shadow-neu">
          <h3 className="font-semibold text-slate-200 mb-2">Habits</h3>
          <div className="text-slate-100 text-2xl font-medium">
            {habitStats.completed}/{habitStats.total}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Avg streak: {habitStats.avgStreak} • Top streak:{" "}
            {habitStats.topStreak}
          </div>
        </div>
      </div>

      {/* AI-style Insights */}
      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 shadow-neu">
        <h3 className="font-semibold text-slate-200 mb-3">Insights & Tips</h3>
        {data.insights.length > 0 ? (
          <ul className="list-disc list-inside text-slate-300 space-y-1">
            {data.insights.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        ) : (
          <div className="text-slate-400">
            No insights yet. Start journaling and tracking habits!
          </div>
        )}
      </div>

      <div className="sr-only" aria-live="polite" ref={announceRef} />
    </section>
  );
}
