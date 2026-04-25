"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import ImageUpload from "@/components/admin/ImageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface StoreData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  coverImage: string | null;
}

export default function PersonalizacaoPage() {
  const { user, store } = useAuth();
  const storeId = user?.storeId;

  const [data, setData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<StoreData>(`/stores/${storeId}`);
        if (!cancelled) setData(res);
      } catch (err) {
        console.error(err);
        toast.error("Não foi possível carregar a loja.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const updateField = async (field: "logo" | "coverImage", value: string | null) => {
    if (!storeId || !data) return;
    setData({ ...data, [field]: value });
    try {
      await api.patch(`/stores/${storeId}`, { [field]: value });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
    }
  };

  if (loading || !data || !storeId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/agendar/${data.slug}`
      : "";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Personalização</h1>
        <p className="text-muted text-sm mt-1">
          Deixe sua página pública com a cara da sua barbearia.
        </p>
      </div>

      {/* Logo */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <h3 className="font-semibold text-foreground">Logo</h3>
            <p className="text-xs text-muted mt-0.5">
              Aparece no topo da sua página de agendamento. Use uma imagem quadrada
              (200×200) com fundo transparente ou sólido.
            </p>
          </div>
        </div>
        <ImageUpload
          value={data.logo}
          onChange={(url) => updateField("logo", url)}
          kind="logo"
          storeId={storeId}
          aspect="square"
          hint="JPG, PNG ou WebP · até 5 MB"
          onRemove={() => updateField("logo", null)}
        />
      </Card>

      {/* Capa */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <h3 className="font-semibold text-foreground">Foto de capa</h3>
            <p className="text-xs text-muted mt-0.5">
              Banner que aparece atrás do nome da loja na sua página pública.
              Idealmente 1600×600 (paisagem).
            </p>
          </div>
        </div>
        <ImageUpload
          value={data.coverImage}
          onChange={(url) => updateField("coverImage", url)}
          kind="cover"
          storeId={storeId}
          aspect="wide"
          hint="JPG, PNG ou WebP · até 5 MB"
          onRemove={() => updateField("coverImage", null)}
        />
      </Card>

      {/* Preview link */}
      {publicUrl && (
        <div className="text-sm text-muted">
          Ver como ficou:{" "}
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-korta-gold hover:underline font-medium break-all"
          >
            {publicUrl}
          </a>
        </div>
      )}
    </div>
  );
}
