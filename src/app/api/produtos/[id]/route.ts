import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Buscar produto por ID
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, stockMovements: { orderBy: { createdAt: "desc" }, take: 10 } },
  });

  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  return NextResponse.json(product);
}

// PUT - Atualizar produto
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        barcode: body.barcode,
        costPrice: body.costPrice,
        salePrice: body.salePrice,
        profitMargin: body.profitMargin,
        stock: body.stock,
        minStock: body.minStock,
        categoryId: body.categoryId || null,
      },
    });

    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar produto" }, { status: 500 });
  }
}

// DELETE - Desativar produto (soft delete)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Produto removido" });
  } catch {
    return NextResponse.json({ error: "Erro ao remover produto" }, { status: 500 });
  }
}
