"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, DollarSign, ShoppingCart, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Sale {
  id: string;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  customer: { name: string };
  items: { quantity: number; total: number; product: { name: string } }[];
}

const paymentLabels: Record<string, string> = {
  CASH: "Dinheiro", PIX: "PIX", CREDIT_CARD: "Cartão Crédito",
  DEBIT_CARD: "Cartão Débito", INSTALLMENT: "Fiado",
};

export default function RelatoriosPage() {
  const { store } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    if (!store) return;
    try {
      const data = await api.get<Sale[]>(`/vendas?storeId=${store.id}`);
      setSales(data);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const report = useMemo(() => {
    const now = new Date();
    const monthSales = sales.filter((s) => {
      const d = new Date(s.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        && s.status !== "CANCELLED";
    });

    const revenue = monthSales.reduce((sum, s) => sum + s.total, 0);
    const avgTicket = monthSales.length > 0 ? revenue / monthSales.length : 0;

    // Top produtos
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    monthSales.forEach((s) => s.items.forEach((i) => {
      const key = i.product.name;
      const cur = productMap.get(key) || { name: key, qty: 0, revenue: 0 };
      cur.qty += i.quantity;
      cur.revenue += i.total;
      productMap.set(key, cur);
    }));
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Top clientes
    const customerMap = new Map<string, { name: string; purchases: number; total: number }>();
    monthSales.forEach((s) => {
      const key = s.customer.name;
      const cur = customerMap.get(key) || { name: key, purchases: 0, total: 0 };
      cur.purchases += 1;
      cur.total += s.total;
      customerMap.set(key, cur);
    });
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.total - a.total).slice(0, 5);

    // Pagamentos
    const paymentMap = new Map<string, { count: number; total: number }>();
    monthSales.forEach((s) => {
      const cur = paymentMap.get(s.paymentMethod) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += s.total;
      paymentMap.set(s.paymentMethod, cur);
    });
    const paymentBreakdown = Array.from(paymentMap.entries()).map(([method, v]) => ({
      method: paymentLabels[method] || method,
      count: v.count,
      total: v.total,
      pct: revenue > 0 ? (v.total / revenue) * 100 : 0,
    })).sort((a, b) => b.total - a.total);

    // Fiado pendente
    const pendingInstallments = sales
      .filter((s) => s.paymentMethod === "INSTALLMENT" && s.status === "PENDING")
      .reduce((sum, s) => sum + s.total, 0);

    return { revenue, avgTicket, totalSales: monthSales.length, topProducts, topCustomers, paymentBreakdown, pendingInstallments };
  }, [sales]);

  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted text-sm mt-1 capitalize">Resumo mensal — {monthName}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Calendar className="w-4 h-4" />
          <span className="capitalize">{monthName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted">Faturamento</p>
              <p className="text-xl font-bold">{formatCurrency(report.revenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><ShoppingCart className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted">Total de Vendas</p>
              <p className="text-xl font-bold">{report.totalSales}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-muted">Ticket Médio</p>
              <p className="text-xl font-bold">{formatCurrency(report.avgTicket)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Produtos Mais Vendidos">
          {report.topProducts.length === 0 ? (
            <p className="text-center text-muted py-6">Sem vendas no mês.</p>
          ) : (
            <div className="space-y-3">
              {report.topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted">{p.qty} unidades vendidas</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Melhores Clientes">
          {report.topCustomers.length === 0 ? (
            <p className="text-center text-muted py-6">Sem clientes no mês.</p>
          ) : (
            <div className="space-y-3">
              {report.topCustomers.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted">{c.purchases} {c.purchases === 1 ? "compra" : "compras"}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Formas de Pagamento">
          {report.paymentBreakdown.length === 0 ? (
            <p className="text-center text-muted py-6">Sem vendas no mês.</p>
          ) : (
            <div className="space-y-3">
              {report.paymentBreakdown.map((p, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{p.method}</span>
                    <span className="font-medium">{formatCurrency(p.total)} ({p.pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Crediário / Fiado">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">Valor pendente de recebimento:</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(report.pendingInstallments)}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
