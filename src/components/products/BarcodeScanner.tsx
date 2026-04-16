"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { Camera, X, Keyboard } from "lucide-react";
import Input from "@/components/ui/Input";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string>("");
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [ready, setReady] = useState(false);

  // Ref para a instância do scanner e id único do container
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const containerIdRef = useRef<string>(`barcode-reader-${Math.random().toString(36).slice(2)}`);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (manualMode) return;

    let cancelled = false;

    const startScanner = async () => {
      // Verifica suporte a câmera antes de tentar
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador não suporta acesso à câmera. Use a digitação manual.");
        return;
      }

      try {
        // Import dinâmico para evitar quebrar SSR/build
        const mod = await import("html5-qrcode");
        if (cancelled) return;

        const { Html5Qrcode } = mod;
        const scanner = new Html5Qrcode(containerIdRef.current);
        scannerRef.current = scanner as unknown as { stop: () => Promise<void> };

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText: string) => {
            if (stoppedRef.current) return;
            stoppedRef.current = true;
            // Para de forma assíncrona e só depois dispara callbacks
            scanner
              .stop()
              .catch(() => {})
              .finally(() => {
                onScan(decodedText);
                onClose();
              });
          },
          () => {
            // ignora falhas de scan individuais (não são erros reais)
          }
        );

        if (!cancelled) setReady(true);
      } catch (err) {
        console.error("Erro ao iniciar scanner:", err);
        if (!cancelled) {
          setError(
            "Não foi possível acessar a câmera. Verifique as permissões ou use a digitação manual."
          );
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualMode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = manualValue.trim();
    if (!v) return;
    onScan(v);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            <span className="font-semibold">Escanear código de barras</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!manualMode ? (
            <>
              <div
                id={containerIdRef.current}
                className="w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center"
              >
                {!ready && !error && (
                  <p className="text-white/70 text-sm">Iniciando câmera...</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-danger bg-danger/10 rounded-lg p-3">
                  {error}
                </p>
              )}

              <p className="text-xs text-muted text-center">
                Aponte a câmera para o código de barras do produto
              </p>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setManualMode(true)}
                  className="flex-1"
                >
                  <Keyboard className="w-4 h-4" />
                  Digitar manualmente
                </Button>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <Input
                label="Código de Barras"
                placeholder="Ex: 7891234567890"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted">
                Dica: leitores USB também funcionam — basta focar no campo e escanear.
              </p>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button type="submit" className="flex-1" disabled={!manualValue.trim()}>
                  Confirmar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setManualMode(false)}
                >
                  <Camera className="w-4 h-4" />
                  Voltar à câmera
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
