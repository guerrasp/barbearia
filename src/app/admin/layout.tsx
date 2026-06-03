"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import TrialBanner from "@/components/layout/TrialBanner";
import { Toaster } from "react-hot-toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = "/";
    }
  }, [user, isLoading]);

  // Redireciona BARBER de páginas admin-only para a agenda
  const ADMIN_ONLY = ["/admin/servicos", "/admin/barbeiros", "/admin/clientes", "/admin/configuracoes", "/admin/relatorios", "/admin/assinaturas"];
  useEffect(() => {
    if (!isLoading && user?.role === "BARBER") {
      const isAdminOnly = pathname === "/admin" || ADMIN_ONLY.some((p) => pathname.startsWith(p));
      if (isAdminOnly) {
        window.location.href = "/admin/agenda";
      }
    }
  }, [user, isLoading, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Toaster position="top-right" />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <TrialBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-br from-slate-50 via-white to-amber-50/30 relative">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-korta-gold/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-korta-bg/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
