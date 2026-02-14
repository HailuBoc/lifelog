"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { store } from "@/lib/storage";

const defaultMessages = [
  {
    id: 1,
    from: "ai",
    text: "Hey! How are you feeling today?",
    date: "2024-01-01T00:00:00.000Z",
  },
];

export default function CoachPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const endRef = useRef(null);
  const liveRef = useRef(null);

  // ✅ Use environment variable for backend URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"; // fallback for local dev

  // Load from backend on mount
  useEffect(() => {
    async function loadHistory() {
      // First, always try to load from local storage for immediate display
      const saved = store.get(user?.id);
      let localMessages = saved?.messages?.length ? saved.messages : defaultMessages;
      setMessages(localMessages);
      
      // If we have a user and token, try backend to sync data
      if (user && token) {
        try {
          const res = await fetch(`${API_URL}/api/coach`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) {
            console.warn("Backend unavailable, using local data");
          } else {
            const data = await res.json();
            const backendMessages = data.messages?.length ? data.messages : defaultMessages;
            
            // Merge backend messages with local messages
            // For now, we'll prioritize backend but keep local if backend is empty
            const finalMessages = data.messages?.length ? backendMessages : localMessages;
            setMessages(finalMessages);
            
            // Save back to local storage
            const updatedStore = { ...saved, messages: finalMessages };
            store.set(user?.id, updatedStore);
            
            setIsInitialLoad(false);
            return;
          }
        } catch (err) {
          console.warn("Backend fail, using local data:", err);
        }
      }

      setIsInitialLoad(false);
    }

    if (!loading) {
      loadHistory();
    }
  }, [loading, user, token, API_URL]);

  // Persist messages locally (sync only after initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    try {
      const existing = store.get(user?.id) || {};
      existing.messages = messages;
      store.set(user?.id, existing);
    } catch {}
    
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isInitialLoad, user?.id]);

  async function postUserMessage(text) {
    if (!text.trim()) return;
    const msg = {
      id: Date.now(),
      from: "user",
      text: text.trim(),
      date: new Date().toISOString(),
    };
    setMessages((m) => [...m, msg]);
    setInput("");
    setSending(true);

    try {
      // ✅ Post only the new message, backend handles history
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
      setMessages((m) => [...m, ai]);
    } catch (err) {
      console.error("Error:", err);
      const ai = {
        id: Date.now() + 1,
        from: "ai",
        text: `Error: ${err.message || "I’m having trouble thinking right now. Try again soon 💭"}`,
        date: new Date().toISOString(),
      };
      setMessages((m) => [...m, ai]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      postUserMessage(input);
    }
  }

  async function clearConversation() {
    setClearConfirmOpen(true);
  }

  async function confirmClearConversation() {
    setClearConfirmOpen(false);
    setMessages([]);
    try {
      const existing = store.get(user?.id) || {};
      existing.messages = [];
      store.set(user?.id, existing);
    } catch {}

    try {
      await fetch(`${API_URL}/api/coach`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (e) {
      console.warn("Failed to clear on backend", e);
    }
  }

  return (
    <section className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              AI Life Coach 💬
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Reflect with a gentle, private assistant.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearConversation}
              className="px-3 py-1 text-xs rounded-md bg-rose-600 hover:bg-rose-500 text-white"
            >
              Clear
            </button>
            <button
              onClick={() => setMessages(defaultMessages)}
              className="px-3 py-1 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100"
            >
              Reset
            </button>
          </div>
        </header>

        {clearConfirmOpen && (
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/60 p-3 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-200">
              Clear the conversation?
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setClearConfirmOpen(false)}
                className="px-3 py-1 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearConversation}
                className="px-3 py-1 text-xs rounded-md bg-rose-600 hover:bg-rose-500 text-white"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-b from-slate-900/60 to-slate-800/50 rounded-2xl border border-slate-700 p-4 shadow-neu">
          <div
            className="max-h-[60vh] overflow-y-auto space-y-3 p-2"
            role="log"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <div className="text-center text-slate-400 py-6">
                No messages yet — say hi 👋
              </div>
            )}

            {messages.map((m, i) => {
              const isAI = m.from === "ai";
              // ✅ Fallback key strategy: ID -> _id -> Index+Timestamp
              const key = m.id || m._id || `${i}-${new Date(m.date).getTime()}`;
              
              return (
                <div
                  key={key}
                  className={`flex ${
                    isAI ? "justify-start" : "justify-end"
                  } transition-transform duration-300`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] px-4 py-2 rounded-xl shadow-sm border ${
                      isAI
                        ? "bg-gradient-to-r from-indigo-700 to-indigo-600 text-white border-indigo-600/40"
                        : "bg-emerald-500 text-black border-emerald-400"
                    }`}
                  >
                    <div className="text-xs text-slate-200 mb-1 flex items-center justify-between">
                      <span className="font-medium">
                        {isAI ? "AI Coach" : "You"}
                      </span>
                      <time className="ml-2 text-[11px] opacity-80">
                        {new Date(m.date).toLocaleTimeString()}
                      </time>
                    </div>
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>
                </div>
              );
            })}

            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!user) {
                router.push("/login");
                return;
              }
              postUserMessage(input);
            }}
            className="mt-4 flex gap-2 items-end"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share something or ask a question..."
              className="flex-1 min-h-[44px] max-h-40 resize-none rounded-lg p-3 bg-slate-900/50 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </form>

          <div className="sr-only" aria-live="polite" ref={liveRef} />
        </div>
      </div>
    </section>
  );
}
