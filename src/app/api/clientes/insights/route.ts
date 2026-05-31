import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminForStore } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// GET /api/clientes/insights?storeId=&type=inactive|birthdays
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const type = searchParams.get("type") || "inactive";

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const auth = await requireAdminForStore(req, storeId);
  if (!auth.ok) return auth.response;

  if (type === "birthdays") {
    return handleBirthdays(storeId);
  }

  return handleInactive(storeId);
}

async function handleInactive(storeId: string) {
  const now = new Date();
  const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const days60 = new Date(now.getTime() - 60 * 24 * 60 * 60_000);
  const days90 = new Date(now.getTime() - 90 * 24 * 60 * 60_000);

  // Busca todos os clientes com seu último agendamento concluído
  const customers = await prisma.customer.findMany({
    where: { storeId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      appointments: {
        where: { status: { in: ["COMPLETED", "CONFIRMED", "SCHEDULED"] } },
        orderBy: { startAt: "desc" },
        take: 1,
        select: { startAt: true, status: true },
      },
      _count: { select: { appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  const inactive = customers
    .map((c) => {
      const lastVisit = c.appointments[0]?.startAt ?? null;
      if (!lastVisit) return null; // nunca veio — não conta como inativo
      const lastDate = new Date(lastVisit);
      if (lastDate >= days30) return null; // veio nos últimos 30 dias — ativo

      let tier: "30" | "60" | "90" = "30";
      if (lastDate < days90) tier = "90";
      else if (lastDate < days60) tier = "60";

      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60_000));

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        lastVisit: lastDate.toISOString(),
        daysSince,
        tier,
        totalAppointments: c._count.appointments,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.daysSince - a!.daysSince);

  return NextResponse.json({
    total: inactive.length,
    tiers: {
      "30": inactive.filter((c) => c!.tier === "30").length,
      "60": inactive.filter((c) => c!.tier === "60").length,
      "90": inactive.filter((c) => c!.tier === "90").length,
    },
    customers: inactive,
  });
}

async function handleBirthdays(storeId: string) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  // Busca clientes com birthDate definido
  const customers = await prisma.customer.findMany({
    where: {
      storeId,
      birthDate: { not: null },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      birthDate: true,
      _count: { select: { appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  const thisMonth: typeof result = [];
  const nextMonthList: typeof result = [];
  type BirthdayCustomer = {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    birthDate: string;
    day: number;
    age: number | null;
    totalAppointments: number;
  };
  const result: BirthdayCustomer[] = [];

  for (const c of customers) {
    if (!c.birthDate) continue;
    const bd = new Date(c.birthDate);
    const bdMonth = bd.getMonth() + 1;
    const bdDay = bd.getDate();
    const age = now.getFullYear() - bd.getFullYear();

    const item: BirthdayCustomer = {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      birthDate: bd.toISOString(),
      day: bdDay,
      age: age > 0 && age < 120 ? age : null,
      totalAppointments: c._count.appointments,
    };

    if (bdMonth === currentMonth) thisMonth.push(item);
    else if (bdMonth === nextMonth) nextMonthList.push(item);
  }

  // Ordena por dia do mês
  thisMonth.sort((a, b) => a.day - b.day);
  nextMonthList.sort((a, b) => a.day - b.day);

  return NextResponse.json({
    currentMonth: {
      month: currentMonth,
      count: thisMonth.length,
      customers: thisMonth,
    },
    nextMonth: {
      month: nextMonth,
      count: nextMonthList.length,
      customers: nextMonthList,
    },
  });
}
