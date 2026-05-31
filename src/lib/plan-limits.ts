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
 *
 * Planos:
 *   FREE      = Pioneiro  (R$ 39,90)  — entrada
 *   PRO       = Pro       (R$ 69,90)  — WhatsApp + mais barbeiros
 *   BUSINESS  = Business  (R$ 99,90)  — ilimitado + IA 50 msg/mês
 *   KORTA_IA  = Korta IA  (R$ 149,90) — tudo + IA ilimitada
 */
export interface PlanLimits {
  maxBarbers: number;
  whatsappReminders: boolean;
  multiUnit: boolean;
  advancedReports: boolean;
  /** Mensagens IA por mês. 0 = desabilitado, Infinity = ilimitado. */
  aiMessagesPerMonth: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxBarbers: 2,
    whatsappReminders: true,
    multiUnit: false,
    advancedReports: false,
    aiMessagesPerMonth: 0,
  },
  PRO: {
    maxBarbers: 5,
    whatsappReminders: true,
    multiUnit: false,
    advancedReports: false,
    aiMessagesPerMonth: 0,
  },
  BUSINESS: {
    maxBarbers: Infinity,
    whatsappReminders: true,
    multiUnit: true,
    advancedReports: true,
    aiMessagesPerMonth: 50,
  },
  KORTA_IA: {
    maxBarbers: Infinity,
    whatsappReminders: true,
    multiUnit: true,
    advancedReports: true,
    aiMessagesPerMonth: Infinity,
  },
};

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Pioneiro",
  PRO: "Pro",
  BUSINESS: "Business",
  KORTA_IA: "Korta IA",
};

/** Preço mensal em centavos — só para exibição. O preço real cobrado vem do
 *  Stripe (Price ID configurado por ambiente). */
export const PLAN_PRICES_BRL: Record<Plan, number> = {
  FREE: 3990,
  PRO: 6990,
  BUSINESS: 9990,
  KORTA_IA: 14990,
};

/** Ordem de hierarquia dos planos (índice maior = plano superior). */
export const PLAN_ORDER: Record<Plan, number> = {
  FREE: 0,
  PRO: 1,
  BUSINESS: 2,
  KORTA_IA: 3,
};

export const TRIAL_DAYS = 14;

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function formatPriceBRL(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/** Verifica se o plano tem acesso à IA (mesmo que limitado). */
export function hasAiAccess(plan: Plan): boolean {
  return PLAN_LIMITS[plan].aiMessagesPerMonth > 0;
}
