import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireUserForStore } from "@/lib/auth-server";

// GET - Dados do dashboard (barbearia)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const auth = await requireUserForStore(req, storeId);
  if (!auth.ok) return auth.response;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 7 dias à frente (agenda)
  const in7 = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    todayAppointments,
    upcomingAppointments,
    monthCompleted,
    totalCustomers,
    activeBarbers,
    activeServices,
  ] = await Promise.all([
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
    prisma.appointment.findMany({
      where: {
        storeId,
        status: "COMPLETED",
        startAt: { gte: startOfMonth },
      },
      select: { total: true, paid: true },
    }),
    prisma.customer.count({ where: { storeId } }),
    prisma.barber.count({ where: { storeId, isActive: true } }),
    prisma.service.count({ where: { storeId, isActive: true } }),
  ]);

  const monthRevenue = monthCompleted.reduce((s, a) => s + a.total, 0);
  const monthPaidRevenue = monthCompleted
    .filter((a) => a.paid)
    .reduce((s, a) => s + a.total, 0);

  return NextResponse.json({
    today: {
      count: todayAppointments.length,
      list: todayAppointments,
    },
    upcoming: upcomingAppointments,
    month: {
      completedCount: monthCompleted.length,
      revenue: monthRevenue,
      paidRevenue: monthPaidRevenue,
    },
    totals: {
      customers: totalCustomers,
      barbers: activeBarbers,
      services: activeServices,
    },
  });
}
