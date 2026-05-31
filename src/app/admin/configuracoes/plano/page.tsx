"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  Crown,
  Check,
  ExternalLink,
  Sparkles,
  Zap,
  Rocket,
  Bot,
  Clock,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

type Plan = "FREE" | "PRO" | "BUSINESS" | "KORTA_IA";

interface PlanInfo {
  plan: Plan;
  planRenewsAt: string | null;
  hasSubscription: boolean;
  trial: {
    active: boolean;
    expired: boolean;
    endsAt: string | null;
    daysLeft: number | null;
  };
  canWrite: boolean;
  usage: { barbers: number; aiMessagesUsed?: number };
  limits: {
    maxBarbers: number | null;
    whatsappReminders: boolean;
    multiUnit: boolean;
    advancedReports: boolean;
    aiMessagesPerMonth: number | null;
  };
}

const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Pioneiro",
  PRO: "Pro",
  BUSINESS: "Business",
  KORTA_IA: "Korta IA",
};

const PLAN_PRICES: Record<Plan, string> = {
  FREE: "R$ 39,90/mês",
  PRO: "R$ 69,90/mês",
  BUSINESS: "R$ 99,90/mês",
  KORTA_IA: "R$ 149,90/mês",
};

const PLAN_BENEFITS: Record<Plan, string[]> = {
  FREE: [
    "Até 2 barbeiros",
    "Agendamentos ilimitados",
    "Página pública da loja",
    "Lembretes por WhatsApp e email",
  ],
  PRO: [
    "Até 5 barbeiros",
    "Suporte prioritário",
    "Tudo do Pioneiro",
  ],
  BUSINESS: [
    "Barbeiros ilimitados",
    "Atendente virtual IA (50 msg/mês)",
    "Multi-unidades",
    "Relatórios avançados",
    "Tudo do Pro",
  ],
  KORTA_IA: [
    "Atendente virtual IA ilimitado 24h",
    "Barbeiros ilimitados",
    "Multi-unidades",
    "Relatórios avançados",
    "Tudo do Business",
  ],
};

const PLAN_ICONS: Record<Plan, React.ReactNode> = {
  FREE: <Rocket className="w-5 h-5" />,
  PRO: <Sparkles className="w-5 h-5" />,
  BUSINESS: <Zap className="w-5 h-5" />,
  KORTA_IA: <Bot className="w-5 h-5" />,
};

