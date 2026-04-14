"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ParticleBackground from "@/components/effects/ParticleBackground";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Store, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { role } = await login(email, password);
      toast.success("Login realizado!");
      if (role === "CUSTOMER") {
        window.location.href = "/cliente";
      } else {
        window.location.href = "/admin";
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Email ou senha inválidos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Efeito de partículas */}
      <ParticleBackground />

      {/* Círculos decorativos de fundo */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute top-[40%] left-[20%] w-[200px] h-[200px] bg-cyan-400/5 rounded-full blur-2xl" />

      <Toaster position="top-right" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-5 border border-white/10 shadow-lg shadow-blue-500/10">
            <Store className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Bella Gestão
          </h1>
          <p className="text-blue-200/70 mt-2 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Perfumes & Beleza
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-8 border border-white/20">
          {!showAdminLogin ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Bem-vinda!</h2>
                <p className="text-sm text-gray-500 mt-1">Acesse sua conta para ver seus pedidos</p>
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
                <Button type="submit" isLoading={isLoading} className="w-full !bg-blue-600 hover:!bg-blue-700" size="lg">
                  Entrar <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-center text-xs text-gray-400">
                  Seu acesso é criado pela sua revendedora.
                </p>
                <p className="text-center text-xs text-gray-400 mt-1">
                  Caso não tenha acesso, entre em contato com ela.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Painel Administrativo</h2>
                  <p className="text-xs text-gray-500">Acesso exclusivo para revendedoras</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="admin@email.com"
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
                <Button type="submit" isLoading={isLoading} className="w-full !bg-blue-600 hover:!bg-blue-700" size="lg">
                  Entrar no Painel <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <button
                onClick={() => { setShowAdminLogin(false); setEmail(""); setPassword(""); }}
                className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700"
              >
                ← Voltar para área do cliente
              </button>
            </>
          )}
        </div>

        {/* Botão admin discreto */}
        {!showAdminLogin && (
          <div className="text-center mt-5">
            <button
              onClick={() => { setShowAdminLogin(true); setEmail(""); setPassword(""); }}
              className="text-blue-300/40 text-[11px] hover:text-blue-200/70 transition-colors"
            >
              Acesso administrativo
            </button>
          </div>
        )}

        <p className="text-center text-blue-300/25 text-[10px] mt-6">
          Bella Gestão &copy; 2026
        </p>
      </div>
    </div>
  );
}
