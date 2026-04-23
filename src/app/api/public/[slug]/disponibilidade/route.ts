import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/scheduling";
import { NextRequest, NextResponse } from "next/server";

// GET /api/public/[slug]/disponibilidade?barberId=&date=YYYY-MM-DD&serviceIds=
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const barberId = searchParams.get("barberId");
  const dateStr = searchParams.get("date");
  const serviceIdsParam = searchParams.get("serviceIds");

  if (!barberId || !dateStr || !serviceIdsParam) {
    return NextResponse.json(
      { error: "barberId, date e serviceIds são obrigatórios" },
      { status: 400 },
    );
  }

  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) {
    return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
  }

  // Garante que o barbeiro pertence à loja
  const barber = await prisma.barber.findFirst({
    where: { id: barberId, storeId: store.id, isActive: true },
    select: { id: true },
  });
  if (!barber) {
    return NextResponse.json({ error: "Barbeiro inválido" }, { status: 400 });
  }

  const ids = serviceIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
  const services = await prisma.service.findMany({
    where: { id: { in: ids }, storeId: store.id, isActive: true },
    select: { durationMinutes: true },
  });
  if (services.length !== ids.length) {
    return NextResponse.json({ error: "Serviços inválidos" }, { status: 400 });
  }
  const durationMinutes = services.reduce((s, sv) => s + sv.durationMinutes, 0);

  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) {
    return NextResponse.json({ error: "date inválida" }, { status: 400 });
  }

  const slots = await getAvailableSlots({
    barberId,
    date: new Date(y, m - 1, d),
    durationMinutes,
    stepMinutes: 15,
  });

  return NextResponse.json({ date: dateStr, durationMinutes, slots });
}
