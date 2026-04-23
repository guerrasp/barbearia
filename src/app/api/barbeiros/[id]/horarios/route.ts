import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;

const blockSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(hhmm, "Formato HH:mm"),
  endTime: z.string().regex(hhmm, "Formato HH:mm"),
});

const payloadSchema = z.object({
  blocks: z.array(blockSchema),
});

// GET - lista horários do barbeiro (recorrência semanal)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hours = await prisma.workingHours.findMany({
    where: { barberId: id },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(hours);
}

// PUT - substitui toda a agenda recorrente do barbeiro (replace-all)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { blocks } = payloadSchema.parse(body);

    // Valida: endTime > startTime
    for (const b of blocks) {
      if (b.endTime <= b.startTime) {
        return NextResponse.json(
          { error: `Hora final deve ser maior que inicial (dia ${b.weekday})` },
          { status: 400 },
        );
      }
    }

    // Checa se barbeiro existe
    const barber = await prisma.barber.findUnique({ where: { id } });
    if (!barber) {
      return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.workingHours.deleteMany({ where: { barberId: id } }),
      ...(blocks.length > 0
        ? [
            prisma.workingHours.createMany({
              data: blocks.map((b) => ({
                barberId: id,
                weekday: b.weekday,
                startTime: b.startTime,
                endTime: b.endTime,
              })),
            }),
          ]
        : []),
    ]);

    const hours = await prisma.workingHours.findMany({
      where: { barberId: id },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(hours);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao salvar horários" }, { status: 500 });
  }
}
