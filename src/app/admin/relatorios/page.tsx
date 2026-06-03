"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart3, DollarSign, TrendingUp, Calendar, XCircle,
  Download, Crown, UserCog, Scissors,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface ReportData {
  period: { from: string; to: string };
  summary: {
    revenue: number;
    paidRevenue: number;
    count: number;
    avgTicket: number;
    noShows: number;
    cancellations: number;
    noShowRate: number;
    totalAppointments: number;
  };
  byBarber: { id: string; name: string; revenue: number; count: number }[];
  byService: { id: string; name: string; revenue: number; count: number }[];
  byDay: { date: string; revenue: number }[];
  rows: Record<string, string | number>[];
}

function toInput(d: Date) {
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type Preset = "this_month" | "last_month" | "last_30" | "custom";

export default function RelatoriosPage() {
  const { store } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [planLocked, setPlanLocked] = useState(false);
  const [preset, setPreset] = useState<Preset>("this_month");

  const now = new Date();
  const [from, setFrom] = useState(toInput(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(toInput(now));

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const n = new Date();
    if (p === "this_month") {
      setFrom(toInput(new Date(n.getFullYear(), n.getMonth(), 1)));
      setTo(toInput(n));
    } else if (p === "last_month") {
      setFrom(toInput(new Date(n.getFullYear(), n.getMonth() - 1, 1)));
      setTo(toInput(new Date(n.getFullYear(), n.getMonth(), 0)));
    } else if (p === "last_30") {
      setFrom(toInput(new Date(n.getTime() - 30 * 24 * 60 * 60 * 1000)));
      setTo(toInput(n));
    }
  };

  const fetchReport = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      const d = await api.get<ReportData>(`/reports?storeId=${store.id}&from=${from}&to=${to}`);
      setData(d);
      setPlanLocked(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("business") || msg.toLowerCase().includes("disponíveis")) {
        setPlanLocked(true);
      } else {
        toast.error("Erro ao carregar relatório");
      }
    } finally {
      setLoading(false);
    }
  }, [store, from, to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportCSV = () => {
    if (!data?.rows.length) {
      toast("Nada para exportar nesse período.", { icon: "ℹ️" });
      return;
    }
    const headers = Object.keys(data.rows[0]);
    const csv = [
      headers.join(","),
      ...data.rows.map((r) =>
        headers.map((h) => {
          const v = String(r[h] ?? "");
          return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(","),
      ),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${from}-a-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bloqueado por plano → upsell
  if (planLocked) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="!p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-korta-gold/15 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-7 h-7 text-korta-gold" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Relatórios avançados</h1>
          <p className="text-muted text-sm mt-2">
            Faturamento por período, por barbeiro e serviço, comparativos e exportação em CSV
            estão disponíveis nos planos <strong>Business</strong> e <strong>Korta IA</strong>.
          </p>
          <Link href="/admin/configuracoes/plano">
            <Button className="mt-5">
              <Crown className="w-4 h-4" /> Ver planos
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Relatórios
          </h1>
          <p className="text-muted text-sm mt-1">Análise do seu faturamento e atendimentos</p>
        </div>
        <Button variant="secondary" onClick={exportCSV} disabled={!data?.rows.length}>
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* Filtros de período */}
      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: "this_month" as Preset, label: "Este mês" },
            { key: "last_month" as Preset, label: "Mês passado" },
            { key: "last_30" as Preset, label: "Últimos 30 dias" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                preset === key ? "bg-primary text-white" : "bg-slate-100 text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }}
              className="rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-muted text-sm">até</span>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPreset("custom"); }}
              className="rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-center text-muted py-12">Sem dados.</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={DollarSign} color="amber" label="Faturamento" value={formatCurrency(data.summary.revenue)} hint={`Pago: ${formatCurrency(data.summary.paidRevenue)}`} />
            <Kpi icon={TrendingUp} color="emerald" label="Atendimentos" value={String(data.summary.count)} hint="concluídos" />
            <Kpi icon={DollarSign} color="blue" label="Ticket médio" value={formatCurrency(data.summary.avgTicket)} />
            <Kpi icon={XCircle} color="rose" label="No-show" value={`${data.summary.noShowRate}%`} hint={`${data.summary.noShows} faltas · ${data.summary.cancellations} cancel.`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Por barbeiro */}
            <BreakdownCard
              title="Faturamento por barbeiro"
              icon={UserCog}
              items={data.byBarber.map((b) => ({ id: b.id, name: b.name, revenue: b.revenue, sub: `${b.count} atend.` }))}
            />
            {/* Por serviço */}
            <BreakdownCard
              title="Faturamento por serviço"
              icon={Scissors}
              items={data.byService.map((s) => ({ id: s.id, name: s.name, revenue: s.revenue, sub: `${s.count}x` }))}
            />
          </div>

          {/* Por dia */}
          <Card className="!p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4" /> Faturamento por dia
            </h3>
            {data.byDay.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">Nenhum atendimento concluído no período.</p>
            ) : (
              <div className="space-y-1.5">
                {data.byDay.map((d) => {
                  const max = Math.max(...data.byDay.map((x) => x.revenue)) || 1;
                  const pct = Math.round((d.revenue / max) * 100);
                  const [y, m, dd] = d.date.split("-");
                  return (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="text-xs font-mono w-14 shrink-0 text-muted">{dd}/{m}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-korta-gold rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs w-20 text-right font-medium">{formatCurrency(d.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string;
  color: "blue" | "emerald" | "amber" | "rose";
}) {
  const palette: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    rose: "bg-rose-500/10 text-rose-500",
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

function BreakdownCard({ title, icon: Icon, items }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { id: string; name: string; revenue: number; sub: string }[];
}) {
  const max = Math.max(...items.map((i) => i.revenue), 1);
  return (
    <Card className="!p-5">
      <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4" /> {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">Nenhum dado no período.</p>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium truncate">{it.name} <span className="text-muted font-normal">· {it.sub}</span></span>
                <span className="font-semibold">{formatCurrency(it.revenue)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-korta-gold rounded-full" style={{ width: `${Math.round((it.revenue / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
