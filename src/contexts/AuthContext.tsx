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
  role: "ADMIN" | "SELLER" | "CUSTOMER";
  storeId: string;
  store: Store;
}

interface AuthContextType {
  user: User | null;
  store: Store | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ role: string }>;
  register: (data: { email: string; password: string; name: string; storeName: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Recuperar sessão do localStorage
    const stored = localStorage.getItem("bella_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setStore(parsed.store);
      } catch {
        localStorage.removeItem("bella_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User; session: unknown }>("/auth/login", {
      email,
      password,
    });
    setUser(data.user);
    setStore(data.user.store);
    localStorage.setItem("bella_user", JSON.stringify(data.user));
    return { role: data.user.role };
  }, []);

  const register = useCallback(async (data: { email: string; password: string; name: string; storeName: string }) => {
    await api.post("/auth/register", data);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setStore(null);
    localStorage.removeItem("bella_user");
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider value={{ user, store, isLoading, login, register, logout }}>
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
