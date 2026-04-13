import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const saleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

const saleSchema = z.object({
  code: z.string(),
  customerId: z.string(),
  sellerId: z.string(),
  storeId: z.string(),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "INSTALLMENT"]),
  installmentDueDate: z.string().optional(),
  notes: z.string().optional(),
  deliveryAddress: z.string().optional(),
  items: z.array(saleItemSchema).min(1),
});

// GET - Listar vendas
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const customerId = searchParams.get("customerId");
  const search = searchParams.get("search") || "";

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const sales = await prisma.sale.findMany({
    where: {
      storeId,
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { customer: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    },
    include: {
      customer: { select: { name: true, phone: true, email: true } },
      seller: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sales);
}

// POST - Registrar venda
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = saleSchema.parse(body);

    // Criar a venda com os itens em uma transação
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Criar a venda
      const newSale = await tx.sale.create({
        data: {
          code: data.code,
          customerId: data.customerId,
          sellerId: data.sellerId,
          storeId: data.storeId,
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          paymentMethod: data.paymentMethod,
          status: data.paymentMethod === "INSTALLMENT" ? "PENDING" : "PAID",
          installmentDueDate: data.installmentDueDate ? new Date(data.installmentDueDate) : null,
          notes: data.notes || null,
          deliveryAddress: data.deliveryAddress || null,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      // 2. Baixar estoque e registrar movimentações
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "OUT",
            quantity: item.quantity,
            reason: `Venda ${data.code}`,
          },
        });
      }

      return newSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar venda:", error);
    return NextResponse.json({ error: "Erro ao registrar venda" }, { status: 500 });
  }
}
