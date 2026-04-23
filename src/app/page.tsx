"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import KortaLogo from "@/components/brand/KortaLogo";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  Sparkles,
  Clock,
  Users,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface StoreSummary {
  id: string;
  name: string;
  slug: string;
}

export default function LandingPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [stores, setStores] = useState<StoreSummary[]>([]);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStores(data);
        else if (data?.id) setStores([data]);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { role } = await login(email, password);
      toast.success("Login realizado!");
      if (role === "CUSTOMER") {
        window.location.href = stores[0] ? `/agendar/${stores[0].slug}` : "/";
      } else {
        window.location.href = "/admin";
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Email ou senha inválidos");
    } finally {
      setIsLoading(false);
    }
  };

  const primaryStore = stores[0];

  return (
    <div className="korta-surface min-h-screen bg-korta-bg relative overflow-hidden">
      {/* Background: gradients + noise */}
      <div className="absolute inset-0 bg-gradient-to-br from-korta-bg via-korta-bg to-[#060b1a]" />
      <div className="absolute top-[-25%] right-[-10%] w-[600px] h-[600px] bg-korta-gold/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-30%] left-[-15%] w-[500px] h-[500px] bg-korta-surface/60 rounded-full blur-[100px]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(212,175,55,0.5) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <Toaster position="top-right" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6">
        <KortaLogo size="md" />
        <button
          onClick={() => setShowAdminLogin(true)}
          className="text-sm text-korta-muted hover:text-korta-text transition-colors"
        >
          Entrar
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 pt-8 pb-16">
        {!showAdminLogin ? (
          <div className="grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
            {/* Coluna esquerda — copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-korta-gold/10 border border-korta-gold/20 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-korta-gold" />
                <span className="text-xs font-medium text-korta-gold">
                  {primaryStore?.name ?? "Barbearia"} · online
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-korta-text tracking-tight leading-[1.05]">
                Seu horário na{" "}
                <span className="text-korta-gold">barbearia</span>,
                <br />
                em poucos toques.
              </h1>

              <p className="mt-5 text-lg text-korta-muted max-w-lg">
                Escolha o profissional, o serviço e o horário que cabem no seu dia.
                Sem ligação, sem fila, sem cadastro.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    if (!primaryStore) return toast.error("Loja não carregada");
                    window.location.href = `/agendar/${primaryStore.slug}`;
                  }}
                  className="!bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                  size="lg"
                  disabled={!primaryStore}
                >
                  <CalendarDays className="w-4 h-4" />
                  {primaryStore ? "Agendar agora" : "Carregando..."}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Features grid */}
              <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg">
                <Feature icon={<Clock />} label="24h online" />
                <Feature icon={<Users />} label="Escolha o barbeiro" />
                <Feature icon={<Sparkles />} label="Confirmação no ato" />
              </div>
            </div>

            {/* Coluna direita — card decorativo */}
            <div className="hidden md:block relative">
              <div className="relative bg-korta-surface rounded-2xl p-6 border border-korta-gold/15 shadow-2xl shadow-black/40">
                <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-korta-gold text-korta-bg text-xs font-bold">
                  PRÓXIMO
                </div>
                <div className="text-korta-muted text-xs uppercase tracking-wider mb-2">
                  Agendamento confirmado
                </div>
                <div className="text-korta-text text-2xl font-bold">
                  Corte Degradê
                </div>
                <div className="text-korta-muted text-sm mt-1">
                  Com Pedro · 40 min
                </div>
                <div className="mt-5 p-4 rounded-xl bg-korta-bg border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-korta-muted text-xs">Quinta-feira</div>
                      <div className="text-korta-text text-lg font-semibold">
                        16:00
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-korta-muted text-xs">Total</div>
                      <div className="text-korta-gold text-lg font-semibold">
                        R$ 55,00
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-korta-muted">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  Lembrete enviado 24h antes
                </div>
              </div>
              {/* Decor */}
              <div className="absolute -z-10 -bottom-8 -right-8 w-64 h-64 bg-korta-gold/5 rounded-full blur-3xl" />
            </div>
          </div>
        ) : (
          /* Login interno */
          <div className="max-w-md mx-auto mt-12">
            <div className="bg-korta-surface rounded-2xl p-8 border border-white/5 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-korta-gold/15 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-korta-gold" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-korta-text">
                    Acesso interno
                  </h2>
                  <p className="text-xs text-korta-muted">Painel da equipe</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="seu@email.com"
                  icon={<Mail className="w-4 h-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Senha"
                  type="password"
                  placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="w-full !bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                  size="lg"
                >
                  Entrar <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <button
                onClick={() => {
                  setShowAdminLogin(false);
                  setEmail("");
                  setPassword("");
                }}
                className="w-full mt-4 text-sm text-korta-muted hover:text-korta-text"
              >
                ← Voltar
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 py-8 text-center">
        <p className="text-xs text-korta-muted/70">
          Korta &copy; 2026 · agendamento para barbearias
        </p>
      </footer>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <div className="w-10 h-10 rounded-xl bg-korta-surface border border-white/5 flex items-center justify-center text-korta-gold">
        <span className="[&>svg]:w-5 [&>svg]:h-5">{icon}</span>
      </div>
      <span className="text-xs text-korta-muted">{label}</span>
    </div>
  );
}
