import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminForStore } from "@/lib/auth-server";

// PUT - Atualizar plano
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      select: { storeId: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    const auth = await requireAdminForStore(req, plan.storeId);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.priceInCents !== undefined) data.priceInCents = Number(body.priceInCents);
    if (body.maxUsesPerMonth !== undefined) data.maxUsesPerMonth = body.maxUsesPerMonth ?? null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    // Atualiza serviços se informados
    if (Array.isArray(body.serviceIds)) {
      await prisma.subscriptionPlanService.deleteMany({ where: { planId: id } });
      await prisma.subscriptionPlanService.createMany({
        data: body.serviceIds.map((serviceId: string) => ({ planId: id, serviceId })),
      });
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data,
      include: {
        services: { include: { service: { select: { id: true, name: true } } } },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar plano" }, { status: 500 });
  }
}

// DELETE - Desativar plano (soft delete se tem assinantes)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      select: { storeId: true, _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } } },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
    }

    const auth = await requireAdminForStore(req, plan.storeId);
    if (!auth.ok) return auth.response;

    if (plan._count.subscriptions > 0) {
      await prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ message: "Plano desativado (existem assinantes ativos)." });
    }

    await prisma.subscriptionPlan.delete({ where: { id } });
    return NextResponse.json({ message: "Plano removido." });
  } catch {
    return NextResponse.json({ error: "Erro ao remover plano" }, { status: 500 });
  }
}
