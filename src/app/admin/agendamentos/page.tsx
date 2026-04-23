"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Search,
  CalendarDays,
  Clock,
  User,
  Scissors,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  CircleDot,
  Play,
  BadgeCheck,
} from "lucide-react";
import toast from "react-hot-toast";

type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

type PaymentMethod = "CASH" | "PIX" | "CREDIT_CARD" | "DEBIT_CARD";

interface Barber {
  id: string;
  name: string;
  isActive: boolean;
}
interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
}
interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}
interface AppointmentService {
  id: string;
  price: number;
  durationMinutes: number;
  service: { id: string; name: string };
}
interface Appointment {
  id: string;
  code: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  total: number;
  discount: number;
  paid: boolean;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  customer: Customer;
  barber: { id: string; name: string };
  services: AppointmentService[];
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CONFIRMED: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  NO_SHOW: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Cartão Crédito",
  DEBIT_CARD: "Cartão Débito",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AgendamentosPage() {
  const { store } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  // filtros
  const [filterStatus, setFilterStatus] = useState<"" | AppointmentStatus>("");
  const [filterBarber, setFilterBarber] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [search, setSearch] = useState("");

  const fetchAppointments = useCallback(async () => {
    if (!store) return;
    try {
      const params = new URLSearchParams({ storeId: store.id });
      if (filterStatus) params.set("status", filterStatus);
      if (filterBarber) params.set("barberId", filterBarber);
      if (filterFrom) params.set("from", new Date(filterFrom).toISOString());
      if (filterTo) {
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        params.set("to", to.toISOString());
      }
      if (search) params.set("search", search);
      const data = await api.get<Appointment[]>(`/agendamentos?${params.toString()}`);
      setAppointments(data);
    } catch {
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setIsLoading(false);
    }
  }, [store, filterStatus, filterBarber, filterFrom, filterTo, search]);

  const fetchDeps = useCallback(async () => {
    if (!store) return;
    try {
      const [b, s, c] = await Promise.all([
        api.get<Barber[]>(`/barbeiros?storeId=${store.id}&onlyActive=true`),
        api.get<Service[]>(`/servicos?storeId=${store.id}&onlyActive=true`),
        api.get<Customer[]>(`/clientes?storeId=${store.id}`),
      ]);
      setBarbers(b);
      setServices(s);
      setCustomers(c);
    } catch {
      toast.error("Erro ao carregar dados auxiliares");
    }
  }, [store]);

  useEffect(() => {
    fetchDeps();
  }, [fetchDeps]);
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };
  const openEdit = (a: Appointment) => {
    setEditing(a);
    setShowModal(true);
  };

