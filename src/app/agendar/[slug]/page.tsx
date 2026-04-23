"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import Button from "@/components/ui/Button";
import {
  Scissors,
  Clock,
  CalendarDays,
  User,
  Phone,
  Mail,
  CheckCircle2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
  category: { id: string; name: string } | null;
}
interface Barber {
  id: string;
  name: string;
  bio: string | null;
  photo: string | null;
  specialties: string | null;
}
interface Store {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface Confirmation {
  id: string;
  code: string;
  startAt: string;
  endAt: string;
  barber: { name: string };
  services: { service: { name: string }; price: number }[];
  total: number;
}

function toDateInput(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    fetch(`/api/public/${slug}`)
      .then(async (r) => {
        if (!r.ok) {
          const e = await r.json();
          throw new Error(e.error || "Erro");
        }
        return r.json();
      })
      .then((data) => {
        setStore(data.store);
        setBarbers(data.barbers);
        setServices(data.services);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"))
      .finally(() => setLoading(false));
  }, [slug]);

  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(s.id)),
    [services, selectedServiceIds],
  );
  const totalDuration = selectedServices.reduce((s, sv) => s + sv.durationMinutes, 0);
  const subtotal = selectedServices.reduce((s, sv) => s + sv.price, 0);

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
      const r = await fetch(`/api/public/${slug}/disponibilidade?${params}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro");
      setSlots(data.slots);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar horários");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [barberId, date, selectedServiceIds, slug]);

  useEffect(() => {
    if (step === 3) loadSlots();
  }, [step, loadSlots]);

  const toggleService = (id: string) =>
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const canNext = () => {
    if (step === 1) return selectedServiceIds.length > 0;
    if (step === 2) return !!barberId;
    if (step === 3) return !!slot;
    if (step === 4) return name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 8;
    return false;
  };

  const submit = async () => {
    if (!slot) return;
    setSubmitting(true);
    try {
      const startAt = new Date(`${date}T${slot}`);
      const r = await fetch(`/api/public/${slug}/agendamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId,
          serviceIds: selectedServiceIds,
          startAt: startAt.toISOString(),
          customer: { name, phone, email: email || undefined },
          notes: notes || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Erro");
      setConfirmation(data);
      setStep(5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao agendar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="korta-surface min-h-screen bg-korta-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-korta-gold animate-spin" />
      </div>
    );
  }
  if (error || !store) {
    return (
      <div className="korta-surface min-h-screen bg-korta-bg flex items-center justify-center p-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white max-w-md">
          <p className="text-lg font-semibold mb-2">Ops</p>
          <p className="text-sm text-zinc-400">{error || "Barbearia não encontrada."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="korta-surface relative min-h-screen bg-korta-bg py-8 px-4 overflow-hidden">
      {/* Decor */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-korta-bg via-korta-bg to-[#060b1a]" />
      <div className="pointer-events-none absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-korta-gold/10 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-15%] w-[400px] h-[400px] bg-korta-surface/60 rounded-full blur-[100px]" />
      <Toaster position="top-right" />
      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-korta-gold/10 border border-korta-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Scissors className="w-7 h-7 text-korta-gold" />
          </div>
          <h1 className="text-2xl font-bold text-korta-text">{store.name}</h1>
          {store.address && (
            <p className="text-zinc-400 text-xs flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              {store.address}
            </p>
          )}
        </div>

        {/* Stepper */}
        {step < 5 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  step >= n ? "bg-korta-gold" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        )}

        <div className="bg-korta-surface/70 backdrop-blur-xl rounded-2xl border border-white/5 p-5 md:p-6 shadow-2xl shadow-black/40">
          {step === 1 && (
            <Step title="Escolha os serviços" subtitle="Pode marcar mais de um">
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {services.map((s) => {
                  const selected = selectedServiceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleService(s.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selected
                          ? "border-korta-gold bg-korta-gold/10"
                          : "border-white/10 hover:border-white/30 bg-white/[.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-white">{s.name}</p>
                          {s.description && (
                            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                              {s.description}
                            </p>
                          )}
                          <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {s.durationMinutes} min
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-korta-gold">
                            {formatCurrency(s.price)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedServiceIds.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-korta-gold/10 border border-korta-gold/20 text-sm text-korta-gold-soft flex items-center justify-between">
                  <span>
                    {selectedServices.length} serviço
                    {selectedServices.length === 1 ? "" : "s"} · {totalDuration} min
                  </span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
              )}
            </Step>
          )}

          {step === 2 && (
            <Step title="Escolha o barbeiro" subtitle="Quem vai te atender?">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {barbers.map((b) => {
                  const selected = b.id === barberId;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setBarberId(b.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selected
                          ? "border-korta-gold bg-korta-gold/10"
                          : "border-white/10 hover:border-white/30 bg-white/[.02]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                          {b.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={b.photo}
                              alt={b.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-zinc-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white">{b.name}</p>
                          {b.specialties && (
                            <p className="text-xs text-zinc-400 truncate">{b.specialties}</p>
                          )}
                        </div>
                      </div>
                      {b.bio && (
                        <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{b.bio}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="Data e horário" subtitle="Selecione um horário livre">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSlot("");
                  }}
                  min={toDateInput(new Date())}
                  className="h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-white text-sm flex-1"
                />
              </div>
              {loadingSlots ? (
                <div className="text-center py-8 text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-center text-zinc-400 py-8 text-sm">
                  Sem horários disponíveis neste dia. Tente outra data.
                </p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlot(s)}
                      className={`py-2 rounded-lg border text-sm transition-colors ${
                        slot === s
                          ? "border-korta-gold bg-korta-gold text-korta-bg font-semibold"
                          : "border-white/10 text-white hover:border-white/40"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </Step>
          )}

          {step === 4 && (
            <Step title="Seus dados" subtitle="Só pra confirmarmos o agendamento">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Nome completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Como prefere ser chamado"
                      required
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-zinc-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      required
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-zinc-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Email (opcional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@email.com"
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-zinc-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder:text-zinc-500"
                    placeholder="Alguma preferência?"
                  />
                </div>

                {/* Resumo */}
                <div className="mt-5 p-4 rounded-xl bg-korta-gold/5 border border-korta-gold/20 space-y-1 text-sm">
                  <p className="text-korta-gold font-semibold">Resumo</p>
                  <p className="text-white">{selectedServices.map((s) => s.name).join(" + ")}</p>
                  <p className="text-zinc-400 text-xs">
                    Com {barbers.find((b) => b.id === barberId)?.name} · {totalDuration} min
                  </p>
                  <p className="text-zinc-400 text-xs flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {new Date(`${date}T${slot}`).toLocaleString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-korta-gold font-bold text-base pt-1">
                    {formatCurrency(subtotal)}
                  </p>
                </div>
              </div>
            </Step>
          )}

          {step === 5 && confirmation && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Agendamento confirmado!</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Código: <span className="font-mono text-korta-gold-soft">{confirmation.code}</span>
              </p>
              <div className="mt-5 p-4 rounded-xl bg-white/5 border border-white/10 text-left space-y-2 text-sm">
                <p className="text-white font-semibold">
                  {confirmation.services.map((s) => s.service.name).join(" + ")}
                </p>
                <p className="text-zinc-400 text-xs">
                  Com {confirmation.barber.name}
                </p>
                <p className="text-zinc-300 text-sm flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-korta-gold" />
                  {new Date(confirmation.startAt).toLocaleString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-korta-gold font-bold text-lg pt-1">
                  {formatCurrency(confirmation.total)}
                </p>
              </div>
              <p className="text-xs text-zinc-500 mt-4">
                Guarde o código. Em caso de dúvida entre em contato com a barbearia.
              </p>
              <Button
                onClick={() => {
                  setConfirmation(null);
                  setSelectedServiceIds([]);
                  setBarberId("");
                  setSlot("");
                  setName("");
                  setPhone("");
                  setEmail("");
                  setNotes("");
                  setStep(1);
                }}
                className="mt-6 !bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
              >
                Novo agendamento
              </Button>
            </div>
          )}

          {/* Footer de navegação */}
          {step < 5 && (
            <div className="mt-6 flex items-center justify-between gap-2">
              <button
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as typeof step) : s))}
                disabled={step === 1}
                className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              {step < 4 ? (
                <Button
                  onClick={() => setStep((s) => (s + 1) as typeof step)}
                  disabled={!canNext()}
                  className="!bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                >
                  Continuar <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={submit}
                  isLoading={submitting}
                  disabled={!canNext()}
                  className="!bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                >
                  Confirmar agendamento <CheckCircle2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-zinc-600 text-[10px] mt-6">
          Powered by {store.name}
        </p>
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
