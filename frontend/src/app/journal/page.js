"use client";

import { useState, useEffect, useRef } from "react";
import useAuth from "@/hooks/useAuth";
import { store } from "@/lib/storage";

export default function JournalPage() {
  const { user, token, loading } = useAuth(false);
  const [journals, setJournals] = useState([]);
  const [draft, setDraft] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const announceRef = useRef(null);
  const textareaRef = useRef(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const JOURNAL_API = `${API_URL}/api/lifelog`;

  // ✅ Load from backend first, fallback to localStorage
  useEffect(() => {
    setPrefersReducedMotion(
      typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    async function loadJournals() {
      // First, always try to load from local storage for immediate display
      const saved = store.get(user?.id);
      let localJournals = [];
      if (saved?.journals) {
        localJournals = (Array.isArray(saved.journals) ? saved.journals : []).map(j => ({
          ...j,
          _id: (j._id || j.id || "").toString() || `local-${Math.random().toString(36).substr(2, 9)}`
        }));
        setJournals(localJournals);
      }
      
      // If we have a user and token, try backend to sync data
      if (user && token) {
        try {
          const res = await fetch(`${JOURNAL_API}`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (!res.ok) {
            console.warn("Backend unavailable, using local data");
          } else {
            const data = await res.json();
            const backendJournals = (Array.isArray(data.journals) ? data.journals : []).map(j => ({
              ...j,
              _id: (j._id || j.id || "").toString() || `local-${Math.random().toString(36).substr(2, 9)}`
            }));
            
            // Merge backend journals with local journals
            // For now, we'll prioritize backend but keep local if backend is empty
            const finalJournals = backendJournals.length > 0 ? backendJournals : localJournals;
            setJournals(finalJournals);
            
            // Save back to local storage
            const updatedStore = { ...saved, journals: finalJournals };
            store.set(user?.id, updatedStore);
            
            setIsInitialLoad(false);
            return;
          }
        } catch (err) {
          console.error("Backend load failed, using local data:", err);
        }
      }

      setIsInitialLoad(false);
    }

    if (!loading) {
      loadJournals();
    }
  }, [loading, user, token, JOURNAL_API]);

  // ✅ Save locally for offline use (ONLY AFTER INITIAL LOAD)
  useEffect(() => {
    if (isInitialLoad) return;
    
    try {
      const existing = store.get(user?.id) || {};
      existing.journals = journals;
      store.set(user?.id, existing);
    } catch {
      // ignore
    }
  }, [journals, isInitialLoad, user?.id]);

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
      hour12: false, 
    });
  }

  function announce(msg) {
    if (!announceRef.current) return;
    announceRef.current.textContent = msg;
    setTimeout(() => {
      if (announceRef.current) announceRef.current.textContent = "";
    }, 1000);
  }

  // ✅ Add new entry
  async function addJournalEntry() {
    if (!draft.trim()) return;
    const entry = {
      _id: `local-${Date.now()}`,
      date: new Date().toISOString(),
      text: draft.trim(),
    };

    setJournals((prev) => [entry, ...prev]);
    setDraft("");
    setShowForm(false);
    announce("Journal entry added");

    try {
      const res = await fetch(`${JOURNAL_API}/journal`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ text: entry.text }),
      });
      const saved = await res.json();
      if (!saved || !saved._id) return;

      // Swap local entry with backend entry
      setJournals((prev) => (prev ?? []).map((j) => (j._id === entry._id ? saved : j)));
    } catch (err) {
      console.error("Failed to sync journal:", err);
    }
  }

  // ✅ Remove entry
  async function removeJournalEntry(id) {
    if (!id) return;
    const idStr = id.toString();
    
    setJournals((prev) =>
      (prev ?? []).map((j) => (j._id?.toString() === idStr ? { ...j, _removing: true } : j))
    );

    setTimeout(
      () => {
        setJournals((prev) => (prev ?? []).filter((j) => (j._id || "").toString() !== idStr));
      },
      prefersReducedMotion ? 0 : 300
    );

    announce("Journal entry removed");

    // only call backend if not a local entry
    if (!idStr.startsWith("local-") && user && token) {
      try {
        await fetch(`${JOURNAL_API}/journal/${idStr}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } catch (e) {
        console.warn("Failed to delete journal on backend", e);
      }
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") addJournalEntry();
  }

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
      <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-700">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Daily Journal
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              View and reflect on your recent entries. Add quick notes or
              detailed reflections.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowForm((s) => !s);
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              aria-expanded={showForm}
              aria-controls="journal-form"
              className="inline-flex items-center gap-2 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-100 text-sm font-medium px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {showForm ? "Close" : "Quick Add"}
            </button>
          </div>
        </header>

        {/* quick add form */}
        <div
          id="journal-form"
          className={`mt-6 transition-all overflow-hidden ${
            showForm ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          }`}
          aria-hidden={!showForm}
        >
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write about your day... (Ctrl/Cmd + Enter to add)"
            className="w-full min-h-[100px] rounded-lg p-3 bg-slate-900/60 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setDraft("")}
              className="px-4 py-2 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Clear
            </button>
            <button
              onClick={addJournalEntry}
              className="px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Add Entry
            </button>
          </div>
        </div>

        {/* list */}
        <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {journals.length === 0 && (
            <li className="col-span-2 text-center text-slate-400 py-8">
              No journal entries yet — start by adding one.
            </li>
          )}

          {journals.map((entry) => (
            <li
              key={entry._id}
              className={`relative bg-slate-800/60 p-4 rounded-lg border border-slate-700 shadow-sm transition-transform duration-300 ease-in-out ${
                entry._removing
                  ? "opacity-0 -translate-x-4 scale-95"
                  : "hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-400">
                    {formatEntryDate(entry)}
                  </div>
                  <p className="mt-2 text-slate-100 whitespace-pre-wrap">
                    {entry.text || entry.content}
                  </p>
                </div>

                <button
                  onClick={() => removeJournalEntry(entry._id)}
                  className="text-xs px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="sr-only" aria-live="polite" ref={announceRef} />
      </div>
    </section>
  );
}
