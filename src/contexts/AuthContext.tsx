"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { api } from "@/lib/api";

interface Store {
  id: string;
  name: string;
  slug: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "BARBER" | "CUSTOMER";
  storeId: string;
  customerId: string | null;
  store: Store;
}

/** Sessão do Supabase salva no localStorage. Apenas access_token é
 *  obrigatório (a parte que vai no header Authorization de cada request). */
interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

interface LoginResponse {
  user: User;
  session: Session;
}

interface AuthContextType {
  user: User | null;
  store: Store | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ role: string }>;
  /** Usado pelo onboarding para salvar a sessão recém-criada (usuário e
   *  token vêm direto do /api/onboarding em vez de chamar /api/auth/login
   *  uma segunda vez). */
  setSession: (user: User, session: Session) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = "korta_user";
const SESSION_KEY = "korta_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Hidratação: lê localStorage após mount pra evitar mismatch SSR/client.
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setStore(parsed.store);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const persistSession = useCallback((u: User, s: Session) => {
    setUser(u);
    setStore(u.store);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<LoginResponse>("/auth/login", { email, password });
      persistSession(data.user, data.session);
      return { role: data.user.role };
    },
    [persistSession],
  );

  const setSession = useCallback(
    (u: User, s: Session) => persistSession(u, s),
    [persistSession],
  );

  const logout = useCallback(() => {
    setUser(null);
    setStore(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider value={{ user, store, isLoading, login, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
