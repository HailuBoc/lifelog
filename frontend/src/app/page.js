"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sun, Moon, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { store } from "@/lib/storage";
import { FaUser } from "react-icons/fa";

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
  const [newHabit, setNewHabit] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [coachMenuOpen, setCoachMenuOpen] = useState(false);
  const [userStats, setUserStats] = useState({
    totalJournalEntries: 0,
    completedHabits: 0,
    currentStreak: 0,
    totalTasks: 0
  });
  const [sidebarTaskCount, setSidebarTaskCount] = useState(0);
  const [coachMessages, setCoachMessages] = useState([]);
  const [coachInput, setCoachInput] = useState("");
  const [coachSending, setCoachSending] = useState(false);
  
  // Pagination state for journals
  const [journalsPagination, setJournalsPagination] = useState({
    journals: [],
    total: 0,
    totalPages: 0,
    currentPage: 1,
    loading: false
  });
  
  const statusElRef = useRef(null);
  const profileMenuRef = useRef(null);
  const coachMenuRef = useRef(null);
  const coachRootRef = useRef(null);
  const coachEndRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (coachRootRef.current && !coachRootRef.current.contains(event.target)) {
        setCoachMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load coach messages when coach menu opens
  useEffect(() => {
    if (coachMenuOpen && user) {
      const saved = store.get(user?.id);
      const defaultMessages = [
        {
          id: 1,
          from: "ai",
          text: "Hey! How are you feeling today?",
          date: new Date().toISOString(),
        }
      ];
      let localMessages = saved?.messages?.length ? saved.messages : defaultMessages;
      setCoachMessages(localMessages);
    }
  }, [coachMenuOpen, user]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Fetch tasks count for sidebar
  useEffect(() => {
    if (!token) return;
    
    const fetchTaskCount = async () => {
      try {
        const response = await fetch(`${API_URL}/api/tasks`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const tasks = await response.json();
        setSidebarTaskCount(tasks.length || 0);
      } catch (error) {
        console.error("Failed to fetch task count:", error);
      }
    };
    
    fetchTaskCount();
  }, [token, API_URL]);

  // Auto-scroll coach messages
  useEffect(() => {
    if (coachEndRef.current) {
      coachEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [coachMessages]);

  // Fetch user stats when profile menu opens
  useEffect(() => {
    if (profileMenuOpen && user && token) {
      const fetchStats = async () => {
        try {
          // Fetch tasks
          const taskRes = await fetch(`${API_URL}/api/tasks`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const taskData = await taskRes.json();
          const totalTasks = taskData.length || 0;
          
          const totalJournalEntries = journalsPagination.total || 0;
          const completedHabits = data?.habits?.filter(h => h.completed).length || 0;
          const currentStreak = calculateStreak(data?.habits || []);
          
          setUserStats({
            totalJournalEntries,
            completedHabits,
            currentStreak,
            totalTasks
          });
        } catch (error) {
          console.error("Failed to fetch task stats:", error);
        }
      };
      
      fetchStats();
    }
  }, [profileMenuOpen, user, token, data, journalsPagination.total, API_URL]);

  const calculateStreak = (habits) => {
    const today = new Date();
    let streak = 0;
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasCompletedHabit = habits.some(h => 
        h.completed && h.date && h.date.startsWith(dateStr)
      );
      
      if (hasCompletedHabit) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return streak;
  };

  async function postCoachMessage(text) {
    if (!text.trim()) return;
    const msg = {
      id: Date.now(),
      from: "user",
      text: text.trim(),
      date: new Date().toISOString(),
    };
    setCoachMessages((m) => [...m, msg]);
    setCoachInput("");
    setCoachSending(true);

    try {
      const response = await fetch(`${API_URL}/api/coach`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ newMessage: msg }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to get response from AI");
      }

      const ai = {
        id: Date.now() + 1,
        from: "ai",
        text: data.reply || "I'm sorry, I couldn't generate a response. Please try again.",
        date: new Date().toISOString(),
      };
      setCoachMessages((m) => [...m, ai]);
    } catch (err) {
      console.error("Error:", err);
      const ai = {
        id: Date.now() + 1,
        from: "ai",
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        date: new Date().toISOString(),
      };
      setCoachMessages((m) => [...m, ai]);
    } finally {
      setCoachSending(false);
    }
  }

  const handleCoachKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!user) {
        router.push("/login");
        return;
      }
      postCoachMessage(coachInput);
    }
  };

  const API_BASE = `${API_URL}/api/lifelog`;

  // Fetch journals with pagination
  const fetchJournals = useCallback(async (page = 1, limit = 10) => {
    if (!user || !token) return;
    
    setJournalsPagination(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await fetch(`${API_URL}/api/journals?page=${page}&limit=${limit}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch journals');
      
      const data = await response.json();
      setJournalsPagination({
        journals: data.journals || [],
        total: data.total || 0,
        totalPages: data.totalPages || 0,
        currentPage: data.currentPage || 1,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching journals:', error);
      setJournalsPagination(prev => ({ ...prev, loading: false }));
    }
  }, [user, token, API_URL]);

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

  // Fetch journals when user is available
  useEffect(() => {
    if (user && token) {
      fetchJournals(1, 10); // Fetch first page with default limit
    }
  }, [user, token, fetchJournals]);

  // Fetch user lifelog when user is resolved
  useEffect(() => {
    async function load() {
      // First, always try to load from local storage for immediate display
      const localData = store.get(user?.id);
      if (localData) {
        console.log("Loading data from local storage:", localData);
        setData((prev) => ({ ...prev, ...localData }));
      }

      // If we have a user and token, try backend to sync data
      if (user && token) {
        try {
          const res = await fetch(`${API_BASE}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          });
          if (!res.ok) {
            console.warn(`Backend unavailable: ${res.status}, using local data`);
          } else {
            const resData = await res.json();
            console.log("Backend data received:", resData);

            const backendHabits = (Array.isArray(resData?.habits)
              ? resData.habits
              : []
            ).map((h) => {
              const finalId = (h._id || h.id || "").toString() || `local-${Math.random().toString(36).substr(2, 9)}`;
              return { ...h, _id: finalId };
            });

            const backendData = {
              todayMood: resData?.todayMood || localData?.todayMood || "😊 Happy",
              habits: backendHabits,
              journals: Array.isArray(resData?.journals)
                ? resData.journals
                : localData?.journals || [],
              insights: Array.isArray(resData?.insights)
                ? resData.insights
                : localData?.insights || ["Stay consistent!"],
            };

            // Merge backend data with local data, prioritizing backend for habits but keeping local journals if backend is empty
            const mergedData = {
              ...backendData,
              journals: resData?.journals?.length
                ? backendData.journals
                : localData?.journals || [],
              todayMood: resData?.todayMood || localData?.todayMood || "😊 Happy",
            };

            setData(mergedData);

            // Save the merged data back to local storage
            store.set(user?.id, mergedData);

            setIsInitialLoad(false);
            return;
          }
        } catch (err) {
          console.error("Backend fetch failed, using local data:", err);
        }
      }

      // If no backend data or guest user, ensure we have some default data
      if (!localData && !user) {
        const guestHabits = [
          { _id: "default-1", name: "Read 30 mins", completed: false, streak: 0 },
          { _id: "default-2", name: "Exercise 20 mins", completed: false, streak: 0 },
          { _id: "default-3", name: "Meditate", completed: false, streak: 0 },
        ];

        const defaultData = {
          todayMood: "😊 Thinking",
          habits: guestHabits,
          journals: [],
          insights: ["Stay consistent!"],
        };

        setData(defaultData);
        store.set(user?.id, defaultData);
      }

      // Migration: Ensure all habits have unique _id as string
      setData(prev => ({
        ...prev,
        habits: (prev.habits || []).map(h => {
          const finalId = (h._id || h.id || "").toString() || `local-${Math.random().toString(36).substr(2, 9)}`;
          return { ...h, _id: finalId };
        })
      }));
      
      setIsInitialLoad(false);
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
      console.log("Saving data to local storage for user:", user?.id, data);
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
    if (statusElRef.current) {
      statusElRef.current.textContent = msg;
      setTimeout(() => {
        if (statusElRef.current) statusElRef.current.textContent = "";
      }, 1200);
    }
  }

  function handleLogout() {
    logout();
  }

  function updateMood() {
    if (!moodDraft.trim()) return;
    if (!user || !token) {
      announce("Please log in to update your mood");
      return;
    }
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
    if (!user || !token) {
      announce("Please log in to add journal entries");
      return;
    }
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
        // Refresh journals pagination to show the new entry
        fetchJournals(journalsPagination.currentPage, 10);
      })
      .catch(() => {});
  }

  function removeJournalEntry(id) {
    if (!user || !token) {
      announce("Please log in to manage journal entries");
      return;
    }
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
      .then(() => {
        setData((d) => ({
          ...d,
          journals: d.journals.filter((j) => (j._id ?? j.id) !== id),
        }));
        // Refresh journals pagination after deletion
        fetchJournals(journalsPagination.currentPage, 10);
      })
      .catch(() => {});
    announce("Journal entry removed");
  }

  function toggleHabit(id) {
    if (!user || !token) {
      announce("Please log in to manage habits");
      return;
    }
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
    if (!user || !token) {
      announce("Please log in to manage habits");
      return;
    }
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
            🧠Bruh  LifeLog
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
                 Sign up
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="p-2 rounded-md text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="User menu"
                aria-expanded={profileMenuOpen}
              >
                <FaUser className="text-slate-300" />
              </button>
              
              {/* Dropdown Menu */}
              {profileMenuOpen && (
                <div ref={profileMenuRef} className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FaUser className="text-slate-300 text-lg" />
                      <div>
                        <div className="text-slate-100 font-medium">{user?.name || 'User'}</div>
                        <div className="text-slate-400 text-sm">{user?.email || 'user@example.com'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setProfileMenuOpen(false)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-400 text-sm">Total Tasks</span>
                      <span className="text-slate-100 font-medium">{userStats.totalTasks}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-400 text-sm">Journal Entries</span>
                      <span className="text-slate-100 font-medium">{userStats.totalJournalEntries}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-400 text-sm">Completed Habits</span>
                      <span className="text-slate-100 font-medium">{userStats.completedHabits}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-400 text-sm">Current Streak</span>
                      <span className="text-slate-100 font-medium">{userStats.currentStreak} days</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <button
                      onClick={() => {
                        handleLogout();
                        setProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              <Link href="/tasks"
               className="flex items-center justify-between p-2 rounded-md hover:bg-slate-700/60"
                > 
                <span>🗂 Tasks</span>
                {sidebarTaskCount > 0 && (
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                    {sidebarTaskCount}
                  </span>
                )}
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
                    onFocus={() => {
                      if (!user) {
                        router.push("/login");
                      }
                    }}
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

                  {data.habits.slice(0, 4).map((h) => (
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
                            if (!user) {
                              router.push("/login");
                              return;
                            }
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
                            }, 500);

                            if (!user || !token) {
                              announce("Local update saved");
                              return;
                            }

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
                            if (!user) {
                              router.push("/login");
                              return;
                            }
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
                
                {/* View All Habits Button */}
                {data.habits.length > 4 && (
                  <div className="mt-4 text-center">
                    <Link
                      href="/habits"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    >
                      View All Habits ({data.habits.length - 4} more)
                    </Link>
                  </div>
                )}
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
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    if (!user) {
                      router.push("/login");
                      return;
                    }
                    addJournalEntry();
                  }
                }}
                placeholder="Write about your day..."
                className="w-full min-h-[90px] rounded-md p-3 bg-slate-900/40 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
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
                    onClick={() => {
                      if (!user) {
                        router.push("/login");
                        return;
                      }
                      addJournalEntry();
                    }}
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
                {journalsPagination.loading ? (
                  <div className="text-slate-400 text-center py-4">
                    Loading journals...
                  </div>
                ) : journalsPagination.journals.length === 0 ? (
                  <div className="text-slate-400">No journal entries yet.</div>
                ) : (
                  journalsPagination.journals.map((j, idx) => (
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
                        onClick={() => {
                          if (!user) {
                            router.push("/login");
                            return;
                          }
                          removeJournalEntry(j._id);
                        }}
                        className="text-xs px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="mt-2 text-slate-100">{j.text}</p>
                  </article>
                  ))
                )}
              </div>
            </section>

            {/* Pagination Controls */}
            {journalsPagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => fetchJournals(journalsPagination.currentPage - 1, 10)}
                  disabled={journalsPagination.currentPage === 1 || journalsPagination.loading}
                  className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Previous
                </button>
                
                {/* Page numbers when totalPages <= 5 */}
                {journalsPagination.totalPages <= 5 && (
                  <div className="flex gap-1">
                    {Array.from({ length: journalsPagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => fetchJournals(pageNum, 10)}
                        disabled={journalsPagination.loading}
                        className={`w-8 h-8 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          pageNum === journalsPagination.currentPage
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
                  onClick={() => fetchJournals(journalsPagination.currentPage + 1, 10)}
                  disabled={journalsPagination.currentPage === journalsPagination.totalPages || journalsPagination.loading}
                  className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Next
                </button>
              </div>
            )}
            
            {/* Page info */}
            {journalsPagination.total > 0 && (
              <div className="text-center text-slate-400 text-sm mt-2">
                Showing {journalsPagination.journals.length} of {journalsPagination.total} entries
                {journalsPagination.totalPages > 1 && ` (Page ${journalsPagination.currentPage} of ${journalsPagination.totalPages})`}
              </div>
            )}
          </div>
        </main>
      </div>

      <div ref={coachRootRef} className="fixed bottom-24 right-6 z-[80] flex flex-col items-end gap-4">
        {coachMenuOpen && (
          <div
            ref={coachMenuRef}
            className="w-80 h-[450px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-indigo-600 text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg" aria-hidden="true">🤖</span>
              </div>
              <div>
                <h3 className="font-bold text-sm">AI Coach</h3>
                <p className="text-[10px] text-white/80">Always active to help you grow</p>
              </div>
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setCoachMenuOpen(false);
                }}
                className="ml-auto text-white/80 hover:text-white"
                aria-label="Close AI Coach"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/50">
              {coachMessages.length === 0 ? (
                <div className="text-center text-slate-400 py-6">
                  No messages yet — say hi 👋
                </div>
              ) : (
                coachMessages.map((m, i) => {
                  const isAI = m.from === "ai";
                  const key = m.id || m._id || `${i}-${new Date(m.date || Date.now()).getTime()}`;
                  return (
                    <div
                      key={key}
                      className={`flex flex-col gap-1 max-w-[85%] ${isAI ? "" : "ml-auto"}`}
                    >
                      <div
                        className={`${
                          isAI
                            ? "bg-slate-800 text-slate-100 rounded-2xl rounded-tl-none border border-slate-800"
                            : "bg-indigo-600 text-white rounded-2xl rounded-tr-none"
                        } p-3 text-sm shadow-sm`}
                      >
                        {m.text}
                      </div>
                      <span className={`text-[10px] text-slate-400 ${isAI ? "ml-1" : "text-right mr-1"}`}>
                        {m.date ? new Date(m.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={coachEndRef} />
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
              <input
                className="flex-1 bg-slate-800 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 text-slate-100"
                placeholder="Ask your coach..."
                type="text"
                value={coachInput}
                onChange={(e) => setCoachInput(e.target.value)}
              />
              <button
                className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md disabled:opacity-60"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!user) {
                    router.push("/login");
                    return;
                  }
                  if (coachSending) return;
                  postCoachMessage(coachInput);
                }}
                disabled={coachSending}
                aria-label="Send message"
                type="button"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            setCoachMenuOpen((v) => !v);
          }}
          className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
          aria-label="Open AI Coach"
          type="button"
        >
          <span className="text-2xl" aria-hidden="true">🤖</span>
        </button>
      </div>
    </div>
  );
}
