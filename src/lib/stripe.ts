import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  // Aviso só (não joga) — permite o build sem env em ambientes onde billing
  // está desligado. As rotas /api/stripe/* validam antes de usar.
  console.warn("[stripe] STRIPE_SECRET_KEY não configurado");
}

export const stripe = key
  ? new Stripe(key, { apiVersion: "2026-04-22.dahlia" })
  : null;

export function isStripeEnabled(): boolean {
  return Boolean(stripe);
}

/**
 * Plano "FREE" no enum do Prisma corresponde ao tier "Pioneiro" no produto.
 * É um plano pago (R$ 39,90) com 14 dias de trial gratuito sem cartão.
 */
export type PaidPlan = "FREE" | "PRO" | "BUSINESS";

export const STRIPE_PRICE_IDS: Record<PaidPlan, string> = {
  FREE: process.env.STRIPE_PRICE_PIONEIRO || "",
  PRO: process.env.STRIPE_PRICE_PRO || "",
  BUSINESS: process.env.STRIPE_PRICE_BUSINESS || "",
};

export function priceIdForPlan(plan: PaidPlan): string {
  const id = STRIPE_PRICE_IDS[plan];
  if (!id) throw new Error(`Price ID não configurado para o plano ${plan}`);
  return id;
}

export function planFromPriceId(priceId: string): PaidPlan | null {
  if (priceId === STRIPE_PRICE_IDS.FREE) return "FREE";
  if (priceId === STRIPE_PRICE_IDS.PRO) return "PRO";
  if (priceId === STRIPE_PRICE_IDS.BUSINESS) return "BUSINESS";
  return null;
}
