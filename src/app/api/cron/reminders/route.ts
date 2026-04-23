import { prisma } from "@/lib/prisma";
import { sendAppointmentReminder } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";

// GET /api/cron/reminders — envia lembretes para agendamentos ~24h à frente
// Proteção: header "x-cron-secret" OU query ?secret= deve bater com CRON_SECRET.
// Janela: startAt entre (agora+23h) e (agora+25h), status SCHEDULED|CONFIRMED,
// notifiedReminder=false. Idempotente via flag.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }
  const provided =
    req.headers.get("x-cron-secret") ||
    new URL(req.url).searchParams.get("secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Janela ampla para rodar bem com cron diário (plano Hobby da Vercel):
  // pega tudo entre "de agora + 1h" e "de agora + 48h" que ainda não
  // recebeu lembrete. A flag notifiedReminder=false garante idempotência.
  const now = new Date();
  const from = new Date(now.getTime() + 1 * 60 * 60_000);
  const to = new Date(now.getTime() + 48 * 60 * 60_000);

  const due = await prisma.appointment.findMany({
    where: {
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      notifiedReminder: false,
      startAt: { gte: from, lte: to },
    },
    select: { id: true },
  });

  const results: Array<{ id: string; result: unknown; error?: string }> = [];
  for (const ap of due) {
    try {
      const result = await sendAppointmentReminder(ap.id);
      await prisma.appointment.update({
        where: { id: ap.id },
        data: { notifiedReminder: true },
      });
      results.push({ id: ap.id, result });
    } catch (error) {
      results.push({
        id: ap.id,
        result: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    window: { from, to },
    processed: results.length,
    results,
  });
}
