"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import KortaLogo from "@/components/brand/KortaLogo";
import {
  LayoutDashboard,
  Scissors,
  Users,
  UserCog,
  CalendarDays,
  CalendarRange,
  Settings,
  Crown,
  Palette,
  Repeat,
  LogOut,
  X,
} from "lucide-react";

type UserRole = "ADMIN" | "BARBER" | "CUSTOMER";

interface MenuItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN"] },
  { href: "/admin/agendamentos", label: "Agendamentos", icon: CalendarDays, roles: ["ADMIN"] },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarRange, roles: ["ADMIN", "BARBER"] },
  { href: "/admin/servicos", label: "Serviços", icon: Scissors, roles: ["ADMIN"] },
  { href: "/admin/barbeiros", label: "Barbeiros", icon: UserCog, roles: ["ADMIN"] },
  { href: "/admin/clientes", label: "Clientes", icon: Users, roles: ["ADMIN"] },
  { href: "/admin/assinaturas", label: "Clube", icon: Repeat, roles: ["ADMIN"] },
  { href: "/admin/meu-perfil", label: "Meu Perfil", icon: UserCog, roles: ["BARBER"] },
  { href: "/admin/configuracoes/plano", label: "Plano", icon: Crown, roles: ["ADMIN"] },
  { href: "/admin/configuracoes/personalizacao", label: "Personalização", icon: Palette, roles: ["ADMIN"] },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, roles: ["ADMIN"] },
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
          "korta-surface fixed top-0 left-0 z-50 h-full w-64 bg-korta-bg text-sidebar-text flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto shadow-2xl border-r border-white/5",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="min-w-0">
            <KortaLogo size="sm" />
            <div className="mt-2">
              <p className="text-sm font-semibold text-korta-text truncate">{store?.name || "Barbearia"}</p>
              <p className="text-xs text-korta-muted truncate">{user?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {(() => {
            const visible = menuItems.filter((item) => user && item.roles.includes(user.role));
            // Item ativo = o de caminho mais específico (mais longo) que casa
            // com a URL atual. Evita que "/admin/agenda" acenda em
            // "/admin/agendamentos" (prefixo) e que pai+filho acendam juntos.
            const activeHref = visible
              .map((i) => i.href)
              .filter((href) => pathname === href || pathname.startsWith(href + "/"))
              .sort((a, b) => b.length - a.length)[0];
            return visible.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-korta-gold text-korta-bg shadow-lg shadow-korta-gold/20"
                    : "text-korta-muted hover:bg-korta-surface hover:text-korta-text"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
            });
          })()}
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-korta-muted hover:bg-korta-surface hover:text-korta-text w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
