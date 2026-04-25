"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  /** URL atual da imagem (null se nunca foi enviada). */
  value: string | null;
  /** Callback chamado quando upload conclui com nova URL. */
  onChange: (newUrl: string) => void;
  /** Tipo de upload — define onde o servidor grava no banco. */
  kind: "logo" | "cover" | "barber";
  storeId: string;
  /** Necessário quando kind=barber. */
  barberId?: string;
  /** Aspecto do preview (default: "square"). */
  aspect?: "square" | "wide";
  /** Texto auxiliar mostrado no estado vazio. */
  hint?: string;
  /** Callback opcional pra "remover" — limpa a URL no servidor. */
  onRemove?: () => Promise<void> | void;
}

export default function ImageUpload({
  value,
  onChange,
  kind,
  storeId,
  barberId,
  aspect = "square",
  hint,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const aspectClass = aspect === "wide" ? "aspect-[16/6]" : "aspect-square";

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Imagem maior que 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("storeId", storeId);
      form.append("kind", kind);
      if (barberId) form.append("barberId", barberId);

      // api.upload anexa o JWT no header Authorization automaticamente
      const data = await api.upload<{ url: string }>("/upload", form);

      onChange(data.url);
      toast.success("Imagem atualizada!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro no upload";
      toast.error(msg);
    } finally {
      setUploading(false);
      // Limpa o input pra permitir re-selecionar o mesmo arquivo
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={`relative ${aspectClass} w-full max-w-md rounded-xl border-2 border-dashed border-border bg-background overflow-hidden group`}
      >
        {value ? (
          <>
            {/* Foi feito upload — mostra preview */}
            <Image
              src={value}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={handlePick}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg bg-white text-foreground text-xs font-medium hover:bg-gray-100"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 inline mr-1" />
                    Trocar
                  </>
                )}
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-lg bg-danger text-white text-xs font-medium hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5 inline mr-1" />
                  Remover
                </button>
              )}
            </div>
          </>
        ) : (
          /* Estado vazio */
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted hover:text-korta-gold transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Enviar imagem</span>
                {hint && <span className="text-xs text-muted/70">{hint}</span>}
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
