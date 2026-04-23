"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  Scissors,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CalendarDays,
  MapPin,
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
        // API pode retornar objeto único ou array
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
        // Sem portal de cliente por enquanto — redirecionar ao agendamento
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-zinc-500/10 rounded-full blur-3xl" />

      <Toaster position="top-right" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/10 shadow-lg shadow-amber-500/10">
            <Scissors className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            {primaryStore?.name ?? "Barbearia"}
          </h1>
          <p className="text-amber-200/70 mt-2 flex items-center justify-center gap-1.5 text-sm">
            <MapPin className="w-4 h-4" />
            Agendamento online
          </p>
        </div>

        {!showAdminLogin ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-8 border border-white/10 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Marque seu horário</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Escolha barbeiro, serviço e horário — sem precisar criar conta.
              </p>
            </div>

            <Button
              onClick={() => {
                if (!primaryStore) return toast.error("Loja não carregada");
                window.location.href = `/agendar/${primaryStore.slug}`;
              }}
              className="w-full !bg-amber-500 hover:!bg-amber-600"
              size="lg"
              disabled={!primaryStore}
            >
              <CalendarDays className="w-4 h-4" />
              {primaryStore ? "Agendar agora" : "Carregando..."}
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>

            <div className="pt-4 border-t border-white/10">
              <p className="text-center text-xs text-zinc-500">
                Já tem cadastro?{" "}
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="text-amber-300 hover:text-amber-200 font-medium"
                >
                  Entrar
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-8 border border-white/20">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Acesso interno</h2>
                <p className="text-xs text-gray-500">Painel da equipe</p>
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
                className="w-full !bg-amber-500 hover:!bg-amber-600"
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
              className="w-full mt-4 text-sm text-amber-600 hover:text-amber-700"
            >
              ← Voltar
            </button>
          </div>
        )}

        <p className="text-center text-zinc-500 text-[10px] mt-6">
          {primaryStore?.name ?? "Barbearia"} &copy; 2026
        </p>
      </div>
    </div>
  );
}
