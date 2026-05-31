import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminForStore, requireUserForStore } from "@/lib/auth-server";

const planSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  description: z.string().optional(),
  priceInCents: z.coerce.number().int().positive("Preço obrigatório"),
  maxUsesPerMonth: z.coerce.number().int().positive().optional().nullable(),
  serviceIds: z.array(z.string().min(1)).min(1, "Selecione ao menos 1 serviço"),
  storeId: z.string().min(1),
});

// GET - Listar planos de assinatura da loja
export async function GET(req: NextRequest) {
  const storeId = new URL(req.url).searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const auth = await requireUserForStore(req, storeId);
  if (!auth.ok) return auth.response;

  const plans = await prisma.subscriptionPlan.findMany({
    where: { storeId },
    include: {
      services: { include: { service: { select: { id: true, name: true } } } },
      _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(plans);
}

// POST - Criar plano de assinatura
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = planSchema.parse(body);

    const auth = await requireAdminForStore(req, data.storeId);
    if (!auth.ok) return auth.response;

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        description: data.description || null,
        priceInCents: data.priceInCents,
        maxUsesPerMonth: data.maxUsesPerMonth ?? null,
        storeId: data.storeId,
        services: {
          create: data.serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: {
        services: { include: { service: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar plano:", error);
    return NextResponse.json({ error: "Erro ao criar plano" }, { status: 500 });
  }
}
