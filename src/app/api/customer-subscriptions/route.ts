import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminForStore, requireUserForStore } from "@/lib/auth-server";

const subscribeSchema = z.object({
  customerId: z.string().min(1),
  planId: z.string().min(1),
  storeId: z.string().min(1),
});

// GET - Listar assinaturas da loja (com filtros)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const status = searchParams.get("status") || undefined;
  const customerId = searchParams.get("customerId") || undefined;

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const auth = await requireUserForStore(req, storeId);
  if (!auth.ok) return auth.response;

  const where: Record<string, unknown> = { storeId };
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const subscriptions = await prisma.customerSubscription.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      plan: { select: { id: true, name: true, priceInCents: true, maxUsesPerMonth: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(subscriptions);
}

// POST - Criar assinatura manual (admin inscreve cliente)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = subscribeSchema.parse(body);

    const auth = await requireAdminForStore(req, data.storeId);
    if (!auth.ok) return auth.response;

    // Verifica se o plano existe e pertence à loja
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: data.planId, storeId: data.storeId, isActive: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado ou inativo" }, { status: 404 });
    }

    // Verifica se o cliente pertence à loja
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, storeId: data.storeId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    // Verifica se já tem assinatura ativa no mesmo plano
    const existing = await prisma.customerSubscription.findFirst({
      where: {
        customerId: data.customerId,
        planId: data.planId,
        status: "ACTIVE",
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Cliente já possui esta assinatura ativa" }, { status: 409 });
    }

    // Período: hoje até 30 dias
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const subscription = await prisma.customerSubscription.create({
      data: {
        customerId: data.customerId,
        planId: data.planId,
        storeId: data.storeId,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        usesThisPeriod: 0,
      },
      include: {
        customer: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true, priceInCents: true } },
      },
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar assinatura:", error);
    return NextResponse.json({ error: "Erro ao criar assinatura" }, { status: 500 });
  }
}
