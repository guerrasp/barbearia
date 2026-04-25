import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/public/[slug] — dados públicos da barbearia para o portal
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      email: true,
      address: true,
      logo: true,
      coverImage: true,
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Barbearia não encontrada" }, { status: 404 });
  }

  const [barbers, services] = await Promise.all([
    prisma.barber.findMany({
      where: { storeId: store.id, isActive: true },
      select: {
        id: true,
        name: true,
        bio: true,
        photo: true,
        specialties: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { storeId: store.id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        durationMinutes: true,
        image: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ store, barbers, services });
}
