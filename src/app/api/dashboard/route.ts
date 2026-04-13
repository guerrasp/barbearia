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
        status: { not: "CANCELLED" },
      },
      include: { items: true },
    }),
    // Total de produtos ativos
    prisma.product.count({ where: { storeId, isActive: true } }),
    // Total de clientes
    prisma.customer.count({ where: { storeId } }),
    // Produtos com estoque baixo
    prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
        OR: [
          { stock: 0 },
          { stock: { lte: 5 } }, // usando valor fixo; idealmente comparar com minStock
        ],
      },
      select: { id: true, name: true, stock: true, minStock: true },
      orderBy: { stock: "asc" },
      take: 10,
    }),
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

  return NextResponse.json({
    revenue,
    totalOrders,
    totalProducts,
    totalCustomers,
    lowStockProducts,
    recentSales,
  });
}
