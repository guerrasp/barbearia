import { getAvailableSlots } from "@/lib/scheduling";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/agendamentos/disponibilidade?barberId=...&date=YYYY-MM-DD&durationMinutes=30&step=15
// Opcionalmente pode-se passar serviceIds="id1,id2,id3" para somar a duração
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const barberId = searchParams.get("barberId");
  const dateStr = searchParams.get("date");
  const durationParam = searchParams.get("durationMinutes");
  const serviceIdsParam = searchParams.get("serviceIds");
  const stepParam = searchParams.get("step");

  if (!barberId || !dateStr) {
    return NextResponse.json(
      { error: "barberId e date (YYYY-MM-DD) são obrigatórios" },
      { status: 400 },
    );
  }

  let durationMinutes = 0;
  if (serviceIdsParam) {
    const ids = serviceIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length) {
      const services = await prisma.service.findMany({
        where: { id: { in: ids } },
        select: { durationMinutes: true },
      });
      durationMinutes = services.reduce((s, sv) => s + sv.durationMinutes, 0);
    }
  }
  if (!durationMinutes && durationParam) {
    durationMinutes = Number(durationParam);
  }
  if (!durationMinutes || durationMinutes <= 0) {
    return NextResponse.json(
      { error: "Informe durationMinutes ou serviceIds válidos" },
      { status: 400 },
    );
  }

  // Interpreta YYYY-MM-DD como data local (sem UTC shift)
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) {
    return NextResponse.json({ error: "date inválida" }, { status: 400 });
  }
  const date = new Date(y, m - 1, d);

  const slots = await getAvailableSlots({
    barberId,
    date,
    durationMinutes,
    stepMinutes: stepParam ? Number(stepParam) : 15,
  });

  return NextResponse.json({ date: dateStr, durationMinutes, slots });
}
