"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Crown, Check, ExternalLink, Sparkles, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

type Plan = "FREE" | "PRO" | "BUSINESS";

interface PlanInfo {
  plan: Plan;
  planRenewsAt: string | null;
  hasSubscription: boolean;
  usage: { barbers: number };
  limits: {
    maxBarbers: number | null;
    smsReminders: boolean;
    multiUnit: boolean;
    advancedReports: boolean;
  };
}

const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Pioneiro",
  PRO: "Pro",
  BUSINESS: "Business",
};

const PLAN_PRICES: Record<Plan, string> = {
  FREE: "Grátis",
  PRO: "R$ 49/mês",
  BUSINESS: "R$ 99/mês",
};

const PLAN_BENEFITS: Record<Plan, string[]> = {
  FREE: ["1 barbeiro", "Agendamentos ilimitados", "Página pública da loja"],
  PRO: [
    "Até 5 barbeiros",
    "Lembretes por SMS",
    "Suporte por email",
    "Tudo do Pioneiro",
  ],
  BUSINESS: [
    "Barbeiros ilimitados",
    "Multi-unidades",
    "Relatórios avançados",
    "Tudo do Pro",
  ],
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

  const handleUpgrade = async (plan: "PRO" | "BUSINESS") => {
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
  const limit = info.limits.maxBarbers;
  const usage = info.usage.barbers;
  const usagePct = limit ? Math.min(100, (usage / limit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plano</h1>
        <p className="text-muted text-sm mt-1">
          Gerencie sua assinatura e veja o uso do seu plano.
        </p>
      </div>

      {/* Plano atual */}
      <Card className="max-w-3xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Crown className="w-4 h-4 text-korta-gold" />
              Plano atual
            </div>
            <div className="mt-1 text-3xl font-bold text-foreground">
              {PLAN_LABELS[currentPlan]}
            </div>
            <div className="text-sm text-muted mt-1">
              {PLAN_PRICES[currentPlan]}
              {renewsAt && info.hasSubscription && (
                <> · Renova em {renewsAt}</>
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

      {/* Upgrade */}
      {currentPlan !== "BUSINESS" && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Faça upgrade
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            {currentPlan === "FREE" && (
              <Card className="border-2 border-korta-gold/40">
                <div className="flex items-center gap-2 text-korta-gold">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-bold">Pro</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">
                  R$ 49<span className="text-sm text-muted">/mês</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  {PLAN_BENEFITS.PRO.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-success flex-none mt-0.5" />
                      <span className="text-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-4"
                  onClick={() => handleUpgrade("PRO")}
                  isLoading={actionLoading === "PRO"}
                >
                  Assinar Pro
                </Button>
              </Card>
            )}
            <Card>
              <div className="flex items-center gap-2 text-foreground">
                <Zap className="w-5 h-5 text-korta-gold" />
                <span className="font-bold">Business</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground">
                R$ 99<span className="text-sm text-muted">/mês</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {PLAN_BENEFITS.BUSINESS.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success flex-none mt-0.5" />
                    <span className="text-foreground">{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={() => handleUpgrade("BUSINESS")}
                isLoading={actionLoading === "BUSINESS"}
              >
                Assinar Business
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
