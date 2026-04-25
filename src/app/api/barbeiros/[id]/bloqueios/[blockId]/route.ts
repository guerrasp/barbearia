import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { requireUserForStore } from "@/lib/auth-server";

// DELETE - remove bloqueio
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> },
) {
  const { id, blockId } = await params;

  try {
    // garante que o bloqueio pertence ao barbeiro + busca a loja
    const existing = await prisma.timeBlock.findUnique({
      where: { id: blockId },
      include: { barber: { select: { storeId: true } } },
    });
    if (!existing || existing.barberId !== id) {
      return NextResponse.json({ error: "Bloqueio não encontrado" }, { status: 404 });
    }

    const auth = await requireUserForStore(req, existing.barber.storeId);
    if (!auth.ok) return auth.response;

    await prisma.timeBlock.delete({ where: { id: blockId } });
    return NextResponse.json({ message: "Bloqueio removido" });
  } catch {
    return NextResponse.json({ error: "Erro ao remover bloqueio" }, { status: 500 });
  }
}
