import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - buscar serviço por ID
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const service = await prisma.service.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  return NextResponse.json(service);
}

// PUT - atualizar serviço
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    // Partial update: só atualiza campos presentes no body.
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description || null;
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.durationMinutes !== undefined) data.durationMinutes = Number(body.durationMinutes);
    if (body.image !== undefined) data.image = body.image || null;
    if ("categoryId" in body) data.categoryId = body.categoryId || null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const service = await prisma.service.update({
      where: { id },
      data,
      include: { category: true },
    });

    return NextResponse.json(service);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar serviço" }, { status: 500 });
  }
}

// DELETE - remover serviço (soft delete: marca como inativo se tiver histórico de agendamentos)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const linked = await prisma.appointmentService.count({ where: { serviceId: id } });
    if (linked > 0) {
      // soft delete: mantém histórico
      const service = await prisma.service.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        message: "Serviço inativado (existe histórico de agendamentos).",
        service,
      });
    }

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ message: "Serviço removido" });
  } catch {
    return NextResponse.json({ error: "Erro ao remover serviço" }, { status: 500 });
  }
}
