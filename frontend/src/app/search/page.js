"use client";

import { useState } from "react";
import useAuth from "@/hooks/useAuth";
import { Search, Loader2 } from "lucide-react";

export default function SearchPage() {
  const { user, token, loading } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    try {
      // Note: Backend search endpoint might need to be verified/implemented
      const res = await fetch(`${API_URL}/api/lifelog/${user.id}/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

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
      <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-neu">
        <h1 className="text-2xl font-semibold text-slate-100 mb-2 flex items-center gap-2">
          <Search className="w-6 h-6 text-indigo-400" />
          Smart Search
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Find entries, emotions, or topics using AI-powered search across your life log.
        </p>
        
        <form onSubmit={handleSearch} className="relative mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your memories (e.g. 'How was my mood last Tuesday?')"
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-4 px-12 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <button
            type="submit"
            disabled={searching}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </button>
        </form>

        <div className="space-y-4">
          {results.length > 0 ? (
            results.map((res, i) => (
              <div key={i} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="text-xs text-indigo-400 mb-1">{res.type} • {new Date(res.date).toLocaleDateString()}</div>
                <p className="text-slate-200">{res.text}</p>
              </div>
            ))
          ) : query && !searching ? (
            <div className="text-center py-12 text-slate-500 italic">
              No results found for "{query}". Try different keywords.
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 italic">
              🔎 Type something above to start searching...
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
