"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function useAuth(redirectIfUnauthenticated = true) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check sessionStorage first (for non-remembered sessions), then localStorage
    const storedToken = sessionStorage.getItem("lifelog_token") || localStorage.getItem("lifelog_token");
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
    // Remove auth tokens from both storage locations
    localStorage.removeItem("lifelog_token");
    sessionStorage.removeItem("lifelog_token");
    localStorage.removeItem("lifelog_user");
    setUser(null);
    setToken(null);
    router.push("/login");
  };

  return { user, token, loading, logout };
}
