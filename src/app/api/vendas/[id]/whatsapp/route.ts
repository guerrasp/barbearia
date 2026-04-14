import { prisma } from "@/lib/prisma";
import { buildReceiptText } from "@/lib/receipt/template";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      seller: { select: { name: true } },
      store: true,
      items: { include: { product: true } },
    },
  });

  if (!sale) {
    return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ text: buildReceiptText(sale, sale.store) });
}
