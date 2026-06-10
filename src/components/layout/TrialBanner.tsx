"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface PlanInfo {
  hasSubscription: boolean;
  trial: {
    active: boolean;
    expired: boolean;
    daysLeft: number | null;
  };
}

/** Banner global de trial no topo do admin.
 *
 *  Aparece em 2 cenários:
 *  - Trial ativo com ≤ 7 dias restantes (warning amarelo)
 *  - Trial expirado e sem assinatura (danger vermelho)
 *
 *  Some quando: tem assinatura ativa, ou trial > 7 dias, ou loja
 *  grandfathered (trial = null).
 *
 *  Cacheia o resultado em sessionStorage por 5 min pra não fazer
 *  request a cada navegação entre páginas.
 */
export default function TrialBanner() {
  const { user } = useAuth();
  const storeId = user?.storeId;
  const [info, setInfo] = useState<PlanInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!storeId) return;

    let cancelled = false;
    const cacheKey = `trial:${storeId}`;

    async function load(): Promise<PlanInfo> {
      // Cache de 5min no sessionStorage pra evitar fetch em toda navegação
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < 5 * 60 * 1000) return data;
        }
      } catch {}

      const data = await api.get<PlanInfo>(`/stores/${storeId}/plan`);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }));
      } catch {}
      return data;
    }

    load()
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        // Silencioso — banner não é critico
      });

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (!info || dismissed) return null;
  if (info.hasSubscription) return null;
  if (!info.trial.active && !info.trial.expired) return null;

  const showWarning = info.trial.active && (info.trial.daysLeft ?? 99) <= 7;
  const showDanger = info.trial.expired;

  if (!showWarning && !showDanger) return null;

  const isDanger = showDanger;
  const Icon = isDanger ? AlertTriangle : Clock;
  const label = isDanger
    ? "Seu período de avaliação acabou"
    : info.trial.daysLeft === 1
      ? "Último dia do seu período de avaliação"
      : `Faltam ${info.trial.daysLeft} dias do seu período de avaliação`;
  const sub = isDanger
    ? "Assine um plano para reativar agendamentos e continuar usando."
    : "Escolha um plano agora pra evitar interrupção.";

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-2.5 text-sm border-b ${
        isDanger
          ? "bg-danger/10 border-danger/30 text-danger"
          : "bg-korta-gold/10 border-korta-gold/30 text-foreground"
      }`}
    >
      <Icon
        className={`w-4 h-4 flex-none ${isDanger ? "text-danger" : "text-korta-gold"}`}
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{label}</p>
        <p className="text-xs opacity-80 truncate">{sub}</p>
      </div>
      <Link
        href="/admin/configuracoes/plano"
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
          isDanger
            ? "bg-danger text-white hover:bg-red-600"
            : "bg-korta-gold text-korta-bg hover:bg-korta-gold-hover"
        }`}
      >
        Ver planos <ArrowRight className="w-3 h-3" />
      </Link>
      {!isDanger && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fechar aviso"
          className="text-xs opacity-60 hover:opacity-100 px-1"
        >
          ✕
        </button>
      )}
    </div>
  );
}
