"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function useAuth(redirectIfUnauthenticated = true) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("lifelog_token");
    const storedUser = localStorage.getItem("lifelog_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from storage", e);
      }
    } else if (redirectIfUnauthenticated && !loading) {
      router.push("/login");
    }
    setLoading(false);
  }, [redirectIfUnauthenticated, router, loading]);

  const logout = () => {
    // Only remove auth tokens, keep user data in localStorage for persistence
    localStorage.removeItem("lifelog_token");
    localStorage.removeItem("lifelog_user");
    setUser(null);
    setToken(null);
    router.push("/login");
  };

  return { user, token, loading, logout };
}
