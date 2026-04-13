"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Store, Lock, Mail, ArrowRight, User, Building2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginType, setLoginType] = useState<"admin" | "customer">("admin");

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
      toast.error(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register({ email, password, name, storeName });
      toast.success("Conta criada! Faça login.");
      setMode("login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar");
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
          <p className="text-purple-200 mt-2">Sistema de gestão para vendas de perfumes e beleza</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {mode === "login" ? (
            <>
              {/* Tabs admin/cliente */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
                <button
                  onClick={() => setLoginType("admin")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    loginType === "admin" ? "bg-white text-foreground shadow-sm" : "text-gray-500"
                  }`}
                >
                  Administrador
                </button>
                <button
                  onClick={() => setLoginType("customer")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    loginType === "customer" ? "bg-white text-foreground shadow-sm" : "text-gray-500"
                  }`}
                >
                  Cliente
                </button>
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

              <div className="mt-4 text-center">
                <button
                  onClick={() => setMode("register")}
                  className="text-sm text-primary hover:underline"
                >
                  Não tem conta? Cadastre sua loja
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-center mb-4">Criar Conta</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  label="Seu Nome"
                  placeholder="Nome completo"
                  icon={<User className="w-4 h-4" />}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Nome da Loja"
                  placeholder="Ex: Bella Perfumaria"
                  icon={<Building2 className="w-4 h-4" />}
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
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
                  placeholder="Mínimo 6 caracteres"
                  icon={<Lock className="w-4 h-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
                  Criar Conta <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setMode("login")}
                  className="text-sm text-primary hover:underline"
                >
                  Já tem conta? Faça login
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-purple-300 text-xs mt-6">
          Bella Gestão &copy; 2026 — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
