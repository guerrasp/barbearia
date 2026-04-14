"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Store, Lock, Mail, ArrowRight, User, ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Bella Gestão</h1>
          <p className="text-purple-200 mt-2">Acompanhe seus pedidos e compras</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {!showAdminLogin ? (
            <>
              {/* Login do Cliente */}
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Área do Cliente</h2>
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
                <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
                  Entrar <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-4">
                Seu acesso é criado pela revendedora. Caso não tenha, entre em contato com ela.
              </p>
            </>
          ) : (
            <>
              {/* Login do Admin */}
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Administrador</h2>
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
                <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
                  Entrar no Painel <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Botão pequeno para alternar */}
        <div className="text-center mt-4">
          <button
            onClick={() => {
              setShowAdminLogin(!showAdminLogin);
              setEmail("");
              setPassword("");
            }}
            className="text-purple-300/60 text-xs hover:text-purple-200 transition-colors"
          >
            {showAdminLogin ? "← Voltar para área do cliente" : "Acesso administrativo"}
          </button>
        </div>

        <p className="text-center text-purple-300/40 text-xs mt-6">
          Bella Gestão &copy; 2026
        </p>
      </div>
    </div>
  );
}
