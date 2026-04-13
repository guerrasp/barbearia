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
import { formatCurrency } from "@/lib/utils";
import { Search, Package, AlertTriangle, Plus, Minus, ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";

interface StockProduct {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  salePrice: number;
  category: { name: string } | null;
  stockMovements: { type: string; quantity: number; reason: string | null; createdAt: string }[];
}

export default function EstoquePage() {
  const { store } = useAuth();
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);
  const [movementType, setMovementType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!store) return;
    try {
      const data = await api.get<StockProduct[]>(`/estoque?storeId=${store.id}`);
      setProducts(data);
    } catch {
      toast.error("Erro ao carregar estoque");
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = products
    .filter((p) => {
      if (filter === "low") return p.stock > 0 && p.stock <= p.minStock;
      if (filter === "out") return p.stock === 0;
      return true;
    })
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.salePrice, 0);

  const openMovement = (product: StockProduct) => {
    setSelectedProduct(product);
    setMovementType("IN");
    setQuantity(1);
    setReason("");
    setShowModal(true);
  };

  const handleMovement = async () => {
    if (!selectedProduct) return;
    try {
      await api.post("/estoque", {
        productId: selectedProduct.id,
        type: movementType,
        quantity,
        reason: reason || undefined,
      });
      toast.success("Estoque atualizado!");
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar estoque");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Controle de Estoque</h1>
        <p className="text-muted text-sm mt-1">Gerencie as quantidades dos seus produtos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="!p-4">
          <p className="text-sm text-muted">Valor em Estoque</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalValue)}</p>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <p className="text-sm text-muted">Estoque Baixo</p>
          </div>
          <p className="text-2xl font-bold text-warning mt-1">{lowStockCount} produtos</p>
        </Card>
        <Card className="!p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <p className="text-sm text-muted">Sem Estoque</p>
          </div>
          <p className="text-2xl font-bold text-danger mt-1">{outOfStockCount} produtos</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="max-w-md flex-1">
          <Input placeholder="Buscar produto..." icon={<Search className="w-4 h-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("all")}>Todos</Button>
          <Button variant={filter === "low" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("low")}>Baixo ({lowStockCount})</Button>
          <Button variant={filter === "out" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("out")}>Zerado ({outOfStockCount})</Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="pb-3 font-medium">Produto</th>
                <th className="pb-3 font-medium">Categoria</th>
                <th className="pb-3 font-medium">Estoque</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Última Mov.</th>
                <th className="pb-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((product) => {
                const lastMov = product.stockMovements[0];
                return (
                  <tr key={product.id} className="hover:bg-background/50">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <p className="font-medium">{product.name}</p>
                      </div>
                    </td>
                    <td className="py-3"><Badge>{product.category?.name || "Geral"}</Badge></td>
                    <td className="py-3">
                      <span className={`text-lg font-bold ${product.stock === 0 ? "text-danger" : product.stock <= product.minStock ? "text-warning" : "text-foreground"}`}>
                        {product.stock}
                      </span>
                      <span className="text-muted text-xs ml-1">/ mín: {product.minStock}</span>
                    </td>
                    <td className="py-3">
                      {product.stock === 0 ? <Badge variant="danger">Sem Estoque</Badge> : product.stock <= product.minStock ? <Badge variant="warning">Baixo</Badge> : <Badge variant="success">Normal</Badge>}
                    </td>
                    <td className="py-3 text-muted text-xs">
                      {lastMov ? `${lastMov.type === "IN" ? "Entrada" : lastMov.type === "OUT" ? "Saída" : "Ajuste"} ${lastMov.quantity}un${lastMov.reason ? ` (${lastMov.reason})` : ""}` : "-"}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end">
                        <Button size="sm" variant="secondary" onClick={() => openMovement(product)}>
                          <ArrowUpDown className="w-3 h-3" /> Movimentar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted">Nenhum produto encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Movimentação de Estoque" size="sm">
        {selectedProduct && (
          <div className="space-y-4">
            <div className="bg-background rounded-lg p-4 border border-border">
              <p className="font-medium">{selectedProduct.name}</p>
              <p className="text-sm text-muted mt-1">Estoque atual: <span className="font-bold text-foreground">{selectedProduct.stock} un.</span></p>
            </div>
            <Select label="Tipo" options={[{ value: "IN", label: "Entrada (adicionar)" }, { value: "OUT", label: "Saída (remover)" }, { value: "ADJUST", label: "Ajuste (definir valor)" }]} value={movementType} onChange={(e) => setMovementType(e.target.value as "IN" | "OUT" | "ADJUST")} />
            <Input label={movementType === "ADJUST" ? "Novo Estoque" : "Quantidade"} type="number" min={0} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 0)} />
            <Input label="Motivo (opcional)" placeholder="Ex: Compra de fornecedor" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="bg-background rounded-lg p-3 border border-border text-sm">
              <span className="text-muted">Novo estoque: </span>
              <span className="font-bold">
                {movementType === "ADJUST" ? quantity : movementType === "OUT" ? selectedProduct.stock - quantity : selectedProduct.stock + quantity} un.
              </span>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleMovement} className="flex-1">
                {movementType === "IN" && <Plus className="w-4 h-4" />}
                {movementType === "OUT" && <Minus className="w-4 h-4" />}
                {movementType === "ADJUST" && <ArrowUpDown className="w-4 h-4" />}
                Confirmar
              </Button>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
