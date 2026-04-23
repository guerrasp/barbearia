"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Edit2, Trash2, Scissors, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const serviceSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Preço deve ser maior que zero"),
  durationMinutes: z.coerce.number().int().positive("Duração obrigatória"),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
});

type ServiceFormInput = z.input<typeof serviceSchema>;
type ServiceFormData = z.output<typeof serviceSchema>;

interface Category {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  categoryId: string | null;
  category: Category | null;
}

export default function ServicosPage() {
  const { store } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormInput, unknown, ServiceFormData>({
    resolver: zodResolver(serviceSchema),
  });

  const fetchServices = useCallback(async () => {
    if (!store) return;
    try {
      const data = await api.get<Service[]>(
        `/servicos?storeId=${store.id}&search=${encodeURIComponent(search)}`,
      );
      setServices(data);
    } catch {
      toast.error("Erro ao carregar serviços");
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
      /* não bloqueia se falhar */
    }
  }, [store]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openModal = (service?: Service) => {
    if (service) {
      setEditing(service);
      reset({
        name: service.name,
        description: service.description || "",
        price: service.price,
        durationMinutes: service.durationMinutes,
        categoryId: service.categoryId || "",
        isActive: service.isActive,
      });
    } else {
      setEditing(null);
      reset({
        name: "",
        description: "",
        price: undefined,
        durationMinutes: undefined,
        categoryId: "",
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const onSubmit = async (data: ServiceFormData) => {
    try {
      const payload = {
        ...data,
        categoryId: data.categoryId || null,
      };
      if (editing) {
        await api.put(`/servicos/${editing.id}`, payload);
        toast.success("Serviço atualizado!");
      } else {
        await api.post("/servicos", { ...payload, storeId: store?.id });
        toast.success("Serviço cadastrado!");
      }
      setShowModal(false);
      fetchServices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar serviço");
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      await api.put(`/servicos/${service.id}`, { isActive: !service.isActive });
      fetchServices();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Excluir o serviço "${service.name}"?`)) return;
    try {
      const res = await api.delete<{ message: string }>(`/servicos/${service.id}`);
      toast.success(res.message || "Serviço removido!");
      fetchServices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
          <p className="text-muted text-sm mt-1">
            {services.length} cadastrados · {activeCount} ativos
          </p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4" /> Novo Serviço
        </Button>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Buscar por nome..."
          icon={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Desktop */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="pb-3 font-medium">Serviço</th>
                <th className="pb-3 font-medium">Categoria</th>
                <th className="pb-3 font-medium">Duração</th>
                <th className="pb-3 font-medium">Preço</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-background/50">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Scissors className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.description && (
                          <p className="text-xs text-muted line-clamp-1">{s.description}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-muted">{s.category?.name || "-"}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1 text-muted">
                      <Clock className="w-3 h-3" />
                      {s.durationMinutes} min
                    </div>
                  </td>
                  <td className="py-3 font-medium">{formatCurrency(s.price)}</td>
                  <td className="py-3">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        s.isActive
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Inativo
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(s)}
                        className="p-2 rounded-lg hover:bg-background text-muted hover:text-primary transition-colors"
                        aria-label="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-2 rounded-lg hover:bg-background text-muted hover:text-danger transition-colors"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted">
                    Nenhum serviço cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {services.map((s) => (
          <Card key={s.id} className="!p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted">{s.category?.name || "Sem categoria"}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openModal(s)}
                  className="p-1.5 rounded-lg hover:bg-background text-muted"
                  aria-label="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-danger"
                  aria-label="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted">
                <Clock className="w-3 h-3" /> {s.durationMinutes} min
              </span>
              <span className="font-semibold">{formatCurrency(s.price)}</span>
              <button
                onClick={() => toggleActive(s)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {s.isActive ? "Ativo" : "Inativo"}
              </button>
            </div>
          </Card>
        ))}
        {services.length === 0 && (
          <p className="text-center text-muted py-8">Nenhum serviço cadastrado ainda.</p>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Editar Serviço" : "Novo Serviço"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome *"
            placeholder="Ex.: Corte Degradê"
            maxLength={80}
            error={errors.name?.message}
            {...register("name")}
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição</label>
            <textarea
              placeholder="Detalhes do serviço (opcional)"
              maxLength={300}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              {...register("description")}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Preço (R$) *"
              type="number"
              step="0.01"
              min="0"
              placeholder="45.00"
              error={errors.price?.message}
              {...register("price")}
            />
            <Input
              label="Duração (minutos) *"
              type="number"
              min="1"
              placeholder="30"
              error={errors.durationMinutes?.message}
              {...register("durationMinutes")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Categoria</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              {...register("categoryId")}
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isActive")} defaultChecked={!editing} />
            Serviço ativo (visível no portal de agendamento)
          </label>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {editing ? "Salvar Alterações" : "Cadastrar Serviço"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
