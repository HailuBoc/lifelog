// ...existing code...
"use client";

import { useEffect, useRef, useState } from "react";

export default function NewJournalEntry() {
  const [entry, setEntry] = useState("");
  const [saving, setSaving] = useState(false);
  const announceRef = useRef(null);

  useEffect(() => {
    // Load any existing entry if needed (optional)
    const savedEntry = localStorage.getItem("lifelog:journal-entry");
    if (savedEntry) {
      setEntry(savedEntry);
    }
  }, []);

  function saveEntry() {
    if (!entry.trim()) {
      announce("Entry cannot be empty.");
      return;
    }

    setSaving(true);
    // Simulate saving to local storage or a backend
    localStorage.setItem("lifelog:journal-entry", entry);
    setTimeout(() => {
      setSaving(false);
      announce("Entry saved successfully!");
      setEntry(""); // Clear the entry after saving
    }, 500);
  }

  function announce(msg) {
    if (!announceRef.current) return;
    announceRef.current.textContent = msg;
    setTimeout(() => {
      if (announceRef.current) announceRef.current.textContent = "";
    }, 1200);
  }

  return (
    <section className="max-w-2xl mx-auto p-4 bg-slate-800 rounded-lg shadow-lg">
      <h1 className="text-3xl font-semibold text-slate-100 mb-4">
        New Journal Entry
      </h1>
      <textarea
        value={entry}
        onChange={(e) => setEntry(e.target.value)}
        placeholder="How was your day?"
        rows={6}
        className="w-full p-4 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-slate-100"
      ></textarea>

      <button
        onClick={saveEntry}
        disabled={saving}
        className="mt-4 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition duration-200"
      >
        {saving ? "Saving..." : "Save Entry"}
      </button>

      <div className="sr-only" aria-live="polite" ref={announceRef} />
    </section>
  );
}
// ...existing code...