  const handleDelete = async (a: Appointment) => {
    const msg =
      a.status === "SCHEDULED"
        ? "Remover este agendamento? (ainda não confirmado)"
        : "Cancelar este agendamento? O histórico será preservado.";
    if (!confirm(msg)) return;
    try {
      await api.delete(`/agendamentos/${a.id}`);
      toast.success(a.status === "SCHEDULED" ? "Removido" : "Cancelado");
      fetchAppointments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  const advanceStatus = async (a: Appointment, next: AppointmentStatus) => {
    try {
      await api.put(`/agendamentos/${a.id}`, { status: next });
      toast.success(`Status: ${STATUS_LABEL[next]}`);
      fetchAppointments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const togglePaid = async (a: Appointment) => {
    try {
      await api.put(`/agendamentos/${a.id}`, { paid: !a.paid });
      toast.success(!a.paid ? "Marcado como pago" : "Marcado como não pago");
      fetchAppointments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm text-muted">
            {appointments.length} registro{appointments.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Novo agendamento
        </Button>
      </div>

      <Card className="!p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              className="pl-9"
              placeholder="Buscar por código ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AppointmentStatus | "")}
          >
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_LABEL) as AppointmentStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
            value={filterBarber}
            onChange={(e) => setFilterBarber(e.target.value)}
          >
            <option value="">Todos barbeiros</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              placeholder="De"
            />
            <Input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              placeholder="Até"
            />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-10 text-center text-muted">Carregando...</Card>
      ) : appointments.length === 0 ? (
        <Card className="p-10 text-center">
          <CalendarDays className="w-10 h-10 mx-auto text-muted mb-2" />
          <p className="text-muted">Nenhum agendamento encontrado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((a) => (
            <Card key={a.id} className="!p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted">{a.code}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLE[a.status]}`}
                    >
                      {STATUS_LABEL[a.status]}
                    </span>
                    {a.paid && (
                      <span className="px-2 py-0.5 rounded-full text-xs border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3" /> Pago
                        {a.paymentMethod ? ` · ${PAYMENT_LABEL[a.paymentMethod]}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-muted" /> {a.customer.name}
                    </span>
                    <span className="flex items-center gap-1 text-muted">
                      <Scissors className="w-3.5 h-3.5" /> {a.barber.name}
                    </span>
                    <span className="flex items-center gap-1 text-muted">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {formatDateTime(a.startAt)} → {formatTime(a.endAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    {a.services.map((s) => s.service.name).join(" + ")}
                    {a.discount > 0 && ` · desconto ${formatCurrency(a.discount)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground">{formatCurrency(a.total)}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                {a.status === "SCHEDULED" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => advanceStatus(a, "CONFIRMED")}
                    className="gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                  </Button>
                )}
                {(a.status === "SCHEDULED" || a.status === "CONFIRMED") && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => advanceStatus(a, "IN_PROGRESS")}
                    className="gap-1"
                  >
                    <Play className="w-3.5 h-3.5" /> Iniciar
                  </Button>
                )}
                {a.status === "IN_PROGRESS" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => advanceStatus(a, "COMPLETED")}
                    className="gap-1"
                  >
                    <CircleDot className="w-3.5 h-3.5" /> Concluir
                  </Button>
                )}
                {["SCHEDULED", "CONFIRMED"].includes(a.status) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => advanceStatus(a, "NO_SHOW")}
                    className="gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Não compareceu
                  </Button>
                )}
                {a.status !== "CANCELLED" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => togglePaid(a)}
                    className="gap-1"
                  >
                    <BadgeCheck className="w-3.5 h-3.5" /> {a.paid ? "Desmarcar pago" : "Marcar pago"}
                  </Button>
                )}
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-2 rounded-lg hover:bg-background text-muted hover:text-primary transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className="p-2 rounded-lg hover:bg-background text-muted hover:text-danger transition-colors"
                    title={a.status === "SCHEDULED" ? "Remover" : "Cancelar"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <AppointmentModal
          storeId={store!.id}
          existing={editing}
          barbers={barbers}
          services={services}
          customers={customers}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------ Modal CRUD ------------------------ */

function AppointmentModal({
  storeId,
  existing,
  barbers,
  services,
  customers,
  onClose,
  onSaved,
}: {
  storeId: string;
  existing: Appointment | null;
  barbers: Barber[];
  services: Service[];
  customers: Customer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customerId, setCustomerId] = useState(existing?.customer.id ?? "");
  const [barberId, setBarberId] = useState(existing?.barber.id ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    existing?.services.map((s) => s.service.id) ?? [],
  );
  const [discount, setDiscount] = useState(existing?.discount.toString() ?? "0");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [date, setDate] = useState(
    existing
      ? toLocalInputValue(new Date(existing.startAt)).split("T")[0]
      : toLocalInputValue(new Date()).split("T")[0],
  );
  const [selectedSlot, setSelectedSlot] = useState(
    existing ? toLocalInputValue(new Date(existing.startAt)).split("T")[1] : "",
  );
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalDuration = useMemo(
    () =>
      services
        .filter((s) => selectedServiceIds.includes(s.id))
        .reduce((acc, s) => acc + s.durationMinutes, 0),
    [services, selectedServiceIds],
  );

  const subtotal = useMemo(
    () =>
      services
        .filter((s) => selectedServiceIds.includes(s.id))
        .reduce((acc, s) => acc + s.price, 0),
    [services, selectedServiceIds],
  );

  const total = Math.max(0, subtotal - Number(discount || 0));

  const loadSlots = useCallback(async () => {
    if (!barberId || !date || selectedServiceIds.length === 0) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const params = new URLSearchParams({
        barberId,
        date,
        serviceIds: selectedServiceIds.join(","),
      });
      const res = await api.get<{ slots: string[] }>(
        `/agendamentos/disponibilidade?${params.toString()}`,
      );
      setSlots(res.slots);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar horários");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [barberId, date, selectedServiceIds]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submit = async () => {
    if (!customerId) return toast.error("Selecione o cliente");
    if (!barberId) return toast.error("Selecione o barbeiro");
    if (selectedServiceIds.length === 0) return toast.error("Selecione ao menos um serviço");
    if (!selectedSlot) return toast.error("Selecione um horário");

    const startAt = new Date(`${date}T${selectedSlot}`);
    setSubmitting(true);
    try {
      if (existing) {
        await api.put(`/agendamentos/${existing.id}`, {
          barberId,
          startAt: startAt.toISOString(),
          serviceIds: selectedServiceIds,
          discount: Number(discount || 0),
          notes: notes || null,
        });
        toast.success("Agendamento atualizado");
      } else {
        await api.post(`/agendamentos`, {
          storeId,
          customerId,
          barberId,
          startAt: startAt.toISOString(),
          serviceIds: selectedServiceIds,
          discount: Number(discount || 0),
          notes: notes || undefined,
          source: "ADMIN",
        });
        toast.success("Agendamento criado");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={existing ? `Editar: ${existing.code}` : "Novo agendamento"}
      size="xl"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Cliente</label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={!!existing}
            >
              <option value="">Selecione...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `· ${c.phone}` : ""}
                </option>
              ))}
            </select>
            {existing && (
              <p className="text-[11px] text-muted mt-1">Cliente não pode ser alterado.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Barbeiro</label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted block mb-2">Serviços</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
            {services.map((s) => {
              const selected = selectedServiceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{s.name}</span>
                    <span className="text-sm">{formatCurrency(s.price)}</span>
                  </div>
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {s.durationMinutes} min
                  </p>
                </button>
              );
            })}
          </div>
          {selectedServiceIds.length > 0 && (
            <p className="text-xs text-muted mt-2">
              Duração total: <strong>{totalDuration} min</strong> · Subtotal:{" "}
              <strong>{formatCurrency(subtotal)}</strong>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Data</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted block mb-1">Desconto (R$)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted block mb-2">Horários disponíveis</label>
          {!barberId || selectedServiceIds.length === 0 ? (
            <p className="text-sm text-muted">Selecione barbeiro e serviços para ver horários.</p>
          ) : loadingSlots ? (
            <p className="text-sm text-muted">Carregando...</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted">Sem horários disponíveis neste dia.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    selectedSlot === slot
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted block mb-1">Observações</label>
          <textarea
            className="w-full min-h-[70px] px-3 py-2 rounded-lg border border-border bg-background text-sm"
            value={notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferências, alergias, observações..."
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted">Total</p>
            <p className="text-xl font-bold">{formatCurrency(total)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Salvando..." : existing ? "Salvar" : "Agendar"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
