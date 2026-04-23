"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Bell, Search, LogOut, User as UserIcon, Store as StoreIcon, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { user, store, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const initial = (user?.name?.trim()?.[0] || "A").toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openNotifications = () => {
    setNotifOpen((v) => !v);
    setProfileOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-background transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
      </div>

      <div className="flex items-center gap-3">
        {/* Busca rápida */}
        <div className="hidden sm:flex items-center bg-background rounded-lg px-3 py-2 gap-2 w-64">
          <Search className="w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar clientes..."
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted"
          />
        </div>

        {/* Notificações */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={openNotifications}
            className="relative p-2 rounded-lg hover:bg-background transition-colors"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5 text-muted" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-background">
                <h3 className="font-semibold text-sm text-foreground">Notificações</h3>
                <p className="text-xs text-muted">Agendamentos e lembretes</p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                <div className="p-6 text-center text-muted text-sm">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Nenhuma notificação
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Avatar + perfil */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="w-9 h-9 rounded-full bg-korta-gold flex items-center justify-center text-korta-bg text-sm font-bold hover:opacity-90 transition-opacity"
            aria-label="Menu do perfil"
          >
            {initial}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 py-4 border-b border-border bg-korta-bg text-korta-text">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-korta-gold flex items-center justify-center text-korta-bg font-bold">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{user?.name || "Admin"}</p>
                    <p className="text-xs text-korta-muted truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <div className="px-3 py-2.5 flex items-center gap-3 text-sm text-muted">
                  <StoreIcon className="w-4 h-4" />
                  <span className="truncate">{store?.name}</span>
                </div>
                <div className="px-3 py-2.5 flex items-center gap-3 text-sm text-muted">
                  <UserIcon className="w-4 h-4" />
                  <span className="truncate capitalize">
                    {user?.role === "ADMIN" ? "Administrador" : user?.role === "BARBER" ? "Barbeiro" : "Cliente"}
                  </span>
                </div>

                <div className="border-t border-border my-2" />

                <a
                  href="/admin/configuracoes"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-background transition-colors"
                >
                  <StoreIcon className="w-4 h-4" />
                  Configurações da loja
                </a>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-danger rounded-lg hover:bg-danger/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
