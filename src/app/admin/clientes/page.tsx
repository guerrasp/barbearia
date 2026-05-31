"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { formatPhone, formatCPF, formatCurrency } from "@/lib/utils";
import {
  Plus, Search, Edit2, Trash2, User, Phone, MapPin,
  AlertTriangle, Cake, Eye, Heart, Clock, DollarSign,
  Scissors, UserCog, Calendar, XCircle, MessageCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

// ── Schema ────────────────────────────────────────
const customerSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido").or(z.literal("")).optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});
type CustomerFormData = z.infer<typeof customerSchema>;

// ── Types ─────────────────────────────────────────
interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  birthDate: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  _count: { appointments: number };
  appointments: { startAt: string; status: string }[];
}

interface CustomerInsights {
  totalSpent: number;
  totalVisits: number;
  avgTicket: number;
  avgFrequencyDays: number | null;
  favoriteBarber: { name: string; count: number } | null;
  favoriteService: { name: string; count: number } | null;
  firstVisit: string | null;
  lastVisit: string | null;
  daysSinceLastVisit: number | null;
  clientStatus: "active" | "at_risk" | "inactive" | "new";
  noShows: number;
  cancellations: number;
}

interface InactiveCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  daysSince: number;
  tier: "30" | "60" | "90";
  totalAppointments: number;
  lastVisit: string;
}

interface BirthdayCustomer {
  id: string;
  name: string;
  phone: string | null;
  day: number;
  age: number | null;
  totalAppointments: number;
}

type Tab = "all" | "inactive" | "birthdays";

