"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, ShoppingCart, Users, Package, AlertTriangle } from "lucide-react";

interface DashboardData {
  revenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockProducts: { id: string; name: string; stock: number; minStock: number }[];
  recentSales: {
    id: string;
    code: string;
    total: number;
    status: string;
    createdAt: string;
    customer: { name: string };
  }[];
}

const statusColor: Record<string, string> = {
  DELIVERED: "text-emerald-600 bg-emerald-50",
  DELIVERING: "text-blue-600 bg-blue-50",
  PREPARING: "text-amber-600 bg-amber-50",
  PAID: "text-emerald-600 bg-emerald-50",
  PENDING: "text-gray-600 bg-gray-50",
  CANCELLED: "text-red-600 bg-red-50",
};

const statusLabel: Record<string, string> = {
  PENDING: "Pendente", PAID: "Pago", PREPARING: "Preparando",
  DELIVERING: "Em Rota", DELIVERED: "Entregue", CANCELLED: "Cancelado",
};

export default function AdminDashboard() {
  const { store } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!store) return;
    try {
      const result = await api.get<DashboardData>(`/dashboard?storeId=${store.id}`);
      setData(result);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const stats = [
    { label: "Vendas do Mês", value: formatCurrency(data?.revenue || 0), icon: DollarSign, color: "bg-emerald-500" },
    { label: "Pedidos", value: String(data?.totalOrders || 0), icon: ShoppingCart, color: "bg-blue-500" },
    { label: "Clientes", value: String(data?.totalCustomers || 0), icon: Users, color: "bg-purple-500" },
    { label: "Produtos", value: String(data?.totalProducts || 0), icon: Package, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
            <div className={`${stat.color} p-3 rounded-lg text-white`}><stat.icon className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-muted">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Vendas Recentes" className="lg:col-span-2">
          {data?.recentSales && data.recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-muted border-b border-border"><th className="pb-3 font-medium">Código</th><th className="pb-3 font-medium">Cliente</th><th className="pb-3 font-medium">Total</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Data</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {data.recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-background/50">
                      <td className="py-3 font-mono text-xs font-medium">{sale.code}</td>
                      <td className="py-3">{sale.customer.name}</td>
                      <td className="py-3 font-medium">{formatCurrency(sale.total)}</td>
                      <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[sale.status] || ""}`}>{statusLabel[sale.status]}</span></td>
                      <td className="py-3 text-muted">{new Date(sale.createdAt).toLocaleDateString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted py-8">Nenhuma venda ainda. Registre sua primeira venda!</p>
          )}
        </Card>

        <Card title="Estoque Baixo">
          {data?.lowStockProducts && data.lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {data.lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-background">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-4 h-4 ${product.stock === 0 ? "text-danger" : "text-warning"}`} />
                    <div>
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted">Mín: {product.minStock} un.</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${product.stock === 0 ? "text-danger" : "text-warning"}`}>{product.stock} un.</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted py-8">Todos os produtos com estoque normal!</p>
          )}
        </Card>
      </div>
    </div>
  );
}
