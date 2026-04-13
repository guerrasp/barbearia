"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { formatPhone, formatCPF } from "@/lib/utils";
import { Plus, Search, Edit2, Trash2, User, Phone, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const customerSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  _count: { sales: number };
  sales: { createdAt: string }[];
}

export default function ClientesPage() {
  const { store } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const fetchCustomers = useCallback(async () => {
    if (!store) return;
    try {
      const data = await api.get<Customer[]>(`/clientes?storeId=${store.id}&search=${search}`);
      setCustomers(data);
    } catch {
      toast.error("Erro ao carregar clientes");
    } finally {
      setIsLoading(false);
    }
  }, [store, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      reset({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        cpf: customer.cpf || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zipCode: customer.zipCode || "",
      });
    } else {
      setEditingCustomer(null);
      reset({ name: "", email: "", phone: "", cpf: "", address: "", city: "", state: "", zipCode: "" });
    }
    setShowModal(true);
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (editingCustomer) {
        await api.put(`/clientes/${editingCustomer.id}`, data);
        toast.success("Cliente atualizado!");
      } else {
        await api.post("/clientes", { ...data, storeId: store?.id });
        toast.success("Cliente cadastrado!");
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar cliente");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      await api.delete(`/clientes/${id}`);
      toast.success("Cliente excluído!");
      fetchCustomers();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted text-sm mt-1">{customers.length} clientes cadastrados</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4" /> Novo Cliente
        </Button>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Buscar por nome, telefone, CPF ou email..."
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
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Telefone</th>
                <th className="pb-3 font-medium">CPF</th>
                <th className="pb-3 font-medium">Cidade</th>
                <th className="pb-3 font-medium">Compras</th>
                <th className="pb-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-background/50">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        {c.email && <p className="text-xs text-muted">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3">{c.phone ? formatPhone(c.phone) : "-"}</td>
                  <td className="py-3 font-mono text-xs">{c.cpf ? formatCPF(c.cpf) : "-"}</td>
                  <td className="py-3">{c.city ? `${c.city}/${c.state}` : "-"}</td>
                  <td className="py-3 font-medium">{c._count.sales}</td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openModal(c)} className="p-2 rounded-lg hover:bg-background text-muted hover:text-primary transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-background text-muted hover:text-danger transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-muted">Nenhum cliente cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {customers.map((c) => (
          <Card key={c.id} className="!p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{c.name}</p>
                  {c.email && <p className="text-xs text-muted">{c.email}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openModal(c)} className="p-1.5 rounded-lg hover:bg-background text-muted"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted">
              {c.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{formatPhone(c.phone)}</div>}
              {c.city && <div className="flex items-center gap-2"><MapPin className="w-3 h-3" />{c.city}/{c.state}</div>}
              <p className="text-xs">{c._count.sales} compras</p>
            </div>
          </Card>
        ))}
        {customers.length === 0 && <p className="text-center text-muted py-8">Nenhum cliente cadastrado ainda.</p>}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCustomer ? "Editar Cliente" : "Novo Cliente"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nome Completo *" placeholder="Nome do cliente" error={errors.name?.message} {...register("name")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="email@exemplo.com" {...register("email")} />
            <Input label="Telefone" placeholder="(11) 99999-9999" {...register("phone")} />
          </div>
          <Input label="CPF" placeholder="000.000.000-00" {...register("cpf")} />
          <Input label="Endereço" placeholder="Rua, número, complemento" {...register("address")} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Cidade" placeholder="São Paulo" {...register("city")} />
            <Input label="Estado" placeholder="SP" {...register("state")} />
            <Input label="CEP" placeholder="00000-000" {...register("zipCode")} />
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" className="flex-1">{editingCustomer ? "Salvar Alterações" : "Cadastrar Cliente"}</Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
