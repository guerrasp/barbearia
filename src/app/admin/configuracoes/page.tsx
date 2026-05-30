"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Save, Link, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import WhatsAppSetup from "@/components/admin/WhatsAppSetup";

interface StoreData {
  id: string;
  name: string;
  slug: string;
  slugChangedAt: string | null;
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
    slug: "",
    phone: "",
    email: "",
    address: "",
  });
  const [originalSlug, setOriginalSlug] = useState("");
  const [slugChangedAt, setSlugChangedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<StoreData>(`/stores/${storeId}`);
        if (cancelled) return;
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
        });
        setOriginalSlug(data.slug || "");
        setSlugChangedAt(data.slugChangedAt || null);
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
      const payload: Record<string, string> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
      };
      // Só envia slug se mudou
      const trimmedSlug = form.slug.trim();
      if (trimmedSlug && trimmedSlug !== originalSlug) {
        payload.slug = trimmedSlug;
      }
      const updated = await api.patch<StoreData>(`/stores/${storeId}`, payload);

      // Atualiza localStorage para o AuthContext refletir os dados novos
      try {
        const stored = localStorage.getItem("korta_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.store) {
            parsed.store.name = updated.name;
            parsed.store.slug = updated.slug;
            localStorage.setItem("korta_user", JSON.stringify(parsed));
          }
        }
      } catch {}

      setOriginalSlug(updated.slug);
      setSlugChangedAt(updated.slugChangedAt || null);

      toast.success("Configurações salvas!");
      // força recarregar para atualizar sidebar com novo nome
      if (store?.name !== updated.name || form.slug !== originalSlug) {
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

          {/* Slug editável com restrição de 15 dias */}
          <div>
            <Input
              label="Link de Agendamento (slug)"
              placeholder="minha-barbearia"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
              disabled={(() => {
                if (!slugChangedAt) return false;
                const diff = Date.now() - new Date(slugChangedAt).getTime();
                return diff < 15 * 24 * 60 * 60 * 1000;
              })()}
            />
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Link className="w-3 h-3" />
              <span>korta.vercel.app/agendar/<strong>{form.slug || "..."}</strong></span>
            </div>
            {slugChangedAt && (() => {
              const diff = Date.now() - new Date(slugChangedAt).getTime();
              const remaining = Math.ceil(15 - diff / (1000 * 60 * 60 * 24));
              if (remaining > 0) {
                return (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>Alteração disponível em {remaining} dia{remaining > 1 ? "s" : ""}</span>
                  </div>
                );
              }
              return null;
            })()}
            {form.slug !== originalSlug && form.slug.length >= 3 && (
              <p className="mt-1 text-xs text-amber-500">
                Atenção: após salvar, você só poderá alterar novamente em 15 dias.
              </p>
            )}
          </div>

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

      {/* WhatsApp Setup */}
      {storeId && <WhatsAppSetup storeId={storeId} />}
    </div>
  );
}
