import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// DELETE - remove bloqueio
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> },
) {
  const { id, blockId } = await params;

  try {
    // garante que o bloqueio pertence ao barbeiro
    const existing = await prisma.timeBlock.findUnique({ where: { id: blockId } });
    if (!existing || existing.barberId !== id) {
      return NextResponse.json({ error: "Bloqueio não encontrado" }, { status: 404 });
    }

    await prisma.timeBlock.delete({ where: { id: blockId } });
    return NextResponse.json({ message: "Bloqueio removido" });
  } catch {
    return NextResponse.json({ error: "Erro ao remover bloqueio" }, { status: 500 });
  }
}
