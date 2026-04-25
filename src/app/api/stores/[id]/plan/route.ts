import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limitsFor } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const store = await prisma.store.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      plan: true,
      planRenewsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      _count: { select: { barbers: true } },
    },
  });

  if (!store) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });

  const limits = limitsFor(store.plan);

  return NextResponse.json({
    plan: store.plan,
    planRenewsAt: store.planRenewsAt,
    hasSubscription: Boolean(store.stripeSubscriptionId),
    usage: { barbers: store._count.barbers },
    limits: {
      maxBarbers: Number.isFinite(limits.maxBarbers) ? limits.maxBarbers : null,
      smsReminders: limits.smsReminders,
      multiUnit: limits.multiUnit,
      advancedReports: limits.advancedReports,
    },
  });
}
