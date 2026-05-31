import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminForStore } from "@/lib/auth-server";

/** Carrega cliente + storeId pra autorizar. Retorna null se 404. */
async function loadCustomerStore(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    select: { storeId: true },
  });
}

// GET - Buscar cliente por ID com resumo inteligente
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ownership = await loadCustomerStore(id);
  if (!ownership) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  const auth = await requireAdminForStore(req, ownership.storeId);
  if (!auth.ok) return auth.response;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { startAt: "desc" },
        include: {
          barber: { select: { id: true, name: true } },
          services: { include: { service: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  // === Resumo inteligente ===
  const completed = customer.appointments.filter((a) => a.status === "COMPLETED");
  const totalSpent = completed.reduce((s, a) => s + a.total, 0);
  const totalVisits = completed.length;

  // Frequência média (dias entre visitas)
  let avgFrequencyDays: number | null = null;
  if (completed.length >= 2) {
    const dates = completed.map((a) => new Date(a.startAt).getTime()).sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / (24 * 60 * 60_000));
    }
    avgFrequencyDays = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
  }

  // Barbeiro preferido
  const barberCounts: Record<string, { name: string; count: number }> = {};
  for (const a of completed) {
    const key = a.barber.id;
    if (!barberCounts[key]) barberCounts[key] = { name: a.barber.name, count: 0 };
    barberCounts[key].count++;
  }
  const favoriteBarber = Object.values(barberCounts).sort((a, b) => b.count - a.count)[0] || null;

  // Serviço mais pedido
  const serviceCounts: Record<string, { name: string; count: number }> = {};
  for (const a of completed) {
    for (const s of a.services) {
      const key = s.service.id;
      if (!serviceCounts[key]) serviceCounts[key] = { name: s.service.name, count: 0 };
      serviceCounts[key].count++;
    }
  }
  const favoriteService = Object.values(serviceCounts).sort((a, b) => b.count - a.count)[0] || null;

  // Último e primeiro atendimento
  const firstVisit = completed.length > 0 ? completed[completed.length - 1].startAt : null;
  const lastVisit = completed.length > 0 ? completed[0].startAt : null;

  // Dias desde última visita
  const daysSinceLastVisit = lastVisit
    ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / (24 * 60 * 60_000))
    : null;

  // Status do cliente
  let clientStatus: "active" | "at_risk" | "inactive" | "new" = "new";
  if (totalVisits === 0) clientStatus = "new";
  else if (daysSinceLastVisit !== null && daysSinceLastVisit <= 30) clientStatus = "active";
  else if (daysSinceLastVisit !== null && daysSinceLastVisit <= 60) clientStatus = "at_risk";
  else clientStatus = "inactive";

  // Ticket médio
  const avgTicket = totalVisits > 0 ? totalSpent / totalVisits : 0;

  // No-shows
  const noShows = customer.appointments.filter((a) => a.status === "NO_SHOW").length;
  const cancellations = customer.appointments.filter((a) => a.status === "CANCELLED").length;

  return NextResponse.json({
    ...customer,
    insights: {
      totalSpent,
      totalVisits,
      avgTicket,
      avgFrequencyDays,
      favoriteBarber,
      favoriteService,
      firstVisit,
      lastVisit,
      daysSinceLastVisit,
      clientStatus,
      noShows,
      cancellations,
    },
  });
}

// PUT - Atualizar cliente
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const ownership = await loadCustomerStore(id);
    if (!ownership) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }
    const auth = await requireAdminForStore(req, ownership.storeId);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        cpf: body.cpf || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zipCode: body.zipCode || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      },
    });

    return NextResponse.json(customer);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 });
  }
}

// DELETE - Remover cliente
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const ownership = await loadCustomerStore(id);
    if (!ownership) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }
    const auth = await requireAdminForStore(req, ownership.storeId);
    if (!auth.ok) return auth.response;

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ message: "Cliente removido" });
  } catch {
    return NextResponse.json({ error: "Erro ao remover cliente" }, { status: 500 });
  }
}
