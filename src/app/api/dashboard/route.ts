import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminForStore } from "@/lib/auth-server";

// GET - Dados do dashboard (barbearia)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const auth = await requireAdminForStore(req, storeId);
  if (!auth.ok) return auth.response;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = startOfMonth;

  // 7 dias à frente (agenda)
  const in7 = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    todayAppointments,
    upcomingAppointments,
    monthCompleted,
    lastMonthCompleted,
    totalCustomers,
    activeBarbers,
    activeServices,
    barbersList,
    monthAllAppointments,
    weekAppointments,
  ] = await Promise.all([
    // Agendamentos de hoje
    prisma.appointment.findMany({
      where: {
        storeId,
        startAt: { gte: startOfDay, lt: endOfDay },
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        barber: { select: { name: true } },
        services: { include: { service: { select: { name: true } } } },
      },
      orderBy: { startAt: "asc" },
    }),
    // Próximos 7 dias
    prisma.appointment.findMany({
      where: {
        storeId,
        startAt: { gte: endOfDay, lt: in7 },
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        customer: { select: { name: true } },
        barber: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
      take: 10,
    }),
    // Concluídos este mês
    prisma.appointment.findMany({
      where: {
        storeId,
        status: "COMPLETED",
        startAt: { gte: startOfMonth },
      },
      select: { total: true, paid: true, barberId: true },
    }),
    // Concluídos mês anterior (comparativo)
    prisma.appointment.findMany({
      where: {
        storeId,
        status: "COMPLETED",
        startAt: { gte: startOfLastMonth, lt: endOfLastMonth },
      },
      select: { total: true },
    }),
    // Totais
    prisma.customer.count({ where: { storeId } }),
    prisma.barber.count({ where: { storeId, isActive: true } }),
    prisma.service.count({ where: { storeId, isActive: true } }),
    // Lista de barbeiros ativos (para faturamento por barbeiro)
    prisma.barber.findMany({
      where: { storeId, isActive: true },
      select: { id: true, name: true, commissionRate: true },
      orderBy: { name: "asc" },
    }),
    // Todos os agendamentos do mês (para taxa de ocupação)
    prisma.appointment.count({
      where: {
        storeId,
        startAt: { gte: startOfMonth },
        status: { notIn: ["CANCELLED"] },
      },
    }),
    // Agendamentos dos últimos 7 dias (para horários de pico)
    prisma.appointment.findMany({
      where: {
        storeId,
        startAt: { gte: new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000), lt: endOfDay },
        status: { notIn: ["CANCELLED"] },
      },
      select: { startAt: true },
    }),
  ]);

  // === Faturamento do mês ===
  const monthRevenue = monthCompleted.reduce((s, a) => s + a.total, 0);
  const monthPaidRevenue = monthCompleted
    .filter((a) => a.paid)
    .reduce((s, a) => s + a.total, 0);

  // === Comparativo vs mês anterior ===
  const lastMonthRevenue = lastMonthCompleted.reduce((s, a) => s + a.total, 0);
  const revenueChange = lastMonthRevenue > 0
    ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : monthRevenue > 0 ? 100 : 0;
  const appointmentChange = lastMonthCompleted.length > 0
    ? ((monthCompleted.length - lastMonthCompleted.length) / lastMonthCompleted.length) * 100
    : monthCompleted.length > 0 ? 100 : 0;

  // === Faturamento por barbeiro ===
  const revenueByBarberId = new Map<string, number>();
  for (const a of monthCompleted) {
    revenueByBarberId.set(a.barberId, (revenueByBarberId.get(a.barberId) || 0) + a.total);
  }
  const barberRevenue = barbersList.map((b) => ({
    id: b.id,
    name: b.name,
    revenue: revenueByBarberId.get(b.id) || 0,
    commission: (revenueByBarberId.get(b.id) || 0) * (b.commissionRate / 100),
    commissionRate: b.commissionRate,
  })).sort((a, b) => b.revenue - a.revenue);

  // === Taxa de ocupação (hoje) ===
  // Conta slots disponíveis hoje vs preenchidos
  const todayWorkingHours = await prisma.workingHours.findMany({
    where: {
      barber: { storeId, isActive: true },
      weekday: now.getDay(),
    },
    select: { startTime: true, endTime: true },
  });

  let totalSlots = 0;
  for (const wh of todayWorkingHours) {
    const [sh, sm] = wh.startTime.split(":").map(Number);
    const [eh, em] = wh.endTime.split(":").map(Number);
    totalSlots += Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / 30); // slots de 30min
  }
  const todayOccupancy = totalSlots > 0
    ? Math.round((todayAppointments.length / totalSlots) * 100)
    : 0;
  const monthOccupancyEstimate = activeBarbers > 0
    ? Math.round(monthAllAppointments / (activeBarbers * now.getDate() * 8)) // ~8 slots/dia estimado
    : 0;

  // === Horários de pico (últimos 7 dias) ===
  const hourCounts: Record<number, number> = {};
  for (const a of weekAppointments) {
    const h = new Date(a.startAt).getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  }
  const peakHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: Number(hour), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return NextResponse.json({
    today: {
      count: todayAppointments.length,
      list: todayAppointments,
      occupancy: todayOccupancy,
      totalSlots,
    },
    upcoming: upcomingAppointments,
    month: {
      completedCount: monthCompleted.length,
      revenue: monthRevenue,
      paidRevenue: monthPaidRevenue,
      vsLastMonth: {
        revenueChange: Math.round(revenueChange),
        appointmentChange: Math.round(appointmentChange),
        lastMonthRevenue,
        lastMonthCount: lastMonthCompleted.length,
      },
      occupancyEstimate: Math.min(100, monthOccupancyEstimate),
    },
    totals: {
      customers: totalCustomers,
      barbers: activeBarbers,
      services: activeServices,
    },
    barberRevenue,
    peakHours,
  });
}
