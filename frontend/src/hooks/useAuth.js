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
    } else if (redirectIfUnauthenticated) {
      router.push("/login");
    }
    setLoading(false);
  }, [redirectIfUnauthenticated, router]);

  const logout = () => {
    localStorage.removeItem("lifelog_token");
    localStorage.removeItem("lifelog_user");
    setUser(null);
    setToken(null);
    router.push("/login");
  };

  return { user, token, loading, logout };
}
