"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Button from "@/components/ui/Button";
import { Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>("barcode-reader-" + Date.now());

  useEffect(() => {
    const scanner = new Html5Qrcode(containerRef.current);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          onScan(decodedText);
          scanner.stop().catch(() => {});
          onClose();
        },
        () => {} // ignore scan failures
      )
      .catch((err) => {
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
        console.error(err);
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onScan, onClose]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <span className="font-medium">Escanear Código de Barras</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-background rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        id={containerRef.current}
        className="w-full rounded-lg overflow-hidden"
      />

      {error && (
        <div className="text-center space-y-2">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      )}

      <p className="text-xs text-muted text-center">
        Aponte a câmera para o código de barras do produto
      </p>
    </div>
  );
}
