import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const blockSchema = z.object({
  startAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
  endAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
  reason: z.string().optional(),
});

// GET - lista bloqueios do barbeiro
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
