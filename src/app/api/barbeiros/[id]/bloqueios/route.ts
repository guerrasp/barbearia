import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserForStore } from "@/lib/auth-server";

const blockSchema = z.object({
  startAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
  endAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
  reason: z.string().optional(),
});

async function loadBarberStore(id: string) {
  return prisma.barber.findUnique({
    where: { id },
    select: { storeId: true },
  });
}

// GET - lista bloqueios do barbeiro
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ownership = await loadBarberStore(id);
  if (!ownership) {
    return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
  }
  const auth = await requireUserForStore(req, ownership.storeId);
  if (!auth.ok) return auth.response;

  const blocks = await prisma.timeBlock.findMany({
    where: { barberId: id },
    orderBy: { startAt: "desc" },
  });
  return NextResponse.json(blocks);
}

// POST - cria bloqueio
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const ownership = await loadBarberStore(id);
    if (!ownership) {
      return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
    }
    const auth = await requireUserForStore(req, ownership.storeId);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const data = blockSchema.parse(body);

    const start = new Date(data.startAt);
    const end = new Date(data.endAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
    }
    if (end <= start) {
      return NextResponse.json({ error: "Data final deve ser maior que inicial" }, { status: 400 });
    }

    const block = await prisma.timeBlock.create({
      data: {
        barberId: id,
        startAt: start,
        endAt: end,
        reason: data.reason || null,
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar bloqueio" }, { status: 500 });
  }
}
