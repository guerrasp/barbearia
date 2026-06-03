import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminForStore } from "@/lib/auth-server";
import { limitsFor } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// GET /api/reports?storeId=&from=YYYY-MM-DD&to=YYYY-MM-DD
// Relatórios avançados (Business / Korta IA): agregações de faturamento por
// período, barbeiro, serviço e dia + linhas para exportar CSV.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  if (!storeId || !fromStr || !toStr) {
    return NextResponse.json({ error: "storeId, from e to são obrigatórios" }, { status: 400 });
  }

  const auth = await requireAdminForStore(req, storeId);
  if (!auth.ok) return auth.response;

  // Gate por plano
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { plan: true },
  });
  if (!store) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
  if (!limitsFor(store.plan).advancedReports) {
    return NextResponse.json(
      { error: "Relatórios avançados estão disponíveis nos planos Business e Korta IA.", code: "PLAN_REQUIRED" },
      { status: 403 },
    );
  }

  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);
  if (!fy || !ty) {
    return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
  }
  const from = new Date(fy, fm - 1, fd, 0, 0, 0, 0);
  const to = new Date(ty, tm - 1, td, 23, 59, 59, 999);

  const appts = await prisma.appointment.findMany({
    where: { storeId, startAt: { gte: from, lte: to } },
    include: {
      barber: { select: { id: true, name: true } },
      customer: { select: { name: true } },
      services: { include: { service: { select: { id: true, name: true } } } },
    },
    orderBy: { startAt: "asc" },
  });

  const completed = appts.filter((a) => a.status === "COMPLETED");
  const revenue = completed.reduce((s, a) => s + a.total, 0);
  const paidRevenue = completed.filter((a) => a.paid).reduce((s, a) => s + a.total, 0);
  const count = completed.length;
  const avgTicket = count ? revenue / count : 0;
  const noShows = appts.filter((a) => a.status === "NO_SHOW").length;
  const cancellations = appts.filter((a) => a.status === "CANCELLED").length;
  const totalAppointments = appts.length;
  const noShowRate = totalAppointments ? Math.round((noShows / totalAppointments) * 100) : 0;

  // Por barbeiro (faturamento de concluídos)
  const barberMap = new Map<string, { id: string; name: string; revenue: number; count: number }>();
  for (const a of completed) {
    const e = barberMap.get(a.barber.id) || { id: a.barber.id, name: a.barber.name, revenue: 0, count: 0 };
    e.revenue += a.total;
    e.count++;
    barberMap.set(a.barber.id, e);
  }
  const byBarber = [...barberMap.values()].sort((a, b) => b.revenue - a.revenue);

  // Por serviço (preço congelado em appointment_services)
  const serviceMap = new Map<string, { id: string; name: string; revenue: number; count: number }>();
  for (const a of completed) {
    for (const s of a.services) {
      const e = serviceMap.get(s.service.id) || { id: s.service.id, name: s.service.name, revenue: 0, count: 0 };
      e.revenue += s.price;
      e.count++;
      serviceMap.set(s.service.id, e);
    }
  }
  const byService = [...serviceMap.values()].sort((a, b) => b.revenue - a.revenue);

  // Por dia
  const dayMap = new Map<string, number>();
  for (const a of completed) {
    const d = new Date(a.startAt);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    dayMap.set(key, (dayMap.get(key) || 0) + a.total);
  }
  const byDay = [...dayMap.entries()]
    .map(([date, rev]) => ({ date, revenue: rev }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Linhas para CSV (todos os agendamentos do período)
  const rows = appts.map((a) => ({
    codigo: a.code,
    data: new Date(a.startAt).toLocaleString("pt-BR"),
    cliente: a.customer.name,
    barbeiro: a.barber.name,
    servicos: a.services.map((s) => s.service.name).join("; "),
    status: a.status,
    total: a.total,
    pago: a.paid ? "Sim" : "Não",
  }));

  return NextResponse.json({
    period: { from: fromStr, to: toStr },
    summary: { revenue, paidRevenue, count, avgTicket, noShows, cancellations, noShowRate, totalAppointments },
    byBarber,
    byService,
    byDay,
    rows,
  });
}
