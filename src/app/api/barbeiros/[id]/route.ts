import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - barbeiro por ID com horários e bloqueios
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const barber = await prisma.barber.findUnique({
    where: { id },
    include: {
      workingHours: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      timeBlocks: { orderBy: { startAt: "desc" } },
      _count: { select: { appointments: true } },
    },
  });

  if (!barber) {
    return NextResponse.json({ error: "Barbeiro não encontrado" }, { status: 404 });
  }

  return NextResponse.json(barber);
}

// PUT - atualização parcial
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.bio !== undefined) data.bio = body.bio || null;
    if (body.photo !== undefined) data.photo = body.photo || null;
    if (body.specialties !== undefined) data.specialties = body.specialties || null;
    if (body.commissionRate !== undefined) data.commissionRate = Number(body.commissionRate);
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if ("userId" in body) data.userId = body.userId || null;

    const barber = await prisma.barber.update({ where: { id }, data });
    return NextResponse.json(barber);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar barbeiro" }, { status: 500 });
  }
}

// DELETE - soft delete se houver agendamentos, hard se não
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const linked = await prisma.appointment.count({ where: { barberId: id } });
    if (linked > 0) {
      const barber = await prisma.barber.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: "Barbeiro inativado (existe histórico de agendamentos).",
        barber,
      });
    }

    await prisma.barber.delete({ where: { id } });
    return NextResponse.json({ message: "Barbeiro removido" });
  } catch {
    return NextResponse.json({ error: "Erro ao remover barbeiro" }, { status: 500 });
  }
}
