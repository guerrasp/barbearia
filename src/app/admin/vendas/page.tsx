"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { formatCurrency, generateSaleCode } from "@/lib/utils";
import {
  Plus, Search, ShoppingCart, Trash2, Eye, Minus, Printer,
  MessageCircle, Mail, XCircle, RotateCcw, ArrowLeftRight, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

/* ──────── Tipos ──────── */

interface CartItem { productId: string; name: string; unitPrice: number; quantity: number; total: number; }
interface SaleItem { id: string; quantity: number; unitPrice: number; total: number; product: { name: string }; }
interface PaymentLine { method: string; amount: string; installments: number; dueDate: string; numInstallments: number; }
interface SalePayment { id: string; method: string; amount: number; installments: number | null; }
interface SaleInstallment { id: string; number: number; amount: number; dueDate: string; paidAt: string | null; status: string; }
interface Sale {
  id: string; code: string; subtotal: number; discount: number; total: number;
  paymentMethod: string; status: string; createdAt: string;
  deliveryAddress: string | null; cancelReason: string | null; cancelledAt: string | null;
  customer: { name: string; phone: string | null; email: string | null };
  seller: { name: string }; items: SaleItem[];
  payments: SalePayment[]; installments: SaleInstallment[];
}
interface Product { id: string; name: string; salePrice: number; stock: number; }
interface Customer { id: string; name: string; phone: string | null; }

/* ──────── Constantes ──────── */

const statusMap: Record<string, { label: string; variant: "success" | "info" | "warning" | "danger" | "default" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  PAID: { label: "Pago", variant: "success" },
  PREPARING: { label: "Preparando", variant: "info" },
  DELIVERING: { label: "Em Rota", variant: "info" },
  DELIVERED: { label: "Entregue", variant: "success" },
  CANCELLED: { label: "Cancelado", variant: "danger" },
  REFUNDED: { label: "Estornado", variant: "danger" },
  EXCHANGED: { label: "Troca", variant: "default" },
};

const paymentLabels: Record<string, string> = {
  CASH: "Dinheiro", PIX: "PIX", CREDIT_CARD: "Cartão Crédito",
  DEBIT_CARD: "Cartão Débito", INSTALLMENT: "Crediário",
};

const methodOptions = [
  { value: "PIX", label: "PIX" },
  { value: "CASH", label: "Dinheiro" },
  { value: "CREDIT_CARD", label: "Cartão de Crédito" },
  { value: "DEBIT_CARD", label: "Cartão de Débito" },
  { value: "INSTALLMENT", label: "Crediário" },
];

const emptyPaymentLine = (): PaymentLine => ({
  method: "PIX", amount: "", installments: 1, dueDate: "", numInstallments: 1,
});

/* ──────── Componente ──────── */

export default function VendasPage() {
  const { store, user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showNewSale, setShowNewSale] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de ação (cancelar/estorno/troca)
  const [actionModal, setActionModal] = useState<{ type: "CANCELLED" | "REFUNDED" | "EXCHANGED"; sale: Sale } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([emptyPaymentLine()]);
  const [discount, setDiscount] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const fetchSales = useCallback(async () => {
    if (!store) return;
    try {
      const data = await api.get<Sale[]>(`/vendas?storeId=${store.id}&search=${search}`);
      setSales(data);
    } catch { toast.error("Erro ao carregar vendas"); }
    finally { setIsLoading(false); }
  }, [store, search]);

  const fetchData = useCallback(async () => {
    if (!store) return;
    const [prods, custs] = await Promise.all([
      api.get<Product[]>(`/produtos?storeId=${store.id}`),
      api.get<Customer[]>(`/clientes?storeId=${store.id}`),
    ]);
    setProducts(prods);
    setCustomers(custs);
  }, [store]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(subtotal - discount, 0);
  const paidAmount = paymentLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const remaining = Math.round((total - paidAmount) * 100) / 100;

  /* Carrinho */
  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) { toast.error("Estoque insuficiente!"); return; }
      setCart(cart.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice } : item));
    } else {
      if (product.stock <= 0) { toast.error("Produto sem estoque!"); return; }
      setCart([...cart, { productId: product.id, name: product.name, unitPrice: product.salePrice, quantity: 1, total: product.salePrice }]);
    }
    setProductSearch("");
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.productId !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null;
      return { ...item, quantity: newQty, total: newQty * item.unitPrice };
    }).filter(Boolean) as CartItem[]);
  };

  /* Pagamento */
  const updatePaymentLine = (index: number, field: keyof PaymentLine, value: string | number) => {
    setPaymentLines(paymentLines.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const addPaymentLine = () => setPaymentLines([...paymentLines, emptyPaymentLine()]);
  const removePaymentLine = (i: number) => setPaymentLines(paymentLines.filter((_, idx) => idx !== i));

  /* Auto-preencher valor quando há só 1 linha */
  useEffect(() => {
    if (paymentLines.length === 1 && total > 0) {
      setPaymentLines([{ ...paymentLines[0], amount: total.toFixed(2) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  /* Finalizar venda */
  const finalizeSale = async () => {
    if (cart.length === 0) { toast.error("Adicione produtos ao carrinho!"); return; }
    if (!selectedCustomer) { toast.error("Selecione um cliente!"); return; }
    if (Math.abs(remaining) > 0.01) { toast.error(`A soma dos pagamentos não bate com o total. Faltam ${formatCurrency(remaining)}`); return; }

    // Valida crediário
    for (const p of paymentLines) {
      if (p.method === "INSTALLMENT") {
        if (!p.dueDate) { toast.error("Informe a data da promessa de pagamento"); return; }
        if (!p.numInstallments || p.numInstallments < 1) { toast.error("Informe o nº de parcelas do crediário"); return; }
      }
    }

    try {
      await api.post("/vendas", {
        code: generateSaleCode(),
        customerId: selectedCustomer,
        sellerId: user?.id,
        storeId: store?.id,
        subtotal,
        discount,
        total,
        deliveryAddress: deliveryAddress || undefined,
        payments: paymentLines.map((l) => ({
          method: l.method,
          amount: parseFloat(l.amount) || 0,
          ...(l.method === "CREDIT_CARD" && { installments: l.installments }),
          ...(l.method === "INSTALLMENT" && { dueDate: l.dueDate, numInstallments: l.numInstallments }),
        })),
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      });
      toast.success("Venda registrada!");
      resetNewSale();
      setShowNewSale(false);
      fetchSales();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar venda");
    }
  };

  const resetNewSale = () => {
    setCart([]); setSelectedCustomer(""); setDiscount(0);
    setPaymentLines([emptyPaymentLine()]); setDeliveryAddress(""); setProductSearch("");
  };

  /* Status */
  const updateStatus = async (saleId: string, newStatus: string) => {
    try {
      await api.patch(`/vendas/${saleId}`, { status: newStatus });
      toast.success("Status atualizado!");
      fetchSales();
      if (selectedSale?.id === saleId) setSelectedSale({ ...selectedSale, status: newStatus });
    } catch { toast.error("Erro ao atualizar status"); }
  };

  /* Ação (cancelar/estorno/troca) */
  const executeAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      await api.patch(`/vendas/${actionModal.sale.id}`, {
        status: actionModal.type,
        reason: actionReason,
      });
      const labels = { CANCELLED: "cancelada", REFUNDED: "estornada", EXCHANGED: "marcada como troca" };
      toast.success(`Venda ${labels[actionModal.type]}!`);
      setActionModal(null);
      setActionReason("");
      setShowDetails(false);
      fetchSales();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setActionLoading(false); }
  };

  /* Pagar parcela */
  const payInstallment = async (saleId: string, installmentId: string) => {
    try {
      await api.patch(`/vendas/${saleId}`, { installmentId, action: "payInstallment" });
      toast.success("Parcela marcada como paga!");
      fetchSales();
      // Atualiza detalhes se aberto
      if (selectedSale?.id === saleId) {
        const updated = await api.get<Sale>(`/vendas/${saleId}`);
        setSelectedSale(updated);
      }
    } catch { toast.error("Erro ao marcar parcela"); }
  };

  const openNewSale = async () => {
    resetNewSale();
    await fetchData();
    setShowNewSale(true);
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const isFinalStatus = (s: string) => ["CANCELLED", "REFUNDED", "EXCHANGED"].includes(s);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
          <p className="text-muted text-sm mt-1">{sales.length} vendas registradas</p>
        </div>
        <Button onClick={openNewSale}><Plus className="w-4 h-4" /> Nova Venda</Button>
      </div>

      <div className="max-w-md">
        <Input placeholder="Buscar por código ou cliente..." icon={<Search className="w-4 h-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* ═══ Tabela de vendas ═══ */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="pb-3 font-medium">Código</th>
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Pagamento</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Data</th>
                <th className="pb-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sales.map((sale) => (
                <tr key={sale.id} className={`hover:bg-background/50 ${isFinalStatus(sale.status) ? "opacity-60" : ""}`}>
                  <td className="py-3 font-mono text-xs font-bold">{sale.code}</td>
                  <td className="py-3">{sale.customer.name}</td>
                  <td className="py-3 font-medium">{formatCurrency(sale.total)}</td>
                  <td className="py-3 text-muted text-xs">
                    {sale.payments && sale.payments.length > 1
                      ? `Misto (${sale.payments.length})`
                      : paymentLabels[sale.paymentMethod] || sale.paymentMethod}
                  </td>
                  <td className="py-3"><Badge variant={statusMap[sale.status]?.variant}>{statusMap[sale.status]?.label}</Badge></td>
                  <td className="py-3 text-muted">{new Date(sale.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="py-3">
                    <button onClick={() => { setSelectedSale(sale); setShowDetails(true); }} className="p-2 rounded-lg hover:bg-background text-muted hover:text-primary transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-muted">Nenhuma venda registrada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ═══ Nova Venda ═══ */}
      <Modal isOpen={showNewSale} onClose={() => setShowNewSale(false)} title="Nova Venda" size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna esquerda — produtos + dados */}
          <div className="space-y-4">
            <h4 className="font-semibold">Adicionar Produtos</h4>
            <Input placeholder="Buscar produto..." icon={<Search className="w-4 h-4" />} value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-background cursor-pointer" onClick={() => addToCart(product)}>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted">{product.stock} em estoque</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{formatCurrency(product.salePrice)}</p>
                    <Plus className="w-4 h-4 text-primary ml-auto" />
                  </div>
                </div>
              ))}
            </div>
            <Select label="Cliente *" placeholder="Selecione o cliente" options={customers.map((c) => ({ value: c.id, label: c.name }))} value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} />
            <Input label="Endereço de Entrega" placeholder="Endereço (opcional)" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />

            {/* Formas de pagamento */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Formas de Pagamento</h4>
                <button type="button" onClick={addPaymentLine} className="text-xs text-primary hover:underline font-medium">+ Adicionar</button>
              </div>

              {paymentLines.map((line, idx) => (
                <div key={idx} className="space-y-2 p-3 rounded-lg bg-background border border-border">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        label="Método"
                        options={methodOptions}
                        value={line.method}
                        onChange={(e) => updatePaymentLine(idx, "method", e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        label="Valor (R$)"
                        type="number"
                        step="0.01"
                        min={0}
                        value={line.amount}
                        onChange={(e) => updatePaymentLine(idx, "amount", e.target.value)}
                      />
                    </div>
                    {paymentLines.length > 1 && (
                      <button type="button" onClick={() => removePaymentLine(idx)} className="p-2 text-muted hover:text-danger mb-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Cartão crédito — parcelas */}
                  {line.method === "CREDIT_CARD" && (
                    <Select
                      label="Parcelas"
                      options={Array.from({ length: 12 }, (_, i) => {
                        const n = i + 1;
                        const v = parseFloat(line.amount) || 0;
                        const parcel = v > 0 && n > 1 ? ` (${formatCurrency(v / n)}/mês)` : "";
                        return { value: String(n), label: `${n}x${parcel}` };
                      })}
                      value={String(line.installments)}
                      onChange={(e) => updatePaymentLine(idx, "installments", parseInt(e.target.value))}
                    />
                  )}

                  {/* Crediário — data e parcelas */}
                  {line.method === "INSTALLMENT" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Data promessa"
                        type="date"
                        value={line.dueDate}
                        onChange={(e) => updatePaymentLine(idx, "dueDate", e.target.value)}
                      />
                      <Select
                        label="Nº parcelas"
                        options={Array.from({ length: 12 }, (_, i) => {
                          const n = i + 1;
                          return { value: String(n), label: `${n}x` };
                        })}
                        value={String(line.numInstallments)}
                        onChange={(e) => updatePaymentLine(idx, "numInstallments", parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Indicador de falta/sobra */}
              {total > 0 && (
                <div className={`text-xs font-medium ${Math.abs(remaining) < 0.01 ? "text-success" : "text-danger"}`}>
                  {Math.abs(remaining) < 0.01 ? "✓ Valores conferidos" : remaining > 0 ? `Falta: ${formatCurrency(remaining)}` : `Excede: ${formatCurrency(Math.abs(remaining))}`}
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita — carrinho */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Carrinho ({cart.length})</h4>
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Carrinho vazio</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted">{formatCurrency(item.unitPrice)} cada</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-border"><Minus className="w-3 h-3" /></button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-border"><Plus className="w-3 h-3" /></button>
                      <span className="w-20 text-right font-medium text-sm">{formatCurrency(item.total)}</span>
                      <button onClick={() => setCart(cart.filter((c) => c.productId !== item.productId))} className="p-1 text-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Input label="Desconto (R$)" type="number" step="0.01" min={0} value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
            <div className="bg-background rounded-lg p-4 border border-border space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-sm text-danger"><span>Desconto</span><span>-{formatCurrency(discount)}</span></div>}
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2"><span>Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
            </div>
            <Button onClick={finalizeSale} className="w-full" size="lg"><ShoppingCart className="w-5 h-5" /> Finalizar Venda</Button>
          </div>
        </div>
      </Modal>

      {/* ═══ Detalhes da venda ═══ */}
      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} title={`Venda ${selectedSale?.code}`} size="lg">
        {selectedSale && (
          <div className="space-y-4">
            {/* Motivo de cancelamento */}
            {selectedSale.cancelReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-500 font-medium mb-1">{statusMap[selectedSale.status]?.label || selectedSale.status}</p>
                <p className="text-sm text-red-700">{selectedSale.cancelReason}</p>
                {selectedSale.cancelledAt && <p className="text-xs text-red-400 mt-1">{new Date(selectedSale.cancelledAt).toLocaleDateString("pt-BR")}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted">Cliente:</span> <span className="font-medium">{selectedSale.customer.name}</span></div>
              <div><span className="text-muted">Data:</span> <span className="font-medium">{new Date(selectedSale.createdAt).toLocaleDateString("pt-BR")}</span></div>
              <div><span className="text-muted">Status:</span> <Badge variant={statusMap[selectedSale.status]?.variant}>{statusMap[selectedSale.status]?.label}</Badge></div>
              <div>
                <span className="text-muted">Pagamento:</span>{" "}
                <span className="font-medium">
                  {selectedSale.payments && selectedSale.payments.length > 0
                    ? selectedSale.payments.map((p) => paymentLabels[p.method]).join(" + ")
                    : paymentLabels[selectedSale.paymentMethod]}
                </span>
              </div>
            </div>

            {/* Itens */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background"><tr className="text-left text-muted"><th className="p-3">Produto</th><th className="p-3">Qtd</th><th className="p-3">Unitário</th><th className="p-3 text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {selectedSale.items.map((item) => (
                    <tr key={item.id}><td className="p-3">{item.product.name}</td><td className="p-3">{item.quantity}</td><td className="p-3">{formatCurrency(item.unitPrice)}</td><td className="p-3 text-right font-medium">{formatCurrency(item.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagamentos split */}
            {selectedSale.payments && selectedSale.payments.length > 0 && (
              <div className="bg-background rounded-lg p-4 border border-border">
                <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wide">Pagamentos</p>
                {selectedSale.payments.map((p, i) => {
                  let label = paymentLabels[p.method] || p.method;
                  if (p.method === "CREDIT_CARD" && p.installments && p.installments > 1) {
                    label += ` (${p.installments}x de ${formatCurrency(p.amount / p.installments)})`;
                  }
                  return (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span>{label}</span>
                      <span className="font-medium">{formatCurrency(p.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Totais */}
            <div className="bg-background rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatCurrency(selectedSale.subtotal)}</span></div>
              {selectedSale.discount > 0 && <div className="flex justify-between text-danger"><span>Desconto</span><span>-{formatCurrency(selectedSale.discount)}</span></div>}
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2"><span>Total</span><span>{formatCurrency(selectedSale.total)}</span></div>
            </div>

            {/* Parcelas (crediário) — visível só pro admin */}
            {selectedSale.installments && selectedSale.installments.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Parcelas do Crediário</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-background text-muted"><tr><th className="p-3 text-left">Parcela</th><th className="p-3 text-left">Vencimento</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Status</th><th className="p-3 text-right">Ação</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {selectedSale.installments.map((inst) => (
                      <tr key={inst.id} className={inst.status === "PAID" ? "bg-emerald-50/50" : inst.status === "OVERDUE" ? "bg-red-50/50" : ""}>
                        <td className="p-3 font-medium">{inst.number}ª</td>
                        <td className="p-3">{new Date(inst.dueDate).toLocaleDateString("pt-BR")}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(inst.amount)}</td>
                        <td className="p-3 text-center">
                          <Badge variant={inst.status === "PAID" ? "success" : inst.status === "OVERDUE" ? "danger" : "warning"}>
                            {inst.status === "PAID" ? "Pago" : inst.status === "OVERDUE" ? "Vencido" : "Pendente"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          {inst.status !== "PAID" && (
                            <Button size="sm" variant="success" onClick={() => payInstallment(selectedSale.id, inst.id)}>
                              <CheckCircle2 className="w-3 h-3" /> Pago
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Botões de status */}
            {!isFinalStatus(selectedSale.status) && (
              <div className="flex flex-wrap gap-2">
                <p className="text-sm text-muted w-full">Alterar status:</p>
                {["PAID", "PREPARING", "DELIVERING", "DELIVERED"].map((status) => (
                  <Button key={status} size="sm" variant={selectedSale.status === status ? "primary" : "secondary"} onClick={() => updateStatus(selectedSale.id, status)}>
                    {statusMap[status]?.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Compartilhamento */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => window.open(`/comprovante/${selectedSale.id}`, "_blank")}>
                <Printer className="w-4 h-4" /> Imprimir / PDF
              </Button>
              <Button
                variant="success" size="sm"
                onClick={async () => {
                  try {
                    const receipt = await api.get<{ text: string }>(`/vendas/${selectedSale.id}/whatsapp`);
                    const phone = selectedSale.customer.phone?.replace(/\D/g, "");
                    const url = `${window.location.origin}/comprovante/${selectedSale.id}`;
                    const msg = `${receipt.text}\n\n📄 Ver comprovante: ${url}`;
                    window.open(`https://wa.me/${phone ? `55${phone}` : ""}?text=${encodeURIComponent(msg)}`, "_blank");
                  } catch { toast.error("Erro ao gerar mensagem"); }
                }}
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
              <Button
                variant="secondary" size="sm" disabled={!selectedSale.customer.email}
                onClick={async () => {
                  const loading = toast.loading("Enviando email...");
                  try {
                    await api.post(`/vendas/${selectedSale.id}/email`, {});
                    toast.success("Email enviado!", { id: loading });
                  } catch (err) { toast.error(err instanceof Error ? err.message : "Erro ao enviar email", { id: loading }); }
                }}
              >
                <Mail className="w-4 h-4" /> {selectedSale.customer.email ? "Email" : "Sem email"}
              </Button>
            </div>

            {/* Ações destrutivas */}
            {!isFinalStatus(selectedSale.status) && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                <Button variant="danger" size="sm" onClick={() => setActionModal({ type: "CANCELLED", sale: selectedSale })}>
                  <XCircle className="w-4 h-4" /> Cancelar Venda
                </Button>
                <Button variant="danger" size="sm" onClick={() => setActionModal({ type: "REFUNDED", sale: selectedSale })}>
                  <RotateCcw className="w-4 h-4" /> Estorno
                </Button>
                <Button variant="secondary" size="sm" onClick={() => {
                  setActionModal({ type: "EXCHANGED", sale: selectedSale });
                }}>
                  <ArrowLeftRight className="w-4 h-4" /> Troca
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ═══ Modal de ação (cancelar / estorno / troca) ═══ */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setActionReason(""); }}
        title={actionModal?.type === "CANCELLED" ? "Cancelar Venda" : actionModal?.type === "REFUNDED" ? "Estornar Venda" : "Troca de Produto"}
        size="sm"
      >
        {actionModal && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-medium text-red-700">
                {actionModal.type === "CANCELLED" && "A venda será cancelada e o estoque devolvido."}
                {actionModal.type === "REFUNDED" && "O valor será estornado e o estoque devolvido."}
                {actionModal.type === "EXCHANGED" && "A venda será marcada como troca, estoque devolvido. Registre a nova venda em seguida."}
              </p>
            </div>
            <p className="text-sm"><span className="text-muted">Venda:</span> <strong>{actionModal.sale.code}</strong> — {formatCurrency(actionModal.sale.total)}</p>
            <Input
              label="Motivo (opcional)"
              placeholder="Ex: Cliente desistiu, produto com defeito..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="danger" isLoading={actionLoading} onClick={executeAction} className="flex-1">
                Confirmar
              </Button>
              <Button variant="secondary" onClick={() => { setActionModal(null); setActionReason(""); }}>
                Voltar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
