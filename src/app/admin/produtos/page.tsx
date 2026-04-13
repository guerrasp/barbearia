"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ProductForm from "@/components/products/ProductForm";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Edit2, Trash2, Package } from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  costPrice: number;
  salePrice: number;
  profitMargin: number;
  stock: number;
  minStock: number;
  categoryId: string | null;
  category: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const { store } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!store) return;
    try {
      const data = await api.get<Product[]>(`/produtos?storeId=${store.id}&search=${search}`);
      setProducts(data);
    } catch (err) {
      toast.error("Erro ao carregar produtos");
    } finally {
      setIsLoading(false);
    }
  }, [store, search]);

  const fetchCategories = useCallback(async () => {
    if (!store) return;
    try {
      const data = await api.get<Category[]>(`/categorias?storeId=${store.id}`);
      setCategories(data);
    } catch {
      // silent
    }
  }, [store]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const handleCreate = async (data: Record<string, unknown>) => {
    await api.post("/produtos", { ...data, storeId: store?.id });
    toast.success("Produto cadastrado!");
    setIsModalOpen(false);
    fetchProducts();
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingProduct) return;
    await api.put(`/produtos/${editingProduct.id}`, data);
    toast.success("Produto atualizado!");
    setEditingProduct(null);
    setIsModalOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    await api.delete(`/produtos/${id}`);
    toast.success("Produto excluído!");
    fetchProducts();
  };

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted text-sm mt-1">{products.length} produtos cadastrados</p>
        </div>
        <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4" /> Novo Produto
        </Button>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Buscar por nome, código de barras..."
          icon={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="pb-3 font-medium">Produto</th>
                <th className="pb-3 font-medium">Categoria</th>
                <th className="pb-3 font-medium">Custo</th>
                <th className="pb-3 font-medium">Venda</th>
                <th className="pb-3 font-medium">Margem</th>
                <th className="pb-3 font-medium">Estoque</th>
                <th className="pb-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-background/50">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.barcode && <p className="text-xs text-muted font-mono">{product.barcode}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3"><Badge>{product.category?.name || "Sem categoria"}</Badge></td>
                  <td className="py-3 text-muted">{formatCurrency(product.costPrice)}</td>
                  <td className="py-3 font-medium">{formatCurrency(product.salePrice)}</td>
                  <td className="py-3"><Badge variant="success">{product.profitMargin}%</Badge></td>
                  <td className="py-3">
                    <span className={`font-medium ${product.stock === 0 ? "text-danger" : product.stock <= product.minStock ? "text-warning" : "text-foreground"}`}>
                      {product.stock} un.
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} className="p-2 rounded-lg hover:bg-background text-muted hover:text-primary transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg hover:bg-background text-muted hover:text-danger transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-muted">Nenhum produto cadastrado ainda. Clique em "Novo Produto" para começar!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); }}
        title={editingProduct ? "Editar Produto" : "Novo Produto"}
        size="lg"
      >
        <ProductForm
          categories={categoryOptions}
          initialData={editingProduct ? {
            name: editingProduct.name,
            barcode: editingProduct.barcode || "",
            costPrice: editingProduct.costPrice,
            salePrice: editingProduct.salePrice,
            stock: editingProduct.stock,
            minStock: editingProduct.minStock,
            categoryId: editingProduct.categoryId || "",
          } : undefined}
          onSubmit={editingProduct ? handleUpdate : handleCreate}
          onCancel={() => { setIsModalOpen(false); setEditingProduct(null); }}
        />
      </Modal>
    </div>
  );
}
