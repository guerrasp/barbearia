"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCog,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarX,
  X as XIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const barberSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  bio: z.string().optional(),
  specialties: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

type BarberFormInput = z.input<typeof barberSchema>;
type BarberFormData = z.output<typeof barberSchema>;

interface Barber {
  id: string;
  name: string;
  bio: string | null;
  photo: string | null;
  specialties: string | null;
  commissionRate: number;
  isActive: boolean;
  userId: string | null;
  _count: { appointments: number; workingHours: number; timeBlocks: number };
}

interface WorkingHour {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

interface TimeBlock {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function BarbeirosPage() {
  const { store } = useAuth();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [tab, setTab] = useState<"data" | "hours" | "blocks">("data");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BarberFormInput, unknown, BarberFormData>({
    resolver: zodResolver(barberSchema),
  });

  const fetchBarbers = useCallback(async () => {
    if (!store) return;
    try {
      const data = await api.get<Barber[]>(
        `/barbeiros?storeId=${store.id}&search=${encodeURIComponent(search)}`,
      );
      setBarbers(data);
    } catch {
      toast.error("Erro ao carregar barbeiros");
    } finally {
      setIsLoading(false);
    }
  }, [store, search]);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  const openModal = (barber?: Barber) => {
    if (barber) {
      setEditing(barber);
      reset({
        name: barber.name,
        bio: barber.bio || "",
        specialties: barber.specialties || "",
        commissionRate: barber.commissionRate,
        isActive: barber.isActive,
      });
    } else {
      setEditing(null);
      reset({ name: "", bio: "", specialties: "", commissionRate: 0, isActive: true });
    }
    setTab("data");
    setShowModal(true);
  };

  const onSubmit = async (data: BarberFormData) => {
    try {
      if (editing) {
        await api.put(`/barbeiros/${editing.id}`, data);
        toast.success("Barbeiro atualizado!");
      } else {
        await api.post("/barbeiros", { ...data, storeId: store?.id });
        toast.success("Barbeiro cadastrado!");
      }
      setShowModal(false);
      fetchBarbers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    }
  };

