import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminForStore } from "@/lib/auth-server";

// PATCH - Atualizar assinatura (cancelar, pausar, registrar uso)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const sub = await prisma.customerSubscription.findUnique({
      where: { id },
      select: { storeId: true, status: true, usesThisPeriod: true, plan: { select: { maxUsesPerMonth: true } } },
    });
    if (!sub) {
      return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });
    }

    const auth = await requireAdminForStore(req, sub.storeId);
    if (!auth.ok) return auth.response;

    const body = await req.json();

    // Cancelar
    if (body.action === "cancel") {
      const updated = await prisma.customerSubscription.update({
        where: { id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      return NextResponse.json(updated);
    }

    // Pausar
    if (body.action === "pause") {
      const updated = await prisma.customerSubscription.update({
        where: { id },
        data: { status: "PAUSED" },
      });
      return NextResponse.json(updated);
    }

    // Reativar
    if (body.action === "reactivate") {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);
      const updated = await prisma.customerSubscription.update({
        where: { id },
        data: {
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          usesThisPeriod: 0,
          cancelledAt: null,
        },
      });
      return NextResponse.json(updated);
    }

    // Registrar uso (quando um agendamento é coberto pelo plano)
    if (body.action === "use") {
      if (sub.status !== "ACTIVE") {
        return NextResponse.json({ error: "Assinatura não está ativa" }, { status: 400 });
      }
      if (sub.plan.maxUsesPerMonth !== null && sub.usesThisPeriod >= sub.plan.maxUsesPerMonth) {
        return NextResponse.json({ error: "Limite de usos do período atingido" }, { status: 400 });
      }
      const updated = await prisma.customerSubscription.update({
        where: { id },
        data: { usesThisPeriod: { increment: 1 } },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar assinatura" }, { status: 500 });
  }
}
