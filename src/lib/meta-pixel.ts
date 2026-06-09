/**
 * Helper para disparar eventos de conversão do Meta Pixel no cliente.
 *
 * Uso:
 *   import { trackMetaEvent } from "@/lib/meta-pixel";
 *   trackMetaEvent("Lead");
 *   trackMetaEvent("CompleteRegistration", { value: 149.9, currency: "BRL" });
 *
 * Eventos padrão úteis pro Korta:
 *   - "Lead"                 → começou o cadastro / demonstrou interesse
 *   - "CompleteRegistration" → criou a loja (cadastro concluído)
 *   - "StartTrial"           → iniciou o trial
 *   - "Subscribe"            → assinou um plano pago
 *
 * Seguro: se o pixel não estiver carregado (sem env), vira no-op.
 */
type MetaStandardEvent =
  | "Lead"
  | "CompleteRegistration"
  | "StartTrial"
  | "Subscribe"
  | "Contact"
  | "ViewContent"
  | "InitiateCheckout";

interface MetaEventParams {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  [key: string]: unknown;
}

export function trackMetaEvent(event: MetaStandardEvent, params?: MetaEventParams) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { fbq?: (...args: unknown[]) => void };
  if (typeof w.fbq !== "function") return;
  try {
    w.fbq("track", event, params || {});
  } catch {
    // no-op
  }
}

/** Evento customizado (não-padrão), caso precise. */
export function trackMetaCustom(event: string, params?: MetaEventParams) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { fbq?: (...args: unknown[]) => void };
  if (typeof w.fbq !== "function") return;
  try {
    w.fbq("trackCustom", event, params || {});
  } catch {
    // no-op
  }
}