export default function PlanoPage() {
  const { user } = useAuth();
  const storeId = user?.storeId;
  const searchParams = useSearchParams();

  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast.success("Pagamento confirmado! Bem-vindo ao seu novo plano.");
    } else if (status === "cancel") {
      toast("Checkout cancelado.", { icon: "ℹ️" });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<PlanInfo>(`/stores/${storeId}/plan`);
        if (!cancelled) setInfo(data);
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar o plano.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const handleSubscribe = async (plan: Plan) => {
    if (!storeId) return;
    setActionLoading(plan);
    try {
      const { url } = await api.post<{ url: string }>("/stripe/checkout", {
        plan,
        storeId,
      });
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao iniciar checkout";
      toast.error(msg);
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    if (!storeId) return;
    setActionLoading("portal");
    try {
      const { url } = await api.post<{ url: string }>("/stripe/portal", {
        storeId,
      });
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao abrir portal";
      toast.error(msg);
      setActionLoading(null);
    }
  };

  if (loading || !info) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentPlan = info.plan;
  const renewsAt = info.planRenewsAt
    ? new Date(info.planRenewsAt).toLocaleDateString("pt-BR")
    : null;
  const trialEndsAt = info.trial.endsAt
    ? new Date(info.trial.endsAt).toLocaleDateString("pt-BR")
    : null;
  const limit = info.limits.maxBarbers;
  const usage = info.usage.barbers;
  const usagePct = limit ? Math.min(100, (usage / limit) * 100) : 0;

  // Lista de planos disponíveis para upgrade (não mostra o plano atual se já pago)
  const plansToShow: Plan[] = (["FREE", "PRO", "BUSINESS", "KORTA_IA"] as Plan[]).filter((p) => {
    // Se está no trial (sem assinatura), mostra todos
    if (!info.hasSubscription) return true;
    // Já tem assinatura: só mostra planos diferentes do atual
    return p !== currentPlan;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plano</h1>
        <p className="text-muted text-sm mt-1">
          Gerencie sua assinatura e veja o uso do seu plano.
        </p>
      </div>

      {/* Banner de trial */}
      {info.trial.active && !info.hasSubscription && (
        <div className="max-w-3xl rounded-xl border border-korta-gold/30 bg-korta-gold/5 p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-korta-gold flex-none mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-foreground">
              {info.trial.daysLeft === 1
                ? "Último dia do seu período de avaliação"
                : `Você tem ${info.trial.daysLeft} dias de avaliação restantes`}
            </p>
            <p className="text-muted mt-0.5">
              Acaba em {trialEndsAt}. Escolha um plano abaixo pra continuar sem
              interrupção.
            </p>
          </div>
        </div>
      )}

      {info.trial.expired && (
        <div className="max-w-3xl rounded-xl border border-danger/30 bg-danger/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger flex-none mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-foreground">
              Seu período de avaliação acabou
            </p>
            <p className="text-muted mt-0.5">
              Assine um plano para reativar agendamentos e edições da loja.
            </p>
          </div>
        </div>
      )}

      {/* Plano atual */}
      <Card className="max-w-3xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Crown className="w-4 h-4 text-korta-gold" />
              {info.hasSubscription ? "Plano atual" : "Plano em avaliação"}
            </div>
            <div className="mt-1 text-3xl font-bold text-foreground">
              {PLAN_LABELS[currentPlan]}
            </div>
            <div className="text-sm text-muted mt-1">
              {PLAN_PRICES[currentPlan]}
              {renewsAt && info.hasSubscription && <> · Renova em {renewsAt}</>}
              {!info.hasSubscription && trialEndsAt && (
                <> · Trial até {trialEndsAt}</>
              )}
            </div>
          </div>
          {info.hasSubscription && (
            <Button
              variant="secondary"
              onClick={handlePortal}
              isLoading={actionLoading === "portal"}
            >
              <ExternalLink className="w-4 h-4" />
              Gerenciar assinatura
            </Button>
          )}
        </div>

        {/* Uso */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-medium">Barbeiros</span>
            <span className="text-muted">
              {usage} {limit ? `/ ${limit}` : "(ilimitado)"}
            </span>
          </div>
          {limit && (
            <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-korta-gold transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Planos disponíveis */}
      {plansToShow.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {info.hasSubscription ? "Trocar plano" : "Escolha um plano"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl">
            {plansToShow.map((plan) => {
              const isCurrent = plan === currentPlan && !info.hasSubscription;
              const highlight = plan === "KORTA_IA";
              return (
                <Card
                  key={plan}
                  className={highlight ? "border-2 border-korta-gold/40" : ""}
                >
                  <div className="flex items-center gap-2 text-korta-gold">
                    {PLAN_ICONS[plan]}
                    <span className="font-bold">{PLAN_LABELS[plan]}</span>
                    {isCurrent && (
                      <span className="ml-auto text-[10px] uppercase tracking-wide bg-korta-gold/15 text-korta-gold px-2 py-0.5 rounded-full">
                        Em trial
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-foreground">
                    {PLAN_PRICES[plan].split("/")[0]}
                    <span className="text-sm text-muted">/mês</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    {PLAN_BENEFITS[plan].map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-success flex-none mt-0.5" />
                        <span className="text-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-4"
                    variant={highlight ? "primary" : "secondary"}
                    onClick={() => handleSubscribe(plan)}
                    isLoading={actionLoading === plan}
                  >
                    Assinar {PLAN_LABELS[plan]}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
