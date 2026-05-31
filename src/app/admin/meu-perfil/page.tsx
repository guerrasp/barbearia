"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Save, Clock, User } from "lucide-react";
import toast from "react-hot-toast";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface WorkingHour {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

interface BarberProfile {
  id: string;
  name: string;
  bio: string | null;
  photo: string | null;
  specialties: string | null;
  workingHours: WorkingHour[];
}

export default function MeuPerfilPage() {
  const { user } = useAuth();
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");

  const barberId = user?.barberId;

  const loadProfile = useCallback(async () => {
    if (!barberId) return;
    try {
      const data = await api.get<BarberProfile>(`/barbeiros/${barberId}`);
      setBarber(data);
      setBio(data.bio || "");
      setSpecialties(data.specialties || "");
    } catch {
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  }, [barberId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSave() {
    if (!barberId) return;
    setSaving(true);
    try {
      await api.put(`/barbeiros/${barberId}/perfil`, { bio, specialties });
      toast.success("Perfil atualizado!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (!user || user.role !== "BARBER") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted">Acesso restrito a barbeiros.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted">Perfil de barbeiro não encontrado. Contate o administrador.</p>
      </div>
    );
  }

  // Agrupa horários por dia
  const hoursByDay = WEEKDAY_LABELS.map((label, i) => ({
    label,
    hours: barber.workingHours
      .filter((wh) => wh.weekday === i)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6" /> Meu Perfil
        </h1>
        <p className="text-muted text-sm mt-1">Edite sua bio e especialidades</p>
      </div>

      {/* Info básica */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <p className="text-lg font-semibold">{barber.name}</p>
          <p className="text-xs text-muted">Para alterar o nome, peça ao administrador.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Conte um pouco sobre você..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Especialidades</label>
          <input
            type="text"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Ex: Degradê, Barba, Pigmentação"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {/* Horários (somente leitura) */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5" /> Meus Horários
        </h2>
        <p className="text-xs text-muted mb-4">
          Para alterar seus horários, peça ao administrador.
        </p>
        <div className="grid gap-2">
          {hoursByDay.map(({ label, hours }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <span className="w-10 font-medium text-muted">{label}</span>
              {hours.length === 0 ? (
                <span className="text-muted/50">Folga</span>
              ) : (
                <div className="flex gap-2">
                  {hours.map((wh) => (
                    <span key={wh.id} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                      {wh.startTime} – {wh.endTime}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
