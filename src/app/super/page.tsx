"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import KortaLogo from "@/components/brand/KortaLogo";
import {
  ShieldCheck,
  Store as StoreIcon,
  Users,
  CalendarDays,
  Scissors,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface SuperStore {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  _count: {
    users: number;
    barbers: number;
    services: number;
    customers: number;
    appointments: number;
  };
}

interface Totals {
  stores: number;
  barbers: number;
  customers: number;
  appointments: number;
}

export default function SuperPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stores, setStores] = useState<SuperStore[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.href = "/";
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/super/stores", {
          headers: { "x-user-email": user.email },
        });
        if (res.status === 403) {
          setError("Você não tem acesso ao painel super-admin.");
          return;
        }
        if (!res.ok) throw new Error("Falha ao carregar lojas");
        const data = await res.json();
        setStores(data.stores);
        setTotals(data.totals);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="korta-surface min-h-screen bg-korta-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-korta-gold animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="korta-surface min-h-screen bg-korta-bg flex items-center justify-center p-6">
        <div className="bg-korta-surface border border-white/5 rounded-2xl p-8 max-w-md text-center">
          <ShieldCheck className="w-10 h-10 text-korta-gold mx-auto mb-3" />
          <h1 className="text-xl font-bold text-korta-text">Acesso restrito</h1>
          <p className="text-korta-muted mt-2 text-sm">{error}</p>
          <Link
            href="/admin"
            className="inline-block mt-5 px-4 py-2 rounded-lg bg-korta-gold text-korta-bg text-sm font-semibold hover:bg-korta-gold-hover"
          >
            Ir para o painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="korta-surface min-h-screen bg-korta-bg relative">
      <div className="absolute inset-0 bg-gradient-to-br from-korta-bg via-korta-bg to-[#060b1a] pointer-events-none" />

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <KortaLogo size="sm" href="/" />
          <span className="text-xs px-2 py-0.5 rounded-md bg-korta-gold text-korta-bg font-bold">
            SUPER
          </span>
        </div>
        <div className="text-xs text-korta-muted">
          Logado como <span className="text-korta-text">{user?.email}</span>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-korta-text">
          Painel Korta
        </h1>
        <p className="text-korta-muted text-sm mt-1">
          Visão consolidada de todas as lojas no SaaS.
        </p>

        {/* Totais */}
        {totals && (
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={<StoreIcon />} label="Lojas" value={totals.stores} />
            <Stat icon={<Scissors />} label="Barbeiros" value={totals.barbers} />
            <Stat icon={<Users />} label="Clientes" value={totals.customers} />
            <Stat
              icon={<CalendarDays />}
              label="Agendamentos"
              value={totals.appointments}
            />
          </div>
        )}

        {/* Tabela */}
        <div className="mt-8 bg-korta-surface rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-korta-text font-semibold text-sm">
              Lojas ({stores.length})
            </h2>
          </div>

          {stores.length === 0 ? (
            <p className="text-center text-korta-muted text-sm py-12">
              Nenhuma loja ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-korta-muted text-xs uppercase tracking-wider border-b border-white/5">
                    <th className="px-5 py-3 font-medium">Loja</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium text-center">Barbeiros</th>
                    <th className="px-5 py-3 font-medium text-center">Clientes</th>
                    <th className="px-5 py-3 font-medium text-center">Agend.</th>
                    <th className="px-5 py-3 font-medium">Criada em</th>
                    <th className="px-5 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stores.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="font-medium text-korta-text">{s.name}</div>
                        <div className="text-xs text-korta-muted font-mono">
                          /{s.slug}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-korta-muted text-xs">
                        {s.email || "—"}
                      </td>
                      <td className="px-5 py-3 text-center text-korta-text">
                        {s._count.barbers}
                      </td>
                      <td className="px-5 py-3 text-center text-korta-text">
                        {s._count.customers}
                      </td>
                      <td className="px-5 py-3 text-center text-korta-gold font-semibold">
                        {s._count.appointments}
                      </td>
                      <td className="px-5 py-3 text-korta-muted text-xs">
                        {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/agendar/${s.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-korta-gold hover:underline"
                        >
                          ver portal <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-korta-surface rounded-xl p-4 border border-white/5">
      <div className="flex items-center gap-2 text-korta-muted text-xs uppercase tracking-wider [&>svg]:w-4 [&>svg]:h-4">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-korta-text mt-2">{value}</div>
    </div>
  );
}
