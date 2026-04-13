import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  profitMargin: z.number(),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(5),
  categoryId: z.string().optional(),
  storeId: z.string(),
});

// GET - Listar produtos
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const search = searchParams.get("search") || "";

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: {
      storeId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { barcode: { contains: search } },
        ],
      }),
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

// POST - Criar produto
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = productSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        barcode: data.barcode,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        profitMargin: data.profitMargin,
        stock: data.stock,
        minStock: data.minStock,
        storeId: data.storeId,
        categoryId: data.categoryId || null,
      },
    });

    // Registrar movimentação de estoque inicial
    if (data.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: data.stock,
          reason: "Estoque inicial",
        },
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao criar produto" }, { status: 500 });
  }
}
