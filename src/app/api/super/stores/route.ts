import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Validação real via JWT do Supabase + checa flag isSuperAdmin no DB
  const auth = await getAuthUser(req);
  if (!auth.ok) return auth.response;
  if (!auth.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          barbers: true,
          services: true,
          customers: true,
          appointments: true,
        },
      },
    },
  });

  const totals = stores.reduce(
    (acc, s) => ({
      stores: acc.stores + 1,
      barbers: acc.barbers + s._count.barbers,
      customers: acc.customers + s._count.customers,
      appointments: acc.appointments + s._count.appointments,
    }),
    { stores: 0, barbers: 0, customers: 0, appointments: 0 },
  );

  return NextResponse.json({ stores, totals });
}
