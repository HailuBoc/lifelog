"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/* debounce hook for performance */
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
 
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const liveRef = useRef(null);

  const debouncedEmail = useDebounce(email, 200);
  const debouncedPassword = useDebounce(password, 200);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("lifelog_remembered_email");
    const shouldRemember = localStorage.getItem("lifelog_remember_me") === "true";
    
    if (rememberedEmail && shouldRemember) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const announce = useCallback((msg) => {
    if (!liveRef.current) return;
    liveRef.current.textContent = msg; 
    setTimeout(() => {
      if (liveRef.current) liveRef.current.textContent = "";
    }, 1200);
  }, []);

  const validate = useCallback(() => {
    const e = {};
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) e.email = "Please enter a valid email.";
    if (!password) e.password = "Please enter your password.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [email, password]);

  // Auto-validate on debounced input changes
  useEffect(() => {
    if (debouncedEmail || debouncedPassword) {
      validate();
    }
  }, [debouncedEmail, debouncedPassword, validate]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    
    // Immediate validation
    if (!validate()) {
      announce("Fix validation errors.");
      return;
    }

    setSaving(true);
    setIsLoading(true);
    setServerError("");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();

      if (!res.ok || !data.token) {
        if (res.status === 403 && data.unverified) {
          announce("Please verify your email.");
          setTimeout(() => router.push(`/verify-email?email=${encodeURIComponent(email)}`), 1000);
          return;
        }
        const msg = data.message || "Login failed. Check your credentials.";
        setServerError(msg);
        announce(msg);
        return;
      }

      // Store JWT for auth based on remember me preference
      if (rememberMe) {
        localStorage.setItem("lifelog_token", data.token);
        localStorage.setItem("lifelog_remembered_email", email.trim().toLowerCase());
        localStorage.setItem("lifelog_remember_me", "true");
      } else {
        sessionStorage.setItem("lifelog_token", data.token);
        // Clear any existing remember me data
        localStorage.removeItem("lifelog_remembered_email");
        localStorage.removeItem("lifelog_remember_me");
      }

      // Optional: store user info (always in localStorage for now)
      localStorage.setItem(
        "lifelog_user",
        JSON.stringify({ id: data.id, name: data.name, email: data.email })
      );

      announce("Login successful!");
      
      // Fast redirect to the specified URL or home
      setTimeout(() => router.push(redirectUrl), 500);
    } catch (err) {
      console.error("Login error:", err);
      if (err.name === 'AbortError') {
        setServerError("Request timeout. Try again.");
        announce("Request timeout. Try again.");
      } else {
        setServerError("Server error. Try again later.");
        announce("Server error. Try again later.");
      }
    } finally {
      setSaving(false);
      setIsLoading(false);
    }
  }, [validate, announce, email, password, router, redirectUrl, rememberMe]);

  return (
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

      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          {serverError}
        </div>
      )}

      <label className="block mb-2 text-sm">
        <span className="text-slate-200">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`mt-1 w-full rounded-md p-2 bg-slate-900/40 border ${
            errors.email ? "border-rose-500" : "border-slate-700"
          } text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-150`}
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
          } text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-150`}
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
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-900/40 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="remember" className="text-slate-300 cursor-pointer">
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
        disabled={saving || isLoading}
        className="w-full px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
      >
        {saving || isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Logging in...
          </>
        ) : (
          "Log In"
        )}
      </button>

      <div className="mt-4 text-xs text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-indigo-300 hover:text-indigo-400"
        >
          Sign up
        </Link>
      </div>

      <div className="sr-only" aria-live="polite" ref={liveRef} />
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100">
      <Suspense fallback={
        <div className="w-full max-w-md bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-neu">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
            <div className="h-10 bg-slate-700 rounded"></div>
            <div className="h-10 bg-slate-700 rounded"></div>
            <div className="h-10 bg-slate-700 rounded w-full"></div>
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </main>
  );
}
