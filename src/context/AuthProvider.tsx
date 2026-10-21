import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext, type AuthContextValue } from "@/context/auth-context";
import { ApiError, AUTH_EXPIRED_EVENT, apiFetch, clearCache } from "@/lib/api";
import type { User } from "@/types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ user: User }>("/auth/me")
      .then(({ user }) => {
        if (cancelled) return;
        setUser(user);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error("No se pudo comprobar la sesión", error);
        }
        setStatus("anonymous");
      });

    const handleExpired = () => {
      clearCache();
      setUser(null);
      setStatus("anonymous");
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await apiFetch<{ user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    clearCache();
    setUser(user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      clearCache();
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
