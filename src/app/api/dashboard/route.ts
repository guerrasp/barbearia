import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET - Dados do dashboard
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");

  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Buscar dados em paralelo
  const [
    monthlySales,
    totalProducts,
    totalCustomers,
    lowStockProducts,
    recentSales,
  ] = await Promise.all([
    // Vendas do mês
    prisma.sale.findMany({
      where: {
        storeId,
        createdAt: { gte: startOfMonth },
        status: { notIn: ["CANCELLED", "REFUNDED", "EXCHANGED"] },
      },
      include: { items: true },
    }),
    // Total de produtos ativos
    prisma.product.count({ where: { storeId, isActive: true } }),
    // Total de clientes
    prisma.customer.count({ where: { storeId } }),
    // Produtos com estoque baixo (stock <= minStock)
    prisma.$queryRaw<{ id: string; name: string; stock: number; min_stock: number }[]>`
      SELECT id, name, stock, min_stock
      FROM products
      WHERE store_id = ${storeId}
        AND is_active = true
        AND stock <= min_stock
      ORDER BY stock ASC
      LIMIT 10
    `,
    // Vendas recentes
    prisma.sale.findMany({
      where: { storeId },
      include: {
        customer: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const revenue = monthlySales.reduce((sum, s) => sum + s.total, 0);
  const totalOrders = monthlySales.length;

  // Normaliza snake_case do raw query para camelCase
  const lowStockMapped = lowStockProducts.map((p) => ({
    id: p.id,
    name: p.name,
    stock: Number(p.stock),
    minStock: Number(p.min_stock),
  }));

  return NextResponse.json({
    revenue,
    totalOrders,
    totalProducts,
    totalCustomers,
    lowStockProducts: lowStockMapped,
    recentSales,
  });
}
