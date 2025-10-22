"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* small safe localStorage wrapper with in-memory fallback */
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

const USERS_KEY = "lifelog:users:v1";
const store = createStorage(USERS_KEY);

/* simple password strength evaluator */
function passwordStrength(pw = "") {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reminders, setReminders] = useState(true);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  );
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const liveRef = useRef(null);

  useEffect(() => {
    try {
      const saved = store.get();
      if (saved?.lastSignup) {
        setName(saved.lastSignup.name || "");
        setEmail(saved.lastSignup.email || "");
      }
    } catch {}
  }, []);

  function announce(msg) {
    if (!liveRef.current) return;
    liveRef.current.textContent = msg;
    setTimeout(() => {
      if (liveRef.current) liveRef.current.textContent = "";
    }, 1200);
  }

  function validate() {
    const e = {};
    if (!name.trim()) e.name = "Please enter your name.";
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) e.email = "Please enter a valid email.";
    if (password.length < 8)
      e.password = "Password must be at least 8 characters.";
    if (password !== confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      announce("Fix validation errors");
      return;
    }

    setSaving(true);

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        announce(data?.message || "Signup failed");
        setSaving(false);
        return;
      }

      // store JWT locally
      localStorage.setItem("token", data.token);

      // save last signup info locally (optional)
      const existing = store.get() || { users: [] };
      existing.lastSignup = { name, email };
      store.set(existing);

      announce("Account created successfully!");
      router.push("/"); // redirect to dashboard or home
    } catch (err) {
      console.error(err);
      announce("Error connecting to server");
    } finally {
      setSaving(false);
    }
  }

  const strength = passwordStrength(password);
  const strengthLabel =
    ["Very weak", "Weak", "Okay", "Strong", "Very strong"][strength] ||
    "Very weak";
  const strengthPct = (strength / 4) * 100;

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-neu transition-transform duration-200"
        aria-labelledby="signupTitle"
      >
        <h1
          id="signupTitle"
          className="text-2xl font-semibold text-indigo-300 mb-1"
        >
          Create an account
        </h1>

        {/* Name Input */}
        <label className="block mb-2 text-sm">
          <span className="text-slate-200">Full name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`mt-1 w-full rounded-md p-2 bg-slate-900/40 border ${
              errors.name ? "border-rose-500" : "border-slate-700"
            } text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Your name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "err-name" : undefined}
          />
        </label>
        {errors.name && (
          <div
            id="err-name"
            role="alert"
            className="text-xs text-rose-400 mb-2"
          >
            {errors.name}
          </div>
        )}

        {/* Email Input */}
        <label className="block mb-2 text-sm">
          <span className="text-slate-200">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`mt-1 w-full rounded-md p-2 bg-slate-900/40 border ${
              errors.email ? "border-rose-500" : "border-slate-700"
            } text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "err-email" : undefined}
          />
        </label>
        {errors.email && (
          <div
            id="err-email"
            role="alert"
            className="text-xs text-rose-400 mb-2"
          >
            {errors.email}
          </div>
        )}

        {/* Password Input */}
        <label className="block mb-2 text-sm">
          <span className="text-slate-200 flex justify-between items-center">
            <span>Password</span>
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="text-xs text-slate-300 hover:text-slate-100"
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`mt-1 w-full rounded-md p-2 bg-slate-900/40 border ${
              errors.password ? "border-rose-500" : "border-slate-700"
            } text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Choose a strong password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "err-password" : undefined}
          />
        </label>
        {errors.password && (
          <div
            id="err-password"
            role="alert"
            className="text-xs text-rose-400 mb-2"
          >
            {errors.password}
          </div>
        )}

        {/* Password strength bar */}
        <div className="mb-3">
          <div className="h-2 w-full bg-slate-900/40 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${strengthPct}%`,
                background:
                  strengthPct < 50
                    ? "#ef4444"
                    : strengthPct < 75
                    ? "#f59e0b"
                    : "#10b981",
              }}
            />
          </div>
          <div className="text-xs text-slate-400 mt-1">{strengthLabel}</div>
        </div>

        {/* Confirm password */}
        <label className="block mb-3 text-sm">
          <span className="text-slate-200">Confirm password</span>
          <input
            type={showPassword ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={`mt-1 w-full rounded-md p-2 bg-slate-900/40 border ${
              errors.confirm ? "border-rose-500" : "border-slate-700"
            } text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Confirm password"
            aria-invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? "err-confirm" : undefined}
          />
        </label>
        {errors.confirm && (
          <div
            id="err-confirm"
            role="alert"
            className="text-xs text-rose-400 mb-2"
          >
            {errors.confirm}
          </div>
        )}

        {/* Reminders & Timezone */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <input
              id="reminders"
              type="checkbox"
              checked={reminders}
              onChange={(e) => setReminders(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900/40 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <label htmlFor="reminders" className="text-slate-300">
              Enable local reminders
            </label>
          </div>

          <div className="text-sm">
            <label className="text-slate-300 mr-2">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="rounded-md bg-slate-900/40 border border-slate-700 text-slate-100 p-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition-transform active:scale-95"
          >
            {saving ? "Creating…" : "Create account"}
          </button>

          <Link
            href="/login"
            className="text-sm text-slate-300 hover:text-white"
          >
            Already have an account?
          </Link>
        </div>

        <div className="sr-only" aria-live="polite" ref={liveRef} />
      </form>
    </main>
  );
}
