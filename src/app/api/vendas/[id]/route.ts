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
      store: true,
      items: { include: { product: true } },
      payments: true,
      installments: { orderBy: { number: "asc" } },
    },
  });

  if (!sale) {
    return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
  }

  return NextResponse.json(sale);
}

// PATCH - Atualizar status / marcar parcela
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();

    // ---- Marcar parcela como paga ----
    if (body.installmentId && body.action === "payInstallment") {
      const installment = await prisma.installment.update({
        where: { id: body.installmentId },
        data: { status: "PAID", paidAt: new Date() },
      });

      // Se todas as parcelas desta venda estão pagas, marca a venda como PAID
      const allInstallments = await prisma.installment.findMany({ where: { saleId: id } });
      const allPaid = allInstallments.every((inst) => inst.status === "PAID");
      if (allPaid) {
        await prisma.sale.update({ where: { id }, data: { status: "PAID" } });
      }

      return NextResponse.json(installment);
    }

    // ---- Atualizar status da venda ----
    const { status, reason } = body;
    const validStatuses = [
      "PENDING", "PAID", "PREPARING", "DELIVERING", "DELIVERED",
      "CANCELLED", "REFUNDED", "EXCHANGED",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) {
      return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
    }

    // Cancela / Estorna / Troca → devolver estoque
    const statusRevertStock = ["CANCELLED", "REFUNDED", "EXCHANGED"];
    const currentReverted = statusRevertStock.includes(sale.status);
    const nextReverted = statusRevertStock.includes(status);

    if (nextReverted && !currentReverted) {
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
              reason: `${status === "CANCELLED" ? "Cancelamento" : status === "REFUNDED" ? "Estorno" : "Troca"} venda ${sale.code}`,
            },
          });
        }

        await tx.sale.update({
          where: { id },
          data: {
            status,
            cancelledAt: new Date(),
            cancelReason: reason || null,
          },
        });
      });

      return NextResponse.json({ message: `Venda ${status.toLowerCase()} — estoque devolvido` });
    }

    // Update simples de status
    const updated = await prisma.sale.update({
      where: { id },
      data: {
        status,
        ...(nextReverted && { cancelledAt: new Date(), cancelReason: reason || null }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Erro PATCH venda:", err);
    return NextResponse.json({ error: "Erro ao atualizar venda" }, { status: 500 });
  }
}