const STATUS_CONFIG = {
  active: { label: "Ativo", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  at_risk: { label: "Em risco", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  inactive: { label: "Inativo", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  new: { label: "Novo", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

const MONTH_NAMES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// ── Componente Principal ──────────────────────────
export default function ClientesPage() {
  const { store } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  // Insights
  const [inactiveData, setInactiveData] = useState<{ total: number; tiers: Record<string, number>; customers: InactiveCustomer[] } | null>(null);
  const [birthdayData, setBirthdayData] = useState<{ currentMonth: { month: number; count: number; customers: BirthdayCustomer[] }; nextMonth: { month: number; count: number; customers: BirthdayCustomer[] } } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Detalhe
  const [detailCustomer, setDetailCustomer] = useState<(Customer & { insights: CustomerInsights }) | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

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

  const fetchInsights = useCallback(async (type: "inactive" | "birthdays") => {
    if (!store) return;
    setInsightsLoading(true);
    try {
      if (type === "inactive") {
        const data = await api.get<typeof inactiveData>(`/clientes/insights?storeId=${store.id}&type=inactive`);
        setInactiveData(data);
      } else {
        const data = await api.get<typeof birthdayData>(`/clientes/insights?storeId=${store.id}&type=birthdays`);
        setBirthdayData(data);
      }
    } catch {
      toast.error("Erro ao carregar insights");
    } finally {
      setInsightsLoading(false);
    }
  }, [store]);

  useEffect(() => {
    if (tab === "inactive" && !inactiveData) fetchInsights("inactive");
    if (tab === "birthdays" && !birthdayData) fetchInsights("birthdays");
  }, [tab, inactiveData, birthdayData, fetchInsights]);

  const openDetail = async (customerId: string) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const data = await api.get<Customer & { insights: CustomerInsights }>(`/clientes/${customerId}`);
      setDetailCustomer(data);
    } catch {
      toast.error("Erro ao carregar detalhes");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      reset({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        cpf: customer.cpf || "",
        birthDate: customer.birthDate ? customer.birthDate.split("T")[0] : "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        zipCode: customer.zipCode || "",
      });
    } else {
      setEditingCustomer(null);
      reset({ name: "", email: "", phone: "", cpf: "", birthDate: "", address: "", city: "", state: "", zipCode: "" });
    }
    setShowModal(true);
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (editingCustomer) {
        await api.put(`/clientes/${editingCustomer.id}`, { ...data, birthDate: data.birthDate || null });
        toast.success("Cliente atualizado!");
      } else {
        await api.post("/clientes", { ...data, birthDate: data.birthDate || null, storeId: store?.id });
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

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {([
          { key: "all" as Tab, label: "Todos", icon: User },
          { key: "inactive" as Tab, label: "Inativos", icon: AlertTriangle },
          { key: "birthdays" as Tab, label: "Aniversariantes", icon: Cake },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Todos */}
      {tab === "all" && (
        <>
          <div className="max-w-md">
            <Input
              placeholder="Buscar por nome, telefone, CPF ou email..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-border">
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Telefone</th>
                    <th className="pb-3 font-medium">Agendamentos</th>
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
                      <td className="py-3 font-medium">{c._count.appointments}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDetail(c.id)} className="p-2 rounded-lg hover:bg-background text-muted hover:text-primary transition-colors" title="Ver detalhes">
                            <Eye className="w-4 h-4" />
                          </button>
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
                    <tr><td colSpan={4} className="py-12 text-center text-muted">Nenhum cliente cadastrado ainda.</td></tr>
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
                  <button onClick={() => openDetail(c.id)} className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.email && <p className="text-xs text-muted">{c.email}</p>}
                    </div>
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => openModal(c)} className="p-1.5 rounded-lg hover:bg-background text-muted"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-background text-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted">
                  {c.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{formatPhone(c.phone)}</div>}
                  <p className="text-xs">{c._count.appointments} agendamentos</p>
                </div>
              </Card>
            ))}
            {customers.length === 0 && <p className="text-center text-muted py-8">Nenhum cliente cadastrado ainda.</p>}
          </div>
        </>
      )}

      {/* Tab: Inativos */}
      {tab === "inactive" && (
        insightsLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : !inactiveData || inactiveData.total === 0 ? (
          <Card className="!p-8 text-center">
            <Heart className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Todos os clientes estão ativos!</p>
            <p className="text-sm text-muted mt-1">Nenhum cliente há mais de 30 dias sem agendar.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 max-w-lg">
              <Card className="!p-3 text-center">
                <p className="text-2xl font-bold text-amber-500">{inactiveData.tiers["30"]}</p>
                <p className="text-xs text-muted">30-60 dias</p>
              </Card>
              <Card className="!p-3 text-center">
                <p className="text-2xl font-bold text-orange-500">{inactiveData.tiers["60"]}</p>
                <p className="text-xs text-muted">60-90 dias</p>
              </Card>
              <Card className="!p-3 text-center">
                <p className="text-2xl font-bold text-rose-500">{inactiveData.tiers["90"]}</p>
                <p className="text-xs text-muted">90+ dias</p>
              </Card>
            </div>

            <div className="space-y-2">
              {inactiveData.customers.map((c) => (
                <Card key={c!.id} className="!p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        c!.tier === "90" ? "bg-rose-500/10" : c!.tier === "60" ? "bg-orange-500/10" : "bg-amber-500/10"
                      }`}>
                        <AlertTriangle className={`w-5 h-5 ${
                          c!.tier === "90" ? "text-rose-500" : c!.tier === "60" ? "text-orange-500" : "text-amber-500"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c!.name}</p>
                        <p className="text-xs text-muted">
                          Última visita há <strong>{c!.daysSince} dias</strong> · {c!.totalAppointments} agendamentos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c!.phone && (
                        <a
                          href={`https://wa.me/55${c!.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                      )}
                      <button onClick={() => openDetail(c!.id)} className="p-2 rounded-lg hover:bg-background text-muted hover:text-primary">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )
      )}

      {/* Tab: Aniversariantes */}
      {tab === "birthdays" && (
        insightsLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : !birthdayData ? (
          <Card className="!p-8 text-center"><p className="text-muted">Erro ao carregar.</p></Card>
        ) : birthdayData.currentMonth.count === 0 && birthdayData.nextMonth.count === 0 ? (
          <Card className="!p-8 text-center">
            <Cake className="w-10 h-10 text-pink-400 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Nenhum aniversariante encontrado</p>
            <p className="text-sm text-muted mt-1">Cadastre a data de nascimento dos clientes para ver aqui.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {[
              { data: birthdayData.currentMonth, label: `Este mês (${MONTH_NAMES[birthdayData.currentMonth.month]})`, highlight: true },
              { data: birthdayData.nextMonth, label: `Próximo mês (${MONTH_NAMES[birthdayData.nextMonth.month]})`, highlight: false },
            ].filter(({ data }) => data.count > 0).map(({ data, label, highlight }) => (
              <div key={label}>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Cake className={`w-4 h-4 ${highlight ? "text-pink-500" : "text-muted"}`} />
                  {label}
                  <span className="text-xs text-muted font-normal">({data.count} cliente{data.count > 1 ? "s" : ""})</span>
                </h3>
                <div className="space-y-2">
                  {data.customers.map((c) => (
                    <Card key={c.id} className="!p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                            <Cake className="w-5 h-5 text-pink-500" />
                          </div>
                          <div>
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted">
                              Dia {c.day}{c.age ? ` · ${c.age} anos` : ""} · {c.totalAppointments} agendamentos
                            </p>
                          </div>
                        </div>
                        {c.phone && (
                          <a
                            href={`https://wa.me/55${c.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Parabenizar
                          </a>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal: Criar/Editar */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCustomer ? "Editar Cliente" : "Novo Cliente"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nome Completo *" placeholder="Nome do cliente" maxLength={100} error={errors.name?.message} {...register("name")} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="email@exemplo.com" maxLength={100} {...register("email")} />
            <Input
              label="Telefone"
              placeholder="(11) 99999-9999"
              maxLength={11}
              inputMode="numeric"
              {...register("phone", {
                onChange: (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 11); },
              })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="CPF"
              placeholder="00000000000"
              maxLength={11}
              inputMode="numeric"
              {...register("cpf", {
                onChange: (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 11); },
              })}
            />
            <Input
              label="Data de nascimento"
              type="date"
              {...register("birthDate")}
            />
          </div>
          <Input label="Endereço" placeholder="Rua, número, complemento" maxLength={200} {...register("address")} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Cidade" placeholder="São Paulo" maxLength={60} {...register("city")} />
            <Input label="Estado" placeholder="SP" maxLength={2} {...register("state", {
              onChange: (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2); },
            })} />
            <Input
              label="CEP"
              placeholder="00000000"
              maxLength={8}
              inputMode="numeric"
              {...register("zipCode", {
                onChange: (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 8); },
              })}
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="submit" className="flex-1">{editingCustomer ? "Salvar Alterações" : "Cadastrar Cliente"}</Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detalhe inteligente */}
      <Modal isOpen={showDetail} onClose={() => { setShowDetail(false); setDetailCustomer(null); }} title="Perfil do Cliente" size="lg">
        {detailLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : detailCustomer ? (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{detailCustomer.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_CONFIG[detailCustomer.insights.clientStatus].color}`}>
                    {STATUS_CONFIG[detailCustomer.insights.clientStatus].label}
                  </span>
                  {detailCustomer.phone && <span className="text-xs text-muted">{formatPhone(detailCustomer.phone)}</span>}
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <DollarSign className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{formatCurrency(detailCustomer.insights.totalSpent)}</p>
                <p className="text-[11px] text-muted">Total gasto</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <Calendar className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{detailCustomer.insights.totalVisits}</p>
                <p className="text-[11px] text-muted">Visitas</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <DollarSign className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{formatCurrency(detailCustomer.insights.avgTicket)}</p>
                <p className="text-[11px] text-muted">Ticket médio</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <Clock className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{detailCustomer.insights.avgFrequencyDays ?? "—"}</p>
                <p className="text-[11px] text-muted">Dias entre visitas</p>
              </div>
            </div>

            {/* Detalhes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {detailCustomer.insights.favoriteBarber && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                  <UserCog className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted">Barbeiro preferido</p>
                    <p className="font-medium">{detailCustomer.insights.favoriteBarber.name} <span className="text-muted font-normal">({detailCustomer.insights.favoriteBarber.count}x)</span></p>
                  </div>
                </div>
              )}
              {detailCustomer.insights.favoriteService && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                  <Scissors className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted">Serviço favorito</p>
                    <p className="font-medium">{detailCustomer.insights.favoriteService.name} <span className="text-muted font-normal">({detailCustomer.insights.favoriteService.count}x)</span></p>
                  </div>
                </div>
              )}
              {detailCustomer.insights.lastVisit && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                  <Clock className="w-4 h-4 text-muted shrink-0" />
                  <div>
                    <p className="text-xs text-muted">Última visita</p>
                    <p className="font-medium">
                      {new Date(detailCustomer.insights.lastVisit).toLocaleDateString("pt-BR")}
                      {detailCustomer.insights.daysSinceLastVisit !== null && (
                        <span className="text-muted font-normal"> ({detailCustomer.insights.daysSinceLastVisit} dias atrás)</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {(detailCustomer.insights.noShows > 0 || detailCustomer.insights.cancellations > 0) && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <p className="text-xs text-muted">Faltas / Cancelamentos</p>
                    <p className="font-medium">{detailCustomer.insights.noShows} no-show · {detailCustomer.insights.cancellations} cancelamento{detailCustomer.insights.cancellations !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Ação rápida */}
            {detailCustomer.phone && detailCustomer.insights.clientStatus !== "active" && (
              <a
                href={`https://wa.me/55${detailCustomer.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar mensagem no WhatsApp
              </a>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
