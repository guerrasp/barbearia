"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Scissors,
  Users,
  UserCog,
  CalendarDays,
  CalendarRange,
  Settings,
  LogOut,
  X,
  Store,
} from "lucide-react";

const menuItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/agendamentos", label: "Agendamentos", icon: CalendarDays },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarRange },
  { href: "/admin/servicos", label: "Serviços", icon: Scissors },
  { href: "/admin/barbeiros", label: "Barbeiros", icon: UserCog },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, store, logout } = useAuth();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-blue-950 via-blue-900 to-indigo-950 text-sidebar-text flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Store className="w-8 h-8 text-primary-light" />
            <div>
              <h1 className="text-lg font-bold">{store?.name || "Barbearia"}</h1>
              <p className="text-xs text-sidebar-text/60">{user?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-sidebar-text/80 hover:bg-sidebar-hover hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-sidebar-text/60 hover:bg-sidebar-hover hover:text-white w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
