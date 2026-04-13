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
import { Plus, Search, ShoppingCart, Trash2, Eye, Minus, Printer, MessageCircle, Mail } from "lucide-react";
import toast from "react-hot-toast";

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

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
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  deliveryAddress: string | null;
  customer: { name: string; phone: string | null; email: string | null };
  seller: { name: string };
  items: SaleItem[];
}

interface Product {
  id: string;
  name: string;
  salePrice: number;
  stock: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

const statusMap: Record<string, { label: string; variant: "success" | "info" | "warning" | "danger" | "default" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  PAID: { label: "Pago", variant: "success" },
  PREPARING: { label: "Preparando", variant: "info" },
  DELIVERING: { label: "Em Rota", variant: "info" },
  DELIVERED: { label: "Entregue", variant: "success" },
  CANCELLED: { label: "Cancelado", variant: "danger" },
};

const paymentLabels: Record<string, string> = {
  CASH: "Dinheiro", PIX: "PIX", CREDIT_CARD: "Cartão Crédito", DEBIT_CARD: "Cartão Débito", INSTALLMENT: "Fiado",
};

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

  // Carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
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
  const total = subtotal - discount;

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

  const finalizeSale = async () => {
    if (cart.length === 0) { toast.error("Adicione produtos ao carrinho!"); return; }
    if (!selectedCustomer) { toast.error("Selecione um cliente!"); return; }
    try {
      await api.post("/vendas", {
        code: generateSaleCode(),
        customerId: selectedCustomer,
        sellerId: user?.id,
        storeId: store?.id,
        subtotal,
        discount,
        total,
        paymentMethod,
        deliveryAddress: deliveryAddress || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      });
      toast.success("Venda registrada!");
      setCart([]);
      setSelectedCustomer("");
      setDiscount(0);
      setDeliveryAddress("");
      setShowNewSale(false);
      fetchSales();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar venda");
    }
  };

  const updateStatus = async (saleId: string, newStatus: string) => {
    try {
      await api.patch(`/vendas/${saleId}`, { status: newStatus });
      toast.success("Status atualizado!");
      fetchSales();
      if (selectedSale?.id === saleId) setSelectedSale({ ...selectedSale, status: newStatus });
    } catch { toast.error("Erro ao atualizar status"); }
  };

  const openNewSale = async () => {
    setCart([]);
    setSelectedCustomer("");
    setDiscount(0);
    setPaymentMethod("PIX");
    setDeliveryAddress("");
    await fetchData();
    setShowNewSale(true);
  };

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

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
                <tr key={sale.id} className="hover:bg-background/50">
                  <td className="py-3 font-mono text-xs font-bold">{sale.code}</td>
                  <td className="py-3">{sale.customer.name}</td>
                  <td className="py-3 font-medium">{formatCurrency(sale.total)}</td>
                  <td className="py-3 text-muted text-xs">{paymentLabels[sale.paymentMethod] || sale.paymentMethod}</td>
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

      {/* Nova Venda */}
      <Modal isOpen={showNewSale} onClose={() => setShowNewSale(false)} title="Nova Venda" size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold">Adicionar Produtos</h4>
            <Input placeholder="Buscar produto..." icon={<Search className="w-4 h-4" />} value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            <div className="space-y-2 max-h-60 overflow-y-auto">
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
            <Select label="Forma de Pagamento" options={[{ value: "PIX", label: "PIX" }, { value: "CASH", label: "Dinheiro" }, { value: "CREDIT_CARD", label: "Cartão de Crédito" }, { value: "DEBIT_CARD", label: "Cartão de Débito" }, { value: "INSTALLMENT", label: "Fiado / Crediário" }]} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
            <Input label="Endereço de Entrega" placeholder="Endereço (opcional)" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
          </div>

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

      {/* Detalhes */}
      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} title={`Venda ${selectedSale?.code}`} size="lg">
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted">Cliente:</span> <span className="font-medium">{selectedSale.customer.name}</span></div>
              <div><span className="text-muted">Data:</span> <span className="font-medium">{new Date(selectedSale.createdAt).toLocaleDateString("pt-BR")}</span></div>
              <div><span className="text-muted">Pagamento:</span> <span className="font-medium">{paymentLabels[selectedSale.paymentMethod]}</span></div>
              <div><span className="text-muted">Status:</span> <Badge variant={statusMap[selectedSale.status]?.variant}>{statusMap[selectedSale.status]?.label}</Badge></div>
            </div>
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
            <div className="bg-background rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatCurrency(selectedSale.subtotal)}</span></div>
              {selectedSale.discount > 0 && <div className="flex justify-between text-danger"><span>Desconto</span><span>-{formatCurrency(selectedSale.discount)}</span></div>}
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2"><span>Total</span><span>{formatCurrency(selectedSale.total)}</span></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <p className="text-sm text-muted w-full">Alterar status:</p>
              {["PAID", "PREPARING", "DELIVERING", "DELIVERED"].map((status) => (
                <Button key={status} size="sm" variant={selectedSale.status === status ? "primary" : "secondary"} onClick={() => updateStatus(selectedSale.id, status)}>
                  {statusMap[status]?.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => toast.success("Cupom gerado!")}><Printer className="w-4 h-4" /> Imprimir</Button>
              <Button variant="success" size="sm" onClick={() => {
                const msg = `Olá ${selectedSale.customer.name}! Segue o comprovante da compra ${selectedSale.code} no valor de ${formatCurrency(selectedSale.total)}`;
                const phone = selectedSale.customer.phone?.replace(/\D/g, "");
                window.open(`https://wa.me/${phone ? `55${phone}` : ""}?text=${encodeURIComponent(msg)}`, "_blank");
              }}><MessageCircle className="w-4 h-4" /> WhatsApp</Button>
              <Button variant="secondary" size="sm" onClick={() => toast.success("Email enviado!")}><Mail className="w-4 h-4" /> Email</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
