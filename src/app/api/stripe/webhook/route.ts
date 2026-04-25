import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // crypto/raw body

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

        const periodEnd = (sub as unknown as { current_period_end?: number })
          .current_period_end;

        await prisma.store.update({
          where: { id: storeId },
          data: {
            plan,
            stripeSubscriptionId: subscriptionId,
            planRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
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
          select: { id: true },
        });
        if (!store) break;

        const periodEnd = (sub as unknown as { current_period_end?: number })
          .current_period_end;

        await prisma.store.update({
          where: { id: store.id },
          data: {
            plan: plan ?? "FREE",
            planRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
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
        await prisma.store.update({
          where: { id: store.id },
          data: {
            plan: "FREE",
            stripeSubscriptionId: null,
            planRenewsAt: null,
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
