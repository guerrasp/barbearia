import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limitsFor } from "@/lib/plan-limits";
import { getTrialStatus } from "@/lib/trial";
import { requireUserForStore } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await requireUserForStore(req, id);
  if (!auth.ok) return auth.response;

  const store = await prisma.store.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      plan: true,
      planRenewsAt: true,
      trialEndsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      _count: { select: { barbers: true } },
    },
  });

  if (!store) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });

  const limits = limitsFor(store.plan);
  const trial = getTrialStatus({
    trialEndsAt: store.trialEndsAt,
    stripeSubscriptionId: store.stripeSubscriptionId,
  });

  return NextResponse.json({
    plan: store.plan,
    planRenewsAt: store.planRenewsAt,
    hasSubscription: trial.hasSubscription,
    trial: {
      active: trial.trialActive,
      expired: trial.trialExpired,
      endsAt: trial.trialEndsAt,
      daysLeft: trial.daysLeft,
    },
    canWrite: trial.canWrite,
    usage: { barbers: store._count.barbers },
    limits: {
      maxBarbers: Number.isFinite(limits.maxBarbers) ? limits.maxBarbers : null,
      whatsappReminders: limits.whatsappReminders,
      multiUnit: limits.multiUnit,
      advancedReports: limits.advancedReports,
    },
  });
}
