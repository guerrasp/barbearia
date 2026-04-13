import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const movementSchema = z.object({
  productId: z.string(),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.number().int().min(0),
  reason: z.string().optional(),
});

// GET - Listar produtos com estoque
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const filter = searchParams.get("filter"); // "low", "out", "all"

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const where: Record<string, unknown> = { storeId, isActive: true };

  if (filter === "low") {
    where.stock = { gt: 0, lte: prisma.product.fields.minStock };
  } else if (filter === "out") {
    where.stock = 0;
  }

  const products = await prisma.product.findMany({
    where: { storeId, isActive: true },
    select: {
      id: true,
      name: true,
      stock: true,
      minStock: true,
      salePrice: true,
      category: { select: { name: true } },
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { type: true, quantity: true, reason: true, createdAt: true },
      },
    },
    orderBy: { stock: "asc" },
  });

  return NextResponse.json(products);
}

// POST - Registrar movimentação de estoque
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = movementSchema.parse(body);

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    let newStock: number;

    if (data.type === "ADJUST") {
      newStock = data.quantity;
    } else if (data.type === "OUT") {
      newStock = product.stock - data.quantity;
    } else {
      newStock = product.stock + data.quantity;
    }

    if (newStock < 0) {
      return NextResponse.json({ error: "Estoque não pode ficar negativo" }, { status: 400 });
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: data.productId },
        data: { stock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason || null,
        },
      }),
    ]);

    return NextResponse.json({ product: updatedProduct, movement }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao movimentar estoque" }, { status: 500 });
  }
}
