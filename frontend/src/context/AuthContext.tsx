import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getMe, login as apiLogin } from "../api/client";
import type { UserProfile } from "../api/types";

const STORAGE_KEY = "stashiq_token";

type AuthContextValue = {
  token: string | null;
  user: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (accessToken: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(STORAGE_KEY)));

  const loadProfile = useCallback(async (accessToken: string) => {
    const profile = await getMe(accessToken);
    setUser(profile);
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadProfile(token)
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(STORAGE_KEY);
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, loadProfile]);

  const loginWithToken = useCallback(
    async (accessToken: string) => {
      localStorage.setItem(STORAGE_KEY, accessToken);
      setToken(accessToken);
      await loadProfile(accessToken);
    },
    [loadProfile],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await apiLogin(email, password);
      await loginWithToken(access_token);
    },
    [loginWithToken],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = user?.role === "admin";

  const value = useMemo(
    () => ({ token, user, isAdmin, loading, login, loginWithToken, logout }),
    [token, user, isAdmin, loading, login, loginWithToken, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
