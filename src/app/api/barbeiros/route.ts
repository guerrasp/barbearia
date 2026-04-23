import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const barberSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  bio: z.string().optional(),
  photo: z.string().optional(),
  specialties: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  userId: z.string().optional().nullable(),
  storeId: z.string(),
});

// GET - lista barbeiros da loja
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const search = searchParams.get("search") || "";
  const onlyActive = searchParams.get("onlyActive") === "true";

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const barbers = await prisma.barber.findMany({
    where: {
      storeId,
      ...(onlyActive && { isActive: true }),
      ...(search && { name: { contains: search, mode: "insensitive" } }),
    },
    include: {
      _count: { select: { appointments: true, workingHours: true, timeBlocks: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(barbers);
}

// POST - cria barbeiro
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = barberSchema.parse(body);

    const barber = await prisma.barber.create({
      data: {
        name: data.name,
        bio: data.bio || null,
        photo: data.photo || null,
        specialties: data.specialties || null,
        commissionRate: data.commissionRate ?? 0,
        isActive: data.isActive ?? true,
        userId: data.userId || null,
        storeId: data.storeId,
      },
    });

    return NextResponse.json(barber, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar barbeiro" }, { status: 500 });
  }
}
