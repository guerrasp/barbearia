"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Card from "@/components/ui/Card";
import { Copy, Check, Share2, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

/** Botão de compartilhamento do link público da loja.
 *
 *  Mostra:
 *  - URL canônica (host real, definido no client)
 *  - Botão "Copiar"
 *  - Botão WhatsApp (web wa.me com texto pronto)
 *  - Botão "Compartilhar" via navigator.share quando disponível
 *    (mobile sobe sheet nativo com Instagram/X/etc; desktop esconde)
 */
// Valores fixos do ambiente do browser — useSyncExternalStore lê direto
// no client e usa o fallback no server, sem setState pós-mount.
const emptySubscribe = () => () => {};

export default function ShareStoreLink({
  slug,
  storeName,
}: {
  slug: string;
  storeName: string;
}) {
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => "",
  );
  const canNativeShare = useSyncExternalStore(
    emptySubscribe,
    () => !!navigator.share,
    () => false,
  );

  const url = useMemo(
    () => (origin ? `${origin}/agendar/${slug}` : `/agendar/${slug}`),
    [origin, slug],
  );

  const shareText = `Agende seu horário na ${storeName} 💈`;
  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: storeName, text: shareText, url });
    } catch {
      // usuário cancelou
    }
  };

  return (
    <Card className="!p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Share2 className="w-4 h-4 text-korta-gold" /> Seu link público
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Coloque na bio do Instagram, no WhatsApp ou no Google.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <span className="truncate text-foreground font-mono">{url || `/agendar/${slug}`}</span>
        <button
          type="button"
          onClick={copy}
          className="ml-auto inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-korta-gold/10 text-korta-gold hover:bg-korta-gold/20 transition-colors shrink-0"
          aria-label="Copiar link"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Copiado
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copiar
            </>
          )}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 text-xs font-medium transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" /> Enviar no WhatsApp
        </a>
        {canNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 text-xs font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" /> Compartilhar
          </button>
        )}
      </div>
    </Card>
  );
}
