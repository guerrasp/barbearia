import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe, priceIdForPlan } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireUserForStore } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  // FREE = "Pioneiro" (R$ 39,90), PRO (R$ 69,90), BUSINESS (R$ 99,90)
  plan: z.enum(["FREE", "PRO", "BUSINESS"]),
  storeId: z.string(),
});

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe não está configurado neste ambiente" },
      { status: 503 },
    );
  }

  try {
    const data = bodySchema.parse(await req.json());

    const auth = await requireUserForStore(req, data.storeId);
    if (!auth.ok) return auth.response;

    const store = await prisma.store.findUnique({
      where: { id: data.storeId },
      select: {
        id: true,
        name: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
    }

    // Garante um Customer no Stripe (idempotente — só cria na 1ª vez)
    let customerId = store.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: store.email ?? undefined,
        name: store.name,
        metadata: { storeId: store.id },
      });
      customerId = customer.id;
      await prisma.store.update({
        where: { id: store.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const origin = req.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceIdForPlan(data.plan), quantity: 1 }],
      success_url: `${origin}/admin/configuracoes/plano?status=success`,
      cancel_url: `${origin}/admin/configuracoes/plano?status=cancel`,
      allow_promotion_codes: true,
      metadata: { storeId: store.id, plan: data.plan },
      subscription_data: {
        metadata: { storeId: store.id, plan: data.plan },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error("[stripe/checkout]", error);
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
