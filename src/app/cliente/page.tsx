"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Package, Clock, CheckCircle, Truck } from "lucide-react";

// Dados mockados - pedidos da cliente
const customerOrders = [
  {
    id: "1",
    code: "VND-260401",
    date: "13/04/2026",
    status: "DELIVERED",
    total: 249.9,
    paymentMethod: "PIX",
    items: [
      { name: "Perfume 212 VIP", quantity: 1, unitPrice: 249.9, total: 249.9 },
    ],
  },
  {
    id: "2",
    code: "VND-260398",
    date: "08/04/2026",
    status: "DELIVERING",
    total: 159.7,
    paymentMethod: "Cartão de Crédito",
    deliveryAddress: "Rua das Flores, 123 - São Paulo/SP",
    items: [
      { name: "Creme Hidratante Nivea 400ml", quantity: 2, unitPrice: 34.9, total: 69.8 },
      { name: "Batom MAC Ruby Woo", quantity: 1, unitPrice: 89.9, total: 89.9 },
    ],
  },
  {
    id: "3",
    code: "VND-260385",
    date: "01/04/2026",
    status: "DELIVERED",
    total: 45.9,
    paymentMethod: "Dinheiro",
    items: [
      { name: "Kit Shampoo + Condicionador Pantene", quantity: 1, unitPrice: 45.9, total: 45.9 },
    ],
  },
];

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "warning" | "danger" | "default"; icon: typeof CheckCircle }> = {
  PENDING: { label: "Aguardando Pagamento", variant: "warning", icon: Clock },
  PAID: { label: "Pago", variant: "success", icon: CheckCircle },
  PREPARING: { label: "Preparando", variant: "info", icon: Package },
  DELIVERING: { label: "Em Rota de Entrega", variant: "info", icon: Truck },
  DELIVERED: { label: "Entregue", variant: "success", icon: CheckCircle },
};

export default function ClientePortal() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Olá, Maria!</h2>
        <p className="text-muted text-sm mt-1">Acompanhe seus pedidos abaixo</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted">Total de Pedidos</p>
              <p className="text-xl font-bold">{customerOrders.length}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-muted">Em Andamento</p>
              <p className="text-xl font-bold">{customerOrders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de pedidos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Meus Pedidos</h3>

        {customerOrders.map((order) => {
          const status = statusConfig[order.status];
          const StatusIcon = status.icon;

          return (
            <Card key={order.id} className="!p-0 overflow-hidden">
              {/* Header do pedido */}
              <div className="flex items-center justify-between p-4 bg-background border-b border-border">
                <div>
                  <p className="font-mono text-sm font-bold">{order.code}</p>
                  <p className="text-xs text-muted">{order.date}</p>
                </div>
                <Badge variant={status.variant}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
              </div>

              {/* Itens */}
              <div className="p-4 space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t border-border bg-background/50">
                <span className="text-sm text-muted">{order.paymentMethod}</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(order.total)}</span>
              </div>

              {/* Status de entrega */}
              {order.status === "DELIVERING" && order.deliveryAddress && (
                <div className="px-4 pb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Entregando em:</p>
                    <p className="text-sm text-blue-800">{order.deliveryAddress}</p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
