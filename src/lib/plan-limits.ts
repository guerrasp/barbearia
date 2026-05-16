import type { Plan } from "@/generated/prisma/client";

/**
 * Limites por plano. Centralizado pra ser fácil de auditar e ajustar.
 *
 * Convenção: `Infinity` = sem limite. Use `Number.isFinite(limit)` antes
 * de comparar quando quiser detectar "ilimitado".
 *
 * IMPORTANTE: o enum `Plan` ainda usa "FREE" por compatibilidade com a
 * migration original, mas semanticamente FREE = "Pioneiro" (R$ 39,90/mês,
 * com 14 dias de trial sem cartão).
 */
export interface PlanLimits {
  maxBarbers: number;
  whatsappReminders: boolean;
  multiUnit: boolean;
  advancedReports: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxBarbers: 2,
    whatsappReminders: false,
    multiUnit: false,
    advancedReports: false,
  },
  PRO: {
    maxBarbers: 5,
    whatsappReminders: true,
    multiUnit: false,
    advancedReports: false,
  },
  BUSINESS: {
    maxBarbers: Infinity,
    whatsappReminders: true,
    multiUnit: true,
    advancedReports: true,
  },
};

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Pioneiro",
  PRO: "Pro",
  BUSINESS: "Business",
};

/** Preço mensal em centavos — só para exibição. O preço real cobrado vem do
 *  Stripe (Price ID configurado por ambiente). */
export const PLAN_PRICES_BRL: Record<Plan, number> = {
  FREE: 3990,
  PRO: 6990,
  BUSINESS: 9990,
};

export const TRIAL_DAYS = 14;

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function formatPriceBRL(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}
