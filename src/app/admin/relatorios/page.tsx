"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, DollarSign, ShoppingCart, Package, Users, Calendar } from "lucide-react";

// Dados mockados de relatório mensal
const monthlyData = {
  revenue: 12450.0,
  cost: 5890.0,
  profit: 6560.0,
  profitMargin: 52.7,
  totalSales: 48,
  avgTicket: 259.38,
  newCustomers: 7,
  topProducts: [
    { name: "Perfume 212 VIP", qty: 12, revenue: 2998.8 },
    { name: "Batom MAC Ruby Woo", qty: 18, revenue: 1618.2 },
    { name: "Kit Shampoo Pantene", qty: 15, revenue: 688.5 },
    { name: "Base Líquida Natura Una", qty: 10, revenue: 749.0 },
    { name: "Creme Hidratante Nivea", qty: 22, revenue: 767.8 },
  ],
  topCustomers: [
    { name: "Maria Silva", purchases: 5, total: 1249.5 },
    { name: "Ana Costa", purchases: 4, total: 899.6 },
    { name: "Carla Mendes", purchases: 3, total: 674.7 },
    { name: "João Santos", purchases: 3, total: 413.1 },
  ],
  paymentBreakdown: [
    { method: "PIX", count: 22, total: 5698.0, pct: 45.8 },
    { method: "Cartão Crédito", count: 12, total: 3114.0, pct: 25.0 },
    { method: "Dinheiro", count: 8, total: 1992.0, pct: 16.0 },
    { method: "Cartão Débito", count: 4, total: 897.0, pct: 7.2 },
    { method: "Fiado", count: 2, total: 749.0, pct: 6.0 },
  ],
  pendingInstallments: 749.0,
};

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted text-sm mt-1">Resumo mensal — Abril 2026</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Calendar className="w-4 h-4" />
          Abril 2026
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted">Faturamento</p>
              <p className="text-xl font-bold">{formatCurrency(monthlyData.revenue)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg"><TrendingUp className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-xs text-muted">Custo Total</p>
              <p className="text-xl font-bold">{formatCurrency(monthlyData.cost)}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted">Lucro Líquido</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(monthlyData.profit)}</p>
              <p className="text-xs text-muted">Margem: {monthlyData.profitMargin}%</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><ShoppingCart className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-muted">Ticket Médio</p>
              <p className="text-xl font-bold">{formatCurrency(monthlyData.avgTicket)}</p>
              <p className="text-xs text-muted">{monthlyData.totalSales} vendas</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top produtos */}
        <Card title="Produtos Mais Vendidos">
          <div className="space-y-3">
            {monthlyData.topProducts.map((p, i) => (
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
        </Card>

        {/* Top clientes */}
        <Card title="Melhores Clientes">
          <div className="space-y-3">
            {monthlyData.topCustomers.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.purchases} compras</p>
                  </div>
                </div>
                <span className="font-bold text-sm">{formatCurrency(c.total)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Formas de pagamento */}
        <Card title="Formas de Pagamento">
          <div className="space-y-3">
            {monthlyData.paymentBreakdown.map((p, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{p.method}</span>
                  <span className="font-medium">{formatCurrency(p.total)} ({p.pct}%)</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fiado pendente */}
        <Card title="Crediário / Fiado">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">Valor pendente de recebimento:</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(monthlyData.pendingInstallments)}</p>
            <p className="text-xs text-amber-600 mt-2">2 vendas com pagamento pendente</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
