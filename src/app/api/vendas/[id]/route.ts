import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Buscar venda por ID
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      seller: { select: { name: true } },
      items: { include: { product: true } },
    },
  });

  if (!sale) {
    return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
  }

  return NextResponse.json(sale);
}

// PATCH - Atualizar status da venda
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { status } = body;

    const validStatuses = ["PENDING", "PAID", "PREPARING", "DELIVERING", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    // Se cancelar, devolver o estoque
    if (status === "CANCELLED") {
      const sale = await prisma.sale.findUnique({
        where: { id },
        include: { items: true },
      });

      if (sale && sale.status !== "CANCELLED") {
        await prisma.$transaction(async (tx) => {
          for (const item of sale.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: "IN",
                quantity: item.quantity,
                reason: `Cancelamento venda ${sale.code}`,
              },
            });
          }

          await tx.sale.update({
            where: { id },
            data: { status },
          });
        });

        return NextResponse.json({ message: "Venda cancelada e estoque devolvido" });
      }
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar venda" }, { status: 500 });
  }
}
