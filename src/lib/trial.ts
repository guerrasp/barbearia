import { TRIAL_DAYS } from "./plan-limits";

/**
 * Lógica de trial — tudo num só lugar pra evitar divergência entre
 * UI (banner de trial) e backend (guard que bloqueia escrita).
 *
 * Regras:
 * - Loja com `stripeSubscriptionId` ativo → assinatura paga, trial irrelevante.
 * - Loja com `trialEndsAt` no futuro → trial ativo, libera tudo do plano FREE.
 * - Loja com `trialEndsAt` no passado E sem assinatura → trial expirado, bloqueada.
 * - Loja com `trialEndsAt = null` → grandfathered (criada antes do novo modelo).
 */

export interface TrialInput {
  trialEndsAt: Date | string | null;
  stripeSubscriptionId: string | null;
}

export interface TrialStatus {
  hasSubscription: boolean;
  trialActive: boolean;
  trialExpired: boolean;
  trialEndsAt: string | null;
  daysLeft: number | null;
  /** True quando a loja pode escrever (criar/editar dados). */
  canWrite: boolean;
}

export function computeTrialDeadline(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d;
}

export function getTrialStatus(input: TrialInput): TrialStatus {
  const hasSubscription = Boolean(input.stripeSubscriptionId);
  const trialEndsAt = input.trialEndsAt ? new Date(input.trialEndsAt) : null;
  const now = new Date();

  const trialActive = Boolean(trialEndsAt && trialEndsAt.getTime() > now.getTime());
  const trialExpired = Boolean(
    trialEndsAt && trialEndsAt.getTime() <= now.getTime() && !hasSubscription,
  );

  let daysLeft: number | null = null;
  if (trialEndsAt && trialActive) {
    const ms = trialEndsAt.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  return {
    hasSubscription,
    trialActive,
    trialExpired,
    trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
    daysLeft,
    canWrite: hasSubscription || trialActive || trialEndsAt === null,
  };
}
