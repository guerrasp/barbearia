"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { MessageCircle, Wifi, WifiOff, RefreshCw, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

interface WhatsAppStatus {
  connected: boolean;
  phone: string | null;
  connecting: boolean;
  hasQr: boolean;
  exists: boolean;
}

interface QrResponse {
  connected: boolean;
  qr: string | null;
}

export default function WhatsAppSetup({ storeId }: { storeId: string }) {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get<WhatsAppStatus>(`/whatsapp/status?storeId=${storeId}`);
      setStatus(data);
      return data;
    } catch {
      setStatus({ connected: false, phone: null, connecting: false, hasQr: false, exists: false });
      return null;
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const fetchQr = useCallback(async () => {
    try {
      const data = await api.get<QrResponse>(`/whatsapp/qr?storeId=${storeId}`);
      if (data.connected) {
        setQrCode(null);
        fetchStatus();
        stopPolling();
      } else if (data.qr) {
        setQrCode(data.qr);
      }
    } catch {}
  }, [storeId, fetchStatus]);

  const startPolling = useCallback(() => {
    stopPolling();
    // Poll QR a cada 3 segundos
    pollRef.current = setInterval(() => {
      fetchQr();
    }, 3000);
  }, [fetchQr]);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    fetchStatus();
    return () => stopPolling();
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setQrCode(null);
    try {
      await api.post("/whatsapp/connect", { storeId });
      // Espera 2 segundos para o QR ser gerado
      await new Promise((r) => setTimeout(r, 2000));
      await fetchQr();
      startPolling();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao iniciar conexão WhatsApp");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Deseja realmente desconectar o WhatsApp? Seus clientes não receberão mais confirmações.")) return;
    setDisconnecting(true);
    stopPolling();
    try {
      await api.post("/whatsapp/disconnect", { storeId });
      setStatus({ connected: false, phone: null, connecting: false, hasQr: false, exists: false });
      setQrCode(null);
      toast.success("WhatsApp desconectado");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card title="WhatsApp" className="max-w-2xl">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="WhatsApp" className="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Conecte o WhatsApp da sua barbearia para enviar confirmações e lembretes automáticos aos clientes.
        </p>

        {status?.connected ? (
          /* ─── Conectado ─── */
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Wifi className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-400">Conectado</p>
                {status.phone && (
                  <p className="text-xs text-muted mt-0.5">
                    Número: +{status.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchStatus}
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar Status
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                isLoading={disconnecting}
                className="text-danger hover:text-danger"
              >
                <LogOut className="w-4 h-4" />
                Desconectar
              </Button>
            </div>
          </div>
        ) : qrCode ? (
          /* ─── QR Code exibido ─── */
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <MessageCircle className="w-4 h-4" />
              Escaneie o QR Code com o WhatsApp do seu celular
            </div>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                className="w-64 h-64"
              />
            </div>
            <p className="text-xs text-muted text-center">
              Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar aparelho
            </p>
          </div>
        ) : (
          /* ─── Desconectado ─── */
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
              <WifiOff className="w-5 h-5 text-muted shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Não conectado</p>
                <p className="text-xs text-muted mt-0.5">
                  Clique no botão abaixo para conectar o WhatsApp da sua barbearia.
                </p>
              </div>
            </div>
            <Button onClick={handleConnect} isLoading={connecting}>
              <MessageCircle className="w-4 h-4" />
              Conectar WhatsApp
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
