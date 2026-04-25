import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTrialStatus } from "@/lib/trial";

/**
 * Verifica se a loja pode realizar operações de escrita (trial ativo
 * ou assinatura paga). Retorna `null` quando OK, ou uma `NextResponse`
 * de erro 402 quando o trial expirou e ainda não há assinatura.
 *
 * Uso:
 * ```ts
 * const blocked = await assertStoreCanWrite(storeId);
 * if (blocked) return blocked;
 * ```
 */
export async function assertStoreCanWrite(
  storeId: string,
): Promise<NextResponse | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { trialEndsAt: true, stripeSubscriptionId: true },
  });

  if (!store) {
    return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
  }

  const trial = getTrialStatus({
    trialEndsAt: store.trialEndsAt,
    stripeSubscriptionId: store.stripeSubscriptionId,
  });

  if (!trial.canWrite) {
    return NextResponse.json(
      {
        error:
          "Seu período de avaliação acabou. Escolha um plano para continuar usando o Korta.",
        code: "TRIAL_EXPIRED",
      },
      { status: 402 },
    );
  }

  return null;
}
