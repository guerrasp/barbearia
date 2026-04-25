import type { Plan } from "@/generated/prisma/client";

/**
 * Limites por plano. Centralizado pra ser fácil de auditar e ajustar.
 *
 * Convenção: `Infinity` = sem limite. Use `Number.isFinite(limit)` antes
 * de comparar quando quiser detectar "ilimitado".
 */
export interface PlanLimits {
  maxBarbers: number;
  smsReminders: boolean;
  multiUnit: boolean;
  advancedReports: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxBarbers: 1,
    smsReminders: false,
    multiUnit: false,
    advancedReports: false,
  },
  PRO: {
    maxBarbers: 5,
    smsReminders: true,
    multiUnit: false,
    advancedReports: false,
  },
  BUSINESS: {
    maxBarbers: Infinity,
    smsReminders: true,
    multiUnit: true,
    advancedReports: true,
  },
};

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Pioneiro",
  PRO: "Pro",
  BUSINESS: "Business",
};

export function limitsFor(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan];
}
