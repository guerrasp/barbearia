"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import ShareStoreLink from "@/components/dashboard/ShareStoreLink";
import { formatCurrency } from "@/lib/utils";
import {
  CalendarDays,
  Users,
  Scissors,
  UserCog,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  Percent,
  BarChart3,
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

interface BarberRevenueItem {
  id: string;
  name: string;
  revenue: number;
  commission: number;
  commissionRate: number;
}

interface PeakHourItem {
  hour: number;
  count: number;
}

interface DashboardData {
  today: {
    count: number;
    occupancy: number;
    totalSlots: number;
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
    occupancyEstimate: number;
    vsLastMonth: {
      revenueChange: number;
      appointmentChange: number;
      lastMonthRevenue: number;
      lastMonthCount: number;
    };
  };
  totals: {
    customers: number;
    barbers: number;
    services: number;
  };
  barberRevenue: BarberRevenueItem[];
  peakHours: PeakHourItem[];
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

function ChangeIndicator({ value, label }: { value: number; label: string }) {
  if (value === 0) return <span className="text-[11px] text-muted">{label}: sem variação</span>;
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? "text-emerald-500" : "text-rose-500";
  return (
    <span className={`text-[11px] flex items-center gap-1 ${color}`}>
      <Icon className="w-3 h-3" />
      {isPositive ? "+" : ""}{value}% {label}
    </span>
  );
}

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

      {store && <ShareStoreLink slug={store.slug} storeName={store.name} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={CalendarDays}
          label="Agendamentos hoje"
          value={loading ? "..." : String(data?.today.count ?? 0)}
          color="blue"
          hint={data ? `Ocupação: ${data.today.occupancy}%` : undefined}
        />
        <KpiCard
          icon={TrendingUp}
          label="Concluídos no mês"
          value={loading ? "..." : String(data?.month.completedCount ?? 0)}
          color="emerald"
          extra={data ? <ChangeIndicator value={data.month.vsLastMonth.appointmentChange} label="vs mês anterior" /> : undefined}
        />
        <KpiCard
          icon={DollarSign}
          label="Faturamento do mês"
          value={loading ? "..." : formatCurrency(data?.month.revenue ?? 0)}
          color="amber"
          extra={data ? <ChangeIndicator value={data.month.vsLastMonth.revenueChange} label="vs mês anterior" /> : undefined}
          hint={data ? `Pago: ${formatCurrency(data.month.paidRevenue)}` : undefined}
        />
        <KpiCard
          icon={Percent}
          label="Ocupação do mês"
          value={loading ? "..." : `${data?.month.occupancyEstimate ?? 0}%`}
          color="indigo"
          hint={data ? `${data.totals.barbers} barbeiro(s) ativo(s)` : undefined}
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
            <div className="space-y-2 max-h-72 overflow-y-auto">
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
            <div className="space-y-2 max-h-72 overflow-y-auto">
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

      {/* Faturamento por barbeiro + Horários de pico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Faturamento por barbeiro */}
        <Card className="!p-5">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4" /> Faturamento por barbeiro
            <span className="text-xs text-muted font-normal ml-auto">Este mês</span>
          </h3>
          {loading ? (
            <p className="text-sm text-muted">Carregando...</p>
          ) : !data?.barberRevenue.length ? (
            <p className="text-sm text-muted py-6 text-center">Nenhum dado ainda.</p>
          ) : (
            <div className="space-y-3">
              {data.barberRevenue.map((b) => {
                const maxRevenue = data.barberRevenue[0]?.revenue || 1;
                const pct = Math.round((b.revenue / maxRevenue) * 100);
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium truncate">{b.name}</span>
                      <span className="text-foreground font-semibold">{formatCurrency(b.revenue)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-korta-gold rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted mt-0.5">
                      <span>Comissão ({b.commissionRate}%)</span>
                      <span>{formatCurrency(b.commission)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Horários de pico */}
        <Card className="!p-5">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" /> Horários de pico
            <span className="text-xs text-muted font-normal ml-auto">Últimos 7 dias</span>
          </h3>
          {loading ? (
            <p className="text-sm text-muted">Carregando...</p>
          ) : !data?.peakHours.length ? (
            <p className="text-sm text-muted py-6 text-center">Nenhum dado ainda.</p>
          ) : (
            <div className="space-y-2">
              {data.peakHours.map((ph, i) => {
                const maxCount = data.peakHours[0]?.count || 1;
                const pct = Math.round((ph.count / maxCount) * 100);
                const label = `${ph.hour.toString().padStart(2, "0")}:00 – ${(ph.hour + 1).toString().padStart(2, "0")}:00`;
                return (
                  <div key={ph.hour} className="flex items-center gap-3">
                    <span className="text-sm font-mono w-28 shrink-0 text-muted">{label}</span>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${
                          i === 0
                            ? "bg-korta-gold"
                            : i === 1
                              ? "bg-korta-gold/70"
                              : "bg-korta-gold/40"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-[11px] font-medium text-foreground/70">
                        {ph.count} agendamento{ph.count > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
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
  extra,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  extra?: React.ReactNode;
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
          {extra && <div className="mt-1">{extra}</div>}
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${palette[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}
