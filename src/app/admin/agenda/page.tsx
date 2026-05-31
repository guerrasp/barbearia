"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Calendar, Scissors } from "lucide-react";
import toast from "react-hot-toast";

type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

interface Barber {
  id: string;
  name: string;
  isActive: boolean;
  workingHours: { weekday: number; startTime: string; endTime: string }[];
  timeBlocks: { startAt: string; endAt: string; reason: string | null }[];
}
interface Appointment {
  id: string;
  code: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  customer: { id: string; name: string };
  barber: { id: string; name: string };
  services: { id: string; service: { id: string; name: string } }[];
}

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-500/20 border-blue-500 text-blue-100",
  CONFIRMED: "bg-indigo-500/20 border-indigo-500 text-indigo-100",
  IN_PROGRESS: "bg-amber-500/20 border-amber-500 text-amber-100",
  COMPLETED: "bg-emerald-500/20 border-emerald-500 text-emerald-100",
  CANCELLED: "bg-rose-500/20 border-rose-500 text-rose-100 opacity-60",
  NO_SHOW: "bg-neutral-500/20 border-neutral-500 text-neutral-100 opacity-60",
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 1.2;

function toDateInput(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hhmmToMin(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function minToHhmm(m: number) {
  const h = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}

export default function AgendaPage() {
  const { store, user } = useAuth();
  const [date, setDate] = useState(() => new Date());
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const dayStart = useMemo(
    () => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
    [date],
  );
  const dayEnd = useMemo(
    () => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999),
    [date],
  );

  const fetchAll = useCallback(async () => {
    if (!store) return;
    setIsLoading(true);
    try {
      // Se for barbeiro, filtra apenas sua agenda
      const barberFilter = user?.role === "BARBER" && user.barberId
        ? `&barberId=${user.barberId}` : "";
      const [bs, as] = await Promise.all([
        api.get<Barber[]>(`/barbeiros?storeId=${store.id}&onlyActive=true`),
        api.get<Appointment[]>(
          `/agendamentos?storeId=${store.id}&from=${dayStart.toISOString()}&to=${dayEnd.toISOString()}${barberFilter}`,
        ),
      ]);
      // Se for barbeiro, mostra apenas sua coluna
      const filteredBarbers = user?.role === "BARBER" && user.barberId
        ? bs.filter((b) => b.id === user.barberId) : bs;
      const full = await Promise.all(
        filteredBarbers.map(async (b) => {
          try {
            return await api.get<Barber>(`/barbeiros/${b.id}`);
          } catch {
            return { ...b, workingHours: [], timeBlocks: [] };
          }
        }),
      );
      setBarbers(full);
      setAppointments(as);
    } catch {
      toast.error("Erro ao carregar agenda");
    } finally {
      setIsLoading(false);
    }
  }, [store, user, dayStart, dayEnd]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const weekday = date.getDay();

  const { windowStart, windowEnd } = useMemo(() => {
    let min = 24 * 60;
    let max = 0;
    for (const b of barbers) {
      for (const wh of b.workingHours.filter((h) => h.weekday === weekday)) {
        min = Math.min(min, hhmmToMin(wh.startTime));
        max = Math.max(max, hhmmToMin(wh.endTime));
      }
    }
    if (min >= max) return { windowStart: 8 * 60, windowEnd: 19 * 60 };
    min = Math.floor(min / SLOT_MINUTES) * SLOT_MINUTES;
    max = Math.ceil(max / SLOT_MINUTES) * SLOT_MINUTES;
    return { windowStart: min, windowEnd: max };
  }, [barbers, weekday]);

  const slots: number[] = [];
  for (let t = windowStart; t <= windowEnd; t += SLOT_MINUTES) slots.push(t);

  const windowHeightPx = (windowEnd - windowStart) * PX_PER_MINUTE;

  const appointmentsByBarber = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const arr = map[a.barber.id] ?? [];
      arr.push(a);
      map[a.barber.id] = arr;
    }
    return map;
  }, [appointments]);

  const blocksByBarber = useMemo(() => {
    const map: Record<string, Barber["timeBlocks"]> = {};
    for (const b of barbers) {
      map[b.id] = b.timeBlocks.filter((tb) => {
        const s = new Date(tb.startAt);
        const e = new Date(tb.endAt);
        return s < dayEnd && e > dayStart;
      });
    }
    return map;
  }, [barbers, dayStart, dayEnd]);

  const navigateDay = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted">
            Visão do dia por barbeiro. {appointments.length} agendamento
            {appointments.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigateDay(-1)} className="!px-2">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <input
            type="date"
            value={toDateInput(date)}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split("-").map(Number);
              setDate(new Date(y, m - 1, d));
            }}
            className="h-9 px-3 rounded-lg border border-border bg-background text-sm"
          />
          <Button variant="secondary" size="sm" onClick={() => navigateDay(1)} className="!px-2">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDate(new Date())}>
            Hoje
          </Button>
        </div>
      </div>

      <Card className="!p-3">
        <p className="text-sm font-medium text-foreground">
          {WEEKDAY_NAMES[weekday]},{" "}
          {date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>
      </Card>

      {isLoading ? (
        <Card className="p-10 text-center text-muted">Carregando...</Card>
      ) : barbers.length === 0 ? (
        <Card className="p-10 text-center">
          <Scissors className="w-10 h-10 mx-auto text-muted mb-2" />
          <p className="text-muted">Nenhum barbeiro ativo.</p>
        </Card>
      ) : (
        <Card className="!p-0 overflow-x-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `64px repeat(${barbers.length}, minmax(180px, 1fr))`,
            }}
          >
            <div className="sticky top-0 z-10 bg-card border-b border-border p-2 text-xs text-muted">
              Hora
            </div>
            {barbers.map((b) => (
              <div
                key={b.id}
                className="sticky top-0 z-10 bg-card border-b border-l border-border p-2"
              >
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="text-[11px] text-muted">
                  {b.workingHours
                    .filter((wh) => wh.weekday === weekday)
                    .map((wh) => `${wh.startTime}–${wh.endTime}`)
                    .join(" · ") || "Folga"}
                </p>
              </div>
            ))}

            <div className="relative border-r border-border" style={{ height: windowHeightPx }}>
              {slots.map((t) => (
                <div
                  key={t}
                  className="absolute left-0 right-0 text-[11px] text-muted pr-1 text-right"
                  style={{ top: (t - windowStart) * PX_PER_MINUTE }}
                >
                  {t % 60 === 0 ? minToHhmm(t) : ""}
                </div>
              ))}
            </div>

            {barbers.map((b) => {
              const workingToday = b.workingHours.filter((wh) => wh.weekday === weekday);
              const appts = appointmentsByBarber[b.id] ?? [];
              const blocks = blocksByBarber[b.id] ?? [];
              const segments: Array<[number, number]> = [];
              {
                let prev = windowStart;
                const sorted = [...workingToday].sort(
                  (a, z) => hhmmToMin(a.startTime) - hhmmToMin(z.startTime),
                );
                for (const wh of sorted) {
                  const s = hhmmToMin(wh.startTime);
                  const e = hhmmToMin(wh.endTime);
                  if (s > prev) segments.push([prev, s]);
                  prev = Math.max(prev, e);
                }
                if (prev < windowEnd) segments.push([prev, windowEnd]);
              }
              return (
                <div
                  key={b.id}
                  className="relative border-l border-border"
                  style={{ height: windowHeightPx }}
                >
                  {slots.map((t) => (
                    <div
                      key={t}
                      className={`absolute left-0 right-0 border-t ${
                        t % 60 === 0 ? "border-border" : "border-border/40"
                      }`}
                      style={{ top: (t - windowStart) * PX_PER_MINUTE, height: 0 }}
                    />
                  ))}
                  {segments.map(([s, e], i) => (
                    <div
                      key={`seg-${i}`}
                      className="absolute left-0 right-0 bg-background/50"
                      style={{
                        top: (s - windowStart) * PX_PER_MINUTE,
                        height: (e - s) * PX_PER_MINUTE,
                      }}
                      title="Fora do expediente"
                    />
                  ))}
                  {blocks.map((tb, i) => {
                    const s = new Date(tb.startAt);
                    const e = new Date(tb.endAt);
                    const sMin = Math.max(
                      windowStart,
                      s > dayStart ? s.getHours() * 60 + s.getMinutes() : windowStart,
                    );
                    const eMin = Math.min(
                      windowEnd,
                      e < dayEnd ? e.getHours() * 60 + e.getMinutes() : windowEnd,
                    );
                    if (eMin <= sMin) return null;
                    return (
                      <div
                        key={`tb-${i}`}
                        className="absolute left-1 right-1 rounded bg-rose-500/10 border border-rose-500/40 text-rose-200 text-[11px] p-1 pointer-events-none"
                        style={{
                          top: (sMin - windowStart) * PX_PER_MINUTE,
                          height: (eMin - sMin) * PX_PER_MINUTE,
                        }}
                      >
                        <p className="font-medium truncate">🚫 {tb.reason || "Bloqueio"}</p>
                      </div>
                    );
                  })}
                  {appts.map((a) => {
                    const s = new Date(a.startAt);
                    const e = new Date(a.endAt);
                    const sMin = s.getHours() * 60 + s.getMinutes();
                    const eMin = e.getHours() * 60 + e.getMinutes();
                    const top = (sMin - windowStart) * PX_PER_MINUTE;
                    const height = Math.max(22, (eMin - sMin) * PX_PER_MINUTE);
                    return (
                      <a
                        key={a.id}
                        href={`/admin/agendamentos`}
                        className={`absolute left-1 right-1 rounded border-l-4 px-1.5 py-1 text-[11px] shadow-sm hover:shadow-md transition ${STATUS_STYLE[a.status]}`}
                        style={{ top, height }}
                        title={`${STATUS_LABEL[a.status]} · ${a.code}`}
                      >
                        <p className="font-semibold truncate">
                          {s.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          {a.customer.name}
                        </p>
                        <p className="truncate opacity-90">
                          {a.services.map((x) => x.service.name).join(", ")}
                        </p>
                      </a>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="!p-3">
        <p className="text-xs font-medium text-muted mb-2 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" /> Legenda
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_STYLE) as AppointmentStatus[]).map((s) => (
            <span key={s} className={`px-2 py-0.5 rounded text-[11px] border ${STATUS_STYLE[s]}`}>
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
