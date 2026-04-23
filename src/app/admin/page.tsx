"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import {
  CalendarDays,
  Users,
  Scissors,
  UserCog,
  DollarSign,
  BadgeCheck,
  Clock,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

interface DashboardData {
  today: {
    count: number;
    list: Array<{
      id: string;
      code: string;
      startAt: string;
      endAt: string;
      status: AppointmentStatus;
      customer: { name: string; phone: string | null };
      barber: { name: string };
      services: { service: { name: string } }[];
    }>;
  };
  upcoming: Array<{
    id: string;
    code: string;
    startAt: string;
    customer: { name: string };
    barber: { name: string };
  }>;
  month: {
    completedCount: number;
    revenue: number;
    paidRevenue: number;
  };
  totals: {
    customers: number;
    barbers: number;
    services: number;
  };
}

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CONFIRMED: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  NO_SHOW: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
};
const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export default function AdminDashboard() {
  const { store, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!store) return;
    try {
      const d = await api.get<DashboardData>(`/dashboard?storeId=${store.id}`);
      setData(d);
    } catch {
      toast.error("Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted">
          Bem-vindo, {user?.name} · {store?.name}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={CalendarDays}
          label="Agendamentos hoje"
          value={loading ? "..." : String(data?.today.count ?? 0)}
          color="blue"
        />
        <KpiCard
          icon={TrendingUp}
          label="Concluídos no mês"
          value={loading ? "..." : String(data?.month.completedCount ?? 0)}
          color="emerald"
        />
        <KpiCard
          icon={DollarSign}
          label="Faturamento do mês"
          value={loading ? "..." : formatCurrency(data?.month.revenue ?? 0)}
          color="amber"
          hint={
            data
              ? `Pago: ${formatCurrency(data.month.paidRevenue)}`
              : undefined
          }
        />
        <KpiCard
          icon={Users}
          label="Clientes cadastrados"
          value={loading ? "..." : String(data?.totals.customers ?? 0)}
          color="indigo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Hoje */}
        <Card className="!p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Hoje
            </h3>
            <Link href="/admin/agenda" className="text-xs text-primary hover:underline">
              Ver agenda →
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted">Carregando...</p>
          ) : data?.today.list.length === 0 ? (
            <p className="text-sm text-muted py-6 text-center">
              Nenhum agendamento para hoje.
            </p>
          ) : (
            <div className="space-y-2">
              {data?.today.list.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border"
                >
                  <div className="text-sm font-mono w-14 shrink-0 text-muted">
                    {new Date(a.startAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.customer.name}</p>
                    <p className="text-xs text-muted truncate">
                      {a.barber.name} · {a.services.map((s) => s.service.name).join(", ")}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_STYLE[a.status]}`}
                  >
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Próximos 7 dias */}
        <Card className="!p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Próximos dias
            </h3>
            <Link href="/admin/agendamentos" className="text-xs text-primary hover:underline">
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted">Carregando...</p>
          ) : (data?.upcoming.length ?? 0) === 0 ? (
            <p className="text-sm text-muted py-6 text-center">
              Sem agendamentos nos próximos 7 dias.
            </p>
          ) : (
            <div className="space-y-2">
              {data?.upcoming.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border"
                >
                  <div className="text-xs w-24 shrink-0 text-muted">
                    {new Date(a.startAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.customer.name}</p>
                    <p className="text-xs text-muted truncate">{a.barber.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { href: "/admin/agendamentos", label: "Agendamentos", icon: CalendarDays },
          { href: "/admin/servicos", label: "Serviços", icon: Scissors },
          { href: "/admin/barbeiros", label: "Barbeiros", icon: UserCog },
          { href: "/admin/clientes", label: "Clientes", icon: Users },
        ].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">{label}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  color: "blue" | "emerald" | "amber" | "indigo";
}) {
  const palette: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    indigo: "bg-indigo-500/10 text-indigo-500",
  };
  return (
    <Card className="!p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted">{label}</p>
          <p className="text-xl font-bold mt-1 truncate">{value}</p>
          {hint && <p className="text-[11px] text-muted mt-0.5 truncate">{hint}</p>}
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${palette[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}
