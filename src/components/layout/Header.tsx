"use client";

import { Menu, Bell, Search } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export default function Header({ onMenuClick, title }: HeaderProps) {
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
            placeholder="Buscar produtos, clientes..."
            className="bg-transparent text-sm outline-none w-full placeholder:text-muted"
          />
        </div>

        {/* Notificações */}
        <button className="relative p-2 rounded-lg hover:bg-background transition-colors">
          <Bell className="w-5 h-5 text-muted" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
          A
        </div>
      </div>
    </header>
  );
}
