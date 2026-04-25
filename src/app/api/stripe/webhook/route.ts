import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // crypto/raw body

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Extrai a data de fim do período corrente da subscription.
 *
 * Compatível com 2 formatos da API do Stripe:
 * - Pré-2025: `subscription.current_period_end` (no nível raiz)
 * - 2025+: `subscription.items.data[0].current_period_end` (movido pro item)
 *
 * Retorna null se nenhum dos dois estiver presente.
 */
function extractPeriodEnd(sub: Stripe.Subscription): Date | null {
  const fromItem = (sub.items?.data?.[0] as unknown as { current_period_end?: number })
    ?.current_period_end;
  const fromRoot = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const seconds = fromItem ?? fromRoot;
  return seconds ? new Date(seconds * 1000) : null;
}

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook não configurado" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Sem signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature inválida", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const storeId = session.metadata?.storeId;
        const subscriptionId = session.subscription as string | null;
        if (!storeId || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : null;
        if (!plan) break;

        await prisma.store.update({
          where: { id: storeId },
          data: {
            plan,
            stripeSubscriptionId: subscriptionId,
            planRenewsAt: extractPeriodEnd(sub),
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const priceId = sub.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : null;

        const store = await prisma.store.findFirst({
          where: { stripeSubscriptionId: sub.id },
          select: { id: true, plan: true },
        });
        if (!store) break;

        const renewsAt = extractPeriodEnd(sub);

        // Se o priceId não bate nenhum dos nossos planos conhecidos, NÃO
        // rebaixa silenciosamente — só loga e mantém o plano atual.
        // Isso protege contra envs faltando ou price ID novo (anual/promo)
        // que ainda não foi mapeado.
        if (!plan) {
          console.error(
            `[stripe/webhook] priceId desconhecido em subscription.updated: ${priceId} (sub=${sub.id}). Mantendo plano ${store.plan}.`,
          );
          await prisma.store.update({
            where: { id: store.id },
            data: { planRenewsAt: renewsAt },
          });
          break;
        }

        await prisma.store.update({
          where: { id: store.id },
          data: {
            plan,
            planRenewsAt: renewsAt,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const store = await prisma.store.findFirst({
          where: { stripeSubscriptionId: sub.id },
          select: { id: true },
        });
        if (!store) break;
        // Cancelou: força trial expirado (epoch) pra que canWrite vire false.
        // Sem isso, lojas grandfathered (trialEndsAt=NULL) continuariam
        // escrevendo após cancelar, porque NULL = "nunca expira" no helper.
        await prisma.store.update({
          where: { id: store.id },
          data: {
            plan: "FREE",
            stripeSubscriptionId: null,
            planRenewsAt: null,
            trialEndsAt: new Date(0),
          },
        });
        break;
      }

      default:
        // Ignora demais eventos silenciosamente
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
