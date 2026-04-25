import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  storeId: z.string(),
});

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });
  }

  try {
    const data = bodySchema.parse(await req.json());
    const store = await prisma.store.findUnique({
      where: { id: data.storeId },
      select: { stripeCustomerId: true },
    });

    if (!store?.stripeCustomerId) {
      return NextResponse.json(
        { error: "Esta loja ainda não tem assinatura ativa." },
        { status: 400 },
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: store.stripeCustomerId,
      return_url: `${req.nextUrl.origin}/admin/configuracoes/plano`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    console.error("[stripe/portal]", error);
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
