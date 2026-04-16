"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart, Package, Clock, CheckCircle, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: { name: string };
}

interface Sale {
  id: string;
  code: string;
  total: number;
  paymentMethod: string;
  status: string;
  deliveryAddress: string | null;
  createdAt: string;
  items: SaleItem[];
}

const statusConfig: Record<string, { label: string; variant: "success" | "info" | "warning" | "danger" | "default"; icon: typeof CheckCircle }> = {
  PENDING: { label: "Aguardando Pagamento", variant: "warning", icon: Clock },
  PAID: { label: "Pago", variant: "success", icon: CheckCircle },
  PREPARING: { label: "Preparando", variant: "info", icon: Package },
  DELIVERING: { label: "Em Rota de Entrega", variant: "info", icon: Truck },
  DELIVERED: { label: "Entregue", variant: "success", icon: CheckCircle },
  CANCELLED: { label: "Cancelado", variant: "danger", icon: Clock },
  REFUNDED: { label: "Estornado", variant: "danger", icon: Clock },
  EXCHANGED: { label: "Troca Realizada", variant: "default", icon: Package },
};

const paymentLabels: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  INSTALLMENT: "Crediário",
};

export default function ClientePortal() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.storeId || !user?.customerId) {
      setLoading(false);
      return;
    }
    api
      .get<Sale[]>(`/vendas?storeId=${user.storeId}&customerId=${user.customerId}`)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user]);

  const firstName = user?.name?.split(" ")[0] || "Cliente";
  const inProgressCount = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Olá, {firstName}!</h2>
        <p className="text-muted text-sm mt-1">Acompanhe seus pedidos abaixo</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted">Total de Pedidos</p>
              <p className="text-xl font-bold">{orders.length}</p>
            </div>
          </div>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-muted">Em Andamento</p>
              <p className="text-xl font-bold">{inProgressCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Meus Pedidos</h3>

        {loading && <p className="text-muted text-sm text-center py-8">Carregando pedidos...</p>}

        {!loading && orders.length === 0 && (
          <Card className="text-center py-10">
            <Package className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted">Você ainda não fez nenhum pedido.</p>
          </Card>
        )}

        {!loading && orders.map((order) => {
          const status = statusConfig[order.status] || statusConfig.PENDING;
          const StatusIcon = status.icon;
          const dateStr = new Date(order.createdAt).toLocaleDateString("pt-BR");

          return (
            <Card key={order.id} className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-background border-b border-border">
                <div>
                  <p className="font-mono text-sm font-bold">{order.code}</p>
                  <p className="text-xs text-muted">{dateStr}</p>
                </div>
                <Badge variant={status.variant}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
              </div>

              <div className="p-4 space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{item.product.name}</span>
                      <span className="text-muted ml-2">x{item.quantity}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 border-t border-border bg-background/50">
                <span className="text-sm text-muted">{paymentLabels[order.paymentMethod] || order.paymentMethod}</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(order.total)}</span>
              </div>

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
