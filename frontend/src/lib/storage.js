"use client";

const BASE_KEY = "lifelog:data:v2";

export function getStorageKey(userId) {
  return `${BASE_KEY}:${userId || "guest"}`;
}

export const store = {
  get(userId) {
    if (typeof window === "undefined") return null;
    try {
      const key = getStorageKey(userId);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(userId, value) {
    if (typeof window === "undefined") return;
    try {
      const key = getStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  clear(userId) {
    if (typeof window === "undefined") return;
    try {
      const key = getStorageKey(userId);
      localStorage.removeItem(key);
    } catch {}
  }
};
