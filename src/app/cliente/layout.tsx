"use client";

import { Store, LogOut } from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      {/* Header simples */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Bella Perfumaria</h1>
          </div>
          <button className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
