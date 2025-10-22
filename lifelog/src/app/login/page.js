"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const liveRef = useRef(null);

  function announce(msg) {
    if (!liveRef.current) return;
    liveRef.current.textContent = msg;
    setTimeout(() => {
      if (liveRef.current) liveRef.current.textContent = "";
    }, 1200);
  }

  function validate() {
    const e = {};
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) e.email = "Please enter a valid email.";
    if (!password) e.password = "Please enter your password.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) {
      announce("Fix validation errors.");
      return;
    }

    setSaving(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        announce(data.message || "Login failed. Check your credentials.");
        setSaving(false);
        return;
      }

      // ✅ Store JWT for auth
      localStorage.setItem("lifelog:auth", data.token);

      // Optional: store user info
      localStorage.setItem(
        "lifelog:user",
        JSON.stringify({ id: data.id, name: data.name, email: data.email })
      );

      announce("Login successful!");
      router.push("/"); // redirect to home/dashboard
    } catch (err) {
      console.error("Login error:", err);
      announce("Server error. Try again later.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-neu transition-transform duration-200"
        aria-labelledby="loginTitle"
      >
        <h1
          id="loginTitle"
          className="text-2xl font-semibold text-indigo-300 mb-1"
        >
          Log In
        </h1>
        <p className="text-sm text-slate-400 mb-4">
          Welcome back! Please log in to your account.
        </p>

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

        <label className="block mb-2 text-sm">
          <span className="text-slate-200">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`mt-1 w-full rounded-md p-2 bg-slate-900/40 border ${
              errors.password ? "border-rose-500" : "border-slate-700"
            } text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            placeholder="Your password"
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

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              className="w-4 h-4 rounded bg-slate-900/40 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <label htmlFor="remember" className="text-slate-300">
              Remember me
            </label>
          </div>
          <Link
            href="/forgot-password"
            className="text-sm text-slate-300 hover:text-white"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition-transform active:scale-95"
        >
          {saving ? "Logging in…" : "Log In"}
        </button>

        <div className="mt-4 text-xs text-slate-400">
          Don’t have an account?{" "}
          <Link
            href="/signup"
            className="text-indigo-300 hover:text-indigo-400"
          >
            Sign up
          </Link>
        </div>

        <div className="sr-only" aria-live="polite" ref={liveRef} />
      </form>
    </main>
  );
}
