import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const paymentSchema = z.object({
  method: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "INSTALLMENT"]),
  amount: z.number().min(0.01),
  installments: z.number().int().min(1).max(12).optional(),
  // Crediário
  dueDate: z.string().optional(),
  numInstallments: z.number().int().min(1).max(12).optional(),
});

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
  // Retrocompatibilidade: se vier paymentMethod único (sem split)
  paymentMethod: z.enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "INSTALLMENT"]).optional(),
  payments: z.array(paymentSchema).optional(),
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
      payments: true,
      installments: { orderBy: { number: "asc" } },
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

    // Normaliza pagamentos
    let payments = data.payments || [];
    if (payments.length === 0 && data.paymentMethod) {
      // Retrocompatibilidade: campo único
      payments = [{ method: data.paymentMethod, amount: data.total }];
    }

    if (payments.length === 0) {
      return NextResponse.json({ error: "Informe pelo menos uma forma de pagamento" }, { status: 400 });
    }

    // Método principal = maior valor
    const primaryPayment = payments.reduce((a, b) => (a.amount >= b.amount ? a : b));
    const hasInstallment = payments.some((p) => p.method === "INSTALLMENT");

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
          paymentMethod: primaryPayment.method,
          status: hasInstallment ? "PENDING" : "PAID",
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

      // 2. Criar registros de pagamento
      for (const p of payments) {
        await tx.payment.create({
          data: {
            saleId: newSale.id,
            method: p.method,
            amount: p.amount,
            installments: p.method === "CREDIT_CARD" ? (p.installments || 1) : null,
          },
        });
      }

      // 3. Gerar parcelas do crediário
      for (const p of payments) {
        if (p.method === "INSTALLMENT" && p.dueDate && p.numInstallments) {
          const n = p.numInstallments;
          const parcelAmount = Math.round((p.amount / n) * 100) / 100;
          const baseDate = new Date(p.dueDate);
          for (let i = 0; i < n; i++) {
            const dueDate = new Date(baseDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            // Ajusta último centavo pra bater
            const amount = i === n - 1 ? p.amount - parcelAmount * (n - 1) : parcelAmount;
            await tx.installment.create({
              data: {
                saleId: newSale.id,
                number: i + 1,
                amount,
                dueDate,
              },
            });
          }
        }
      }

      // 4. Baixar estoque
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
