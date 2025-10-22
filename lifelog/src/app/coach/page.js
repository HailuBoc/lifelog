"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "lifelog:data:v1";

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
  };
}

const store = createStorage(STORAGE_KEY);

const defaultMessages = [
  {
    id: 1,
    from: "ai",
    text: "Hey! How are you feeling today?",
    date: "2024-01-01T00:00:00.000Z", // fixed date to avoid SSR mismatch
  },
];

export default function CoachPage() {
  const [messages, setMessages] = useState([]); // start empty to avoid SSR mismatch
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const liveRef = useRef(null);

  // Load from localStorage client-side only
  useEffect(() => {
    const saved = store.get();
    if (saved?.messages?.length) {
      setMessages(saved.messages);
    } else {
      setMessages(defaultMessages);
    }
  }, []);

  // Persist messages & scroll
  useEffect(() => {
    store.set({ messages });
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
      const response = await fetch("http://localhost:5000/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, msg] }),
      });
      const data = await response.json();

      const ai = {
        id: Date.now() + 1,
        from: "ai",
        text:
          data.reply ||
          "Hmm, I couldn’t think of a response. Could you rephrase that?",
        date: new Date().toISOString(),
      };
      setMessages((m) => [...m, ai]);
    } catch {
      const ai = {
        id: Date.now() + 1,
        from: "ai",
        text: "Sorry, I’m having trouble thinking right now. Try again soon 💭",
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

  function clearConversation() {
    if (!confirm("Clear the conversation?")) return;
    setMessages([]);
    store.set({ messages: [] });
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
              Reflect with a gentle, private assistant. (Local-only demo)
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

            {messages.map((m) => {
              const isAI = m.from === "ai";
              return (
                <div
                  key={m.id}
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
