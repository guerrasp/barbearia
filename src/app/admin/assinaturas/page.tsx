"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Crown, Users, Pause, Play, XCircle,
  Check, Repeat, Package,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────
interface PlanService {
  service: { id: string; name: string };
}

interface SubPlan {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  maxUsesPerMonth: number | null;
  isActive: boolean;
  services: PlanService[];
  _count: { subscriptions: number };
}

interface Subscription {
  id: string;
  status: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "PAUSED";
  currentPeriodEnd: string;
  usesThisPeriod: number;
  customer: { id: string; name: string; phone: string | null };
  plan: { id: string; name: string; priceInCents: number; maxUsesPerMonth: number | null };
}

interface Service {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

type Tab = "plans" | "subscribers";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600",
  CANCELLED: "bg-rose-500/10 text-rose-600",
  PAST_DUE: "bg-amber-500/10 text-amber-600",
  PAUSED: "bg-slate-500/10 text-slate-600",
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  CANCELLED: "Cancelado",
  PAST_DUE: "Inadimplente",
  PAUSED: "Pausado",
};

export default function AssinaturasPage() {
  const { store } = useAuth();
  const [tab, setTab] = useState<Tab>("plans");
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal criar/editar plano
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planMaxUses, setPlanMaxUses] = useState("");
  const [planServiceIds, setPlanServiceIds] = useState<string[]>([]);
  const [planSaving, setPlanSaving] = useState(false);

  // Modal inscrever cliente
  const [showSubModal, setShowSubModal] = useState(false);
  const [subCustomerId, setSubCustomerId] = useState("");
  const [subPlanId, setSubPlanId] = useState("");
  const [subSaving, setSubSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      const [p, s, sv, c] = await Promise.all([
        api.get<SubPlan[]>(`/subscription-plans?storeId=${store.id}`),
        api.get<Subscription[]>(`/customer-subscriptions?storeId=${store.id}`),
        api.get<Service[]>(`/servicos?storeId=${store.id}`),
        api.get<Customer[]>(`/clientes?storeId=${store.id}`),
      ]);
      setPlans(p);
      setSubs(s);
      setServices(sv);
      setCustomers(c);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openPlanModal = (plan?: SubPlan) => {
    if (plan) {
      setEditingPlanId(plan.id);
      setPlanName(plan.name);
      setPlanDesc(plan.description || "");
      setPlanPrice((plan.priceInCents / 100).toFixed(2).replace(".", ","));
      setPlanMaxUses(plan.maxUsesPerMonth ? String(plan.maxUsesPerMonth) : "");
      setPlanServiceIds(plan.services.map((s) => s.service.id));
    } else {
      setEditingPlanId(null);
      setPlanName(""); setPlanDesc(""); setPlanPrice(""); setPlanMaxUses(""); setPlanServiceIds([]);
    }
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!store || !planName || !planPrice || planServiceIds.length === 0) {
      toast.error("Preencha nome, preço e selecione ao menos 1 serviço");
      return;
    }
    setPlanSaving(true);
    const payload = {
      name: planName,
      description: planDesc || undefined,
      priceInCents: Math.round(parseFloat(planPrice.replace(",", ".")) * 100),
      maxUsesPerMonth: planMaxUses ? parseInt(planMaxUses) : null,
      serviceIds: planServiceIds,
    };
    try {
      if (editingPlanId) {
        await api.put(`/subscription-plans/${editingPlanId}`, payload);
        toast.success("Plano atualizado!");
      } else {
        await api.post("/subscription-plans", { ...payload, storeId: store.id });
        toast.success("Plano criado!");
      }
      setShowPlanModal(false);
      setEditingPlanId(null);
      setPlanName(""); setPlanDesc(""); setPlanPrice(""); setPlanMaxUses(""); setPlanServiceIds([]);
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar plano");
    } finally {
      setPlanSaving(false);
    }
  };

  const handleSubscribe = async () => {
    if (!store || !subCustomerId || !subPlanId) {
      toast.error("Selecione cliente e plano");
      return;
    }
    setSubSaving(true);
    try {
      await api.post("/customer-subscriptions", {
        customerId: subCustomerId,
        planId: subPlanId,
        storeId: store.id,
      });
      toast.success("Cliente inscrito!");
      setShowSubModal(false);
      setSubCustomerId(""); setSubPlanId("");
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao inscrever");
    } finally {
      setSubSaving(false);
    }
  };

  const handleSubAction = async (subId: string, action: string) => {
    try {
      await api.patch(`/customer-subscriptions/${subId}`, { action });
      toast.success(action === "cancel" ? "Assinatura cancelada" : action === "pause" ? "Assinatura pausada" : "Assinatura reativada");
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  const handleTogglePlan = async (planId: string, isActive: boolean) => {
    try {
      await api.put(`/subscription-plans/${planId}`, { isActive: !isActive });
      toast.success(isActive ? "Plano desativado" : "Plano ativado");
      fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeSubs = subs.filter((s) => s.status === "ACTIVE").length;
  const monthlyRecurring = subs
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => sum + s.plan.priceInCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Crown className="w-6 h-6 text-korta-gold" /> Clube de Assinatura
          </h1>
          <p className="text-muted text-sm mt-1">
            {activeSubs} assinante{activeSubs !== 1 ? "s" : ""} ativo{activeSubs !== 1 ? "s" : ""} · Receita recorrente: {formatCurrency(monthlyRecurring / 100)}/mês
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openPlanModal()}>
            <Package className="w-4 h-4" /> Novo Plano
          </Button>
          <Button onClick={() => setShowSubModal(true)} disabled={plans.filter((p) => p.isActive).length === 0}>
            <Plus className="w-4 h-4" /> Inscrever Cliente
          </Button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {([
          { key: "plans" as Tab, label: "Planos", icon: Package },
          { key: "subscribers" as Tab, label: "Assinantes", icon: Users },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Planos */}
      {tab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.length === 0 ? (
            <Card className="col-span-full !p-8 text-center">
              <Package className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="font-semibold">Nenhum plano criado</p>
              <p className="text-sm text-muted mt-1">Crie seu primeiro plano de assinatura para fidelizar clientes.</p>
            </Card>
          ) : (
            plans.map((p) => (
              <Card key={p.id} className={`!p-5 ${!p.isActive ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{p.name}</h3>
                    {p.description && <p className="text-sm text-muted mt-0.5">{p.description}</p>}
                  </div>
                  {!p.isActive && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-muted">Inativo</span>}
                </div>

                <div className="mt-3">
                  <span className="text-2xl font-bold">{formatCurrency(p.priceInCents / 100)}</span>
                  <span className="text-sm text-muted">/mês</span>
                </div>

                <div className="mt-3 text-sm text-muted">
                  <p>{p.maxUsesPerMonth ? `${p.maxUsesPerMonth} usos/mês` : "Usos ilimitados"}</p>
                  <p className="mt-1">{p._count.subscriptions} assinante{p._count.subscriptions !== 1 ? "s" : ""}</p>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {p.services.map((s) => (
                    <span key={s.service.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {s.service.name}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={() => openPlanModal(p)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleTogglePlan(p.id, p.isActive)}
                    className="text-xs text-muted hover:text-foreground transition-colors"
                  >
                    {p.isActive ? "Desativar plano" : "Reativar plano"}
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab: Assinantes */}
      {tab === "subscribers" && (
        <div className="space-y-2">
          {subs.length === 0 ? (
            <Card className="!p-8 text-center">
              <Users className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="font-semibold">Nenhum assinante ainda</p>
              <p className="text-sm text-muted mt-1">Inscreva seu primeiro cliente em um plano.</p>
            </Card>
          ) : (
            subs.map((s) => (
              <Card key={s.id} className="!p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Crown className="w-5 h-5 text-korta-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{s.customer.name}</p>
                      <p className="text-xs text-muted">
                        {s.plan.name} · {s.usesThisPeriod}/{s.plan.maxUsesPerMonth ?? "∞"} usos · Renova {new Date(s.currentPeriodEnd).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    {s.status === "ACTIVE" && (
                      <>
                        <button onClick={() => handleSubAction(s.id, "pause")} className="p-1.5 rounded-lg hover:bg-slate-100 text-muted" title="Pausar">
                          <Pause className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleSubAction(s.id, "cancel")} className="p-1.5 rounded-lg hover:bg-slate-100 text-muted hover:text-danger" title="Cancelar">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {(s.status === "CANCELLED" || s.status === "PAUSED") && (
                      <button onClick={() => handleSubAction(s.id, "reactivate")} className="p-1.5 rounded-lg hover:bg-slate-100 text-muted hover:text-emerald-600" title="Reativar">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Modal: Criar plano */}
      <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title={editingPlanId ? "Editar Plano" : "Novo Plano de Assinatura"} size="lg">
        <div className="space-y-4">
          <Input label="Nome do plano *" placeholder="Ex: Corte Ilimitado" value={planName} onChange={(e) => setPlanName(e.target.value)} />
          <Input label="Descrição" placeholder="Ex: 4 cortes por mês com 20% de desconto" value={planDesc} onChange={(e) => setPlanDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Preço mensal (R$) *" placeholder="119,90" inputMode="decimal" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} />
            <Input label="Limite de usos/mês" placeholder="Vazio = ilimitado" inputMode="numeric" value={planMaxUses} onChange={(e) => setPlanMaxUses(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Serviços cobertos *</label>
            <div className="grid grid-cols-2 gap-2">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planServiceIds.includes(s.id)}
                    onChange={(e) => {
                      if (e.target.checked) setPlanServiceIds([...planServiceIds, s.id]);
                      else setPlanServiceIds(planServiceIds.filter((id) => id !== s.id));
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{s.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={handleSavePlan} isLoading={planSaving} className="flex-1">
              <Check className="w-4 h-4" /> {editingPlanId ? "Salvar Alterações" : "Criar Plano"}
            </Button>
            <Button variant="secondary" onClick={() => setShowPlanModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Inscrever cliente */}
      <Modal isOpen={showSubModal} onClose={() => setShowSubModal(false)} title="Inscrever Cliente">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cliente *</label>
            <select
              value={subCustomerId}
              onChange={(e) => setSubCustomerId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Selecione...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Plano *</label>
            <select
              value={subPlanId}
              onChange={(e) => setSubPlanId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Selecione...</option>
              {plans.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.priceInCents / 100)}/mês
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button onClick={handleSubscribe} isLoading={subSaving} className="flex-1">
              <Repeat className="w-4 h-4" /> Inscrever
            </Button>
            <Button variant="secondary" onClick={() => setShowSubModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
