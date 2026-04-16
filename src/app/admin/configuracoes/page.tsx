"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Save } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface StoreData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export default function ConfiguracoesPage() {
  const { user, store } = useAuth();
  const storeId = user?.storeId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<StoreData>(`/stores/${storeId}`);
        if (cancelled) return;
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
        });
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar as configurações.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    if (!form.name.trim()) {
      toast.error("Nome da loja é obrigatório");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.patch<StoreData>(`/stores/${storeId}`, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
      });

      // Atualiza localStorage para o AuthContext refletir o novo nome
      try {
        const stored = localStorage.getItem("bella_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.store) {
            parsed.store.name = updated.name;
            localStorage.setItem("bella_user", JSON.stringify(parsed));
          }
        }
      } catch {}

      toast.success("Configurações salvas!");
      // força recarregar para atualizar sidebar com novo nome
      if (store?.name !== updated.name) {
        setTimeout(() => window.location.reload(), 600);
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro ao salvar configurações";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted text-sm mt-1">Dados da loja e preferências</p>
      </div>

      <Card title="Dados da Loja" className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome da Loja"
            placeholder="Nome da sua loja"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Telefone"
              placeholder="(11) 99999-8888"
              value={form.phone}
              maxLength={15}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="contato@sualoja.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <Input
            label="Endereço"
            placeholder="Rua, número - Cidade/UF"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <div className="pt-4 border-t border-border">
            <Button type="submit" isLoading={saving}>
              <Save className="w-4 h-4" />
              Salvar Configurações
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