  const toggleActive = async (barber: Barber) => {
    try {
      await api.put(`/barbeiros/${barber.id}`, { isActive: !barber.isActive });
      fetchBarbers();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleDelete = async (barber: Barber) => {
    if (!confirm(`Excluir o barbeiro "${barber.name}"?`)) return;
    try {
      const res = await api.delete<{ message: string }>(`/barbeiros/${barber.id}`);
      toast.success(res.message || "Barbeiro removido!");
      fetchBarbers();
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

  const activeCount = barbers.filter((b) => b.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Barbeiros</h1>
          <p className="text-muted text-sm mt-1">
            {barbers.length} cadastrados · {activeCount} ativos
          </p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4" /> Novo Barbeiro
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {barbers.map((b) => (
          <Card key={b.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserCog className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{b.name}</p>
                    {b.specialties && (
                      <p className="text-xs text-muted line-clamp-1">{b.specialties}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleActive(b)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      b.isActive
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {b.isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Ativo
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" /> Inativo
                      </>
                    )}
                  </button>
                </div>
                {b.bio && <p className="mt-2 text-sm text-muted line-clamp-2">{b.bio}</p>}
                <div className="mt-3 flex items-center gap-3 text-xs text-muted">
                  <span>Comissão: {b.commissionRate}%</span>
                  <span>·</span>
                  <span>{b._count.appointments} agendamentos</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => openModal(b)}
              >
                <Edit2 className="w-4 h-4" /> Editar
              </Button>
              <button
                onClick={() => handleDelete(b)}
                className="p-2 rounded-lg hover:bg-background text-muted hover:text-danger transition-colors"
                aria-label="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
        {barbers.length === 0 && (
          <p className="col-span-full text-center text-muted py-10">
            Nenhum barbeiro cadastrado ainda.
          </p>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Editar: ${editing.name}` : "Novo Barbeiro"}
        size="lg"
      >
        {editing && (
          <div className="flex gap-1 border-b border-border mb-4">
            {[
              { key: "data" as const, label: "Dados" },
              { key: "hours" as const, label: "Horários" },
              { key: "blocks" as const, label: "Bloqueios" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {(tab === "data" || !editing) && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Foto do barbeiro — só pra barbeiros já criados */}
            {editing && store && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Foto
                </label>
                <ImageUpload
                  value={editing.photo}
                  onChange={(url) => {
                    setEditing({ ...editing, photo: url });
                    fetchBarbers();
                  }}
                  kind="barber"
                  storeId={store.id}
                  barberId={editing.id}
                  aspect="square"
                  hint="Quadrada · até 5 MB"
                  onRemove={async () => {
                    await api.put(`/barbeiros/${editing.id}`, { photo: null });
                    setEditing({ ...editing, photo: null });
                    fetchBarbers();
                    toast.success("Foto removida");
                  }}
                />
              </div>
            )}

            <Input
              label="Nome *"
              placeholder="Ex.: João Silva"
              maxLength={80}
              error={errors.name?.message}
              {...register("name")}
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Bio</label>
              <textarea
                placeholder="Pequena descrição que aparecerá no portal de agendamento"
                maxLength={300}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                {...register("bio")}
              />
            </div>
            <Input
              label="Especialidades"
              placeholder="Ex.: Degradê, Navalhado, Barba"
              maxLength={200}
              {...register("specialties")}
            />
            <Input
              label="Comissão (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="40"
              error={errors.commissionRate?.message}
              {...register("commissionRate")}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("isActive")} defaultChecked={!editing} />
              Barbeiro ativo (visível no portal de agendamento)
            </label>
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {editing ? "Salvar Alterações" : "Cadastrar Barbeiro"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}

        {editing && tab === "hours" && (
          <WorkingHoursEditor
            barberId={editing.id}
            onSaved={fetchBarbers}
          />
        )}

        {editing && tab === "blocks" && (
          <TimeBlocksEditor barberId={editing.id} onSaved={fetchBarbers} />
        )}
      </Modal>
    </div>
  );
}

// ==================== HORÁRIOS DE TRABALHO ====================

function WorkingHoursEditor({ barberId, onSaved }: { barberId: string; onSaved: () => void }) {
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<WorkingHour[]>(`/barbeiros/${barberId}/horarios`)
      .then((data) => {
        if (!cancelled) setHours(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [barberId]);

  const addBlock = (weekday: number) => {
    setHours((h) => [
      ...h,
      { id: `tmp-${Date.now()}-${Math.random()}`, weekday, startTime: "09:00", endTime: "12:00" },
    ]);
  };

  const removeBlock = (id: string) => {
    setHours((h) => h.filter((b) => b.id !== id));
  };

  const updateBlock = (id: string, field: "startTime" | "endTime", value: string) => {
    setHours((h) => h.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const save = async () => {
    setIsSaving(true);
    try {
      // Valida localmente: endTime > startTime
      for (const b of hours) {
        if (b.endTime <= b.startTime) {
          toast.error(`Hora final deve ser maior que inicial (${WEEKDAYS[b.weekday]})`);
          setIsSaving(false);
          return;
        }
      }
      await api.put(`/barbeiros/${barberId}/horarios`, {
        blocks: hours.map((b) => ({
          weekday: b.weekday,
          startTime: b.startTime,
          endTime: b.endTime,
        })),
      });
      toast.success("Horários salvos!");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-muted text-sm py-4">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Defina os blocos de atendimento por dia da semana. Ex.: manhã (09:00-12:00) e tarde
        (13:00-18:00). Dias sem blocos = folga.
      </p>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {WEEKDAYS.map((label, wd) => {
          const dayBlocks = hours.filter((h) => h.weekday === wd);
          return (
            <div key={wd} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{label}</span>
                <button
                  type="button"
                  onClick={() => addBlock(wd)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> adicionar
                </button>
              </div>
              {dayBlocks.length === 0 ? (
                <p className="text-xs text-muted italic">Folga</p>
              ) : (
                <div className="space-y-2">
                  {dayBlocks.map((b) => (
                    <div key={b.id} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={b.startTime}
                        onChange={(e) => updateBlock(b.id, "startTime", e.target.value)}
                        className="px-2 py-1 rounded border border-border bg-card text-sm"
                      />
                      <span className="text-muted">até</span>
                      <input
                        type="time"
                        value={b.endTime}
                        onChange={(e) => updateBlock(b.id, "endTime", e.target.value)}
                        className="px-2 py-1 rounded border border-border bg-card text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeBlock(b.id)}
                        className="ml-auto p-1 rounded hover:bg-background text-muted hover:text-danger"
                        aria-label="Remover bloco"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button type="button" onClick={save} className="flex-1" disabled={isSaving}>
          <Clock className="w-4 h-4" /> Salvar horários
        </Button>
      </div>
    </div>
  );
}

// ==================== BLOQUEIOS PONTUAIS ====================

function TimeBlocksEditor({ barberId, onSaved }: { barberId: string; onSaved: () => void }) {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<TimeBlock[]>(`/barbeiros/${barberId}/bloqueios`);
      setBlocks(data);
    } finally {
      setIsLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!startAt || !endAt) {
      toast.error("Informe início e fim");
      return;
    }
    setIsSaving(true);
    try {
      await api.post(`/barbeiros/${barberId}/bloqueios`, {
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        reason,
      });
      toast.success("Bloqueio criado!");
      setStartAt("");
      setEndAt("");
      setReason("");
      await load();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar bloqueio");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (blockId: string) => {
    if (!confirm("Remover este bloqueio?")) return;
    try {
      await api.delete(`/barbeiros/${barberId}/bloqueios/${blockId}`);
      toast.success("Bloqueio removido");
      await load();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Bloqueios pontuais (férias, folgas, compromissos). Nesses períodos o barbeiro não recebe
        agendamentos.
      </p>

      <div className="border border-border rounded-lg p-3 space-y-3">
        <p className="text-sm font-medium">Novo bloqueio</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1">Início</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-border bg-card text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Fim</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-border bg-card text-sm"
            />
          </div>
        </div>
        <Input
          label="Motivo (opcional)"
          placeholder="Ex.: Férias, compromisso pessoal..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button type="button" onClick={create} disabled={isSaving}>
          <Plus className="w-4 h-4" /> Adicionar bloqueio
        </Button>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Bloqueios cadastrados</p>
        {isLoading ? (
          <p className="text-muted text-sm">Carregando...</p>
        ) : blocks.length === 0 ? (
          <p className="text-muted text-sm italic">Nenhum bloqueio.</p>
        ) : (
          <div className="space-y-2 max-h-[30vh] overflow-y-auto">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="flex items-start gap-3 p-3 border border-border rounded-lg"
              >
                <CalendarX className="w-4 h-4 text-muted mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {fmt(b.startAt)} → {fmt(b.endAt)}
                  </p>
                  {b.reason && <p className="text-xs text-muted mt-0.5">{b.reason}</p>}
                </div>
                <button
                  onClick={() => remove(b.id)}
                  className="p-1 rounded hover:bg-background text-muted hover:text-danger"
                  aria-label="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
