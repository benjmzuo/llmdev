import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { setOnUnauthorized } from "@/services/api";
import {
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  setStoredToken,
} from "@/services/auth";
import type { AuthUser } from "@/types/auth";

export interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(token !== null);

  const signOut = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  // Register global 401 handler
  useEffect(() => {
    setOnUnauthorized(signOut);
  }, [signOut]);

  // Validate stored token on mount
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    fetchCurrentUser(token)
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) signOut();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = useCallback(async (newToken: string) => {
    setStoredToken(newToken);
    setToken(newToken);
    const u = await fetchCurrentUser(newToken);
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
