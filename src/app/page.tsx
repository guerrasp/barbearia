"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import KortaLogo from "@/components/brand/KortaLogo";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CalendarDays,
  Smartphone,
  BellRing,
  TrendingUp,
  Scissors,
  Check,
  Bot,
  Users,
  Heart,
  BarChart3,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function LandingPage() {
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
      window.location.href = role === "ADMIN" || role === "BARBER" ? "/admin" : "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Email ou senha inválidos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="korta-surface min-h-screen bg-korta-bg relative overflow-hidden">
      {/* Background */}
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
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-10 py-6 gap-3">
        <KortaLogo size="md" priority />
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <Link
            href="/para-barbearias"
            className="text-sm text-korta-muted hover:text-korta-text transition-colors px-1 sm:px-2"
          >
            Planos
          </Link>
          <button
            onClick={() => setShowAdminLogin(true)}
            className="text-sm text-korta-muted hover:text-korta-text transition-colors px-1 sm:px-2"
          >
            <span className="sm:hidden">
              <Lock className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">Entrar</span>
          </button>
          <Link
            href="/criar-loja"
            className="inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-korta-gold text-korta-bg text-xs sm:text-sm font-semibold hover:bg-korta-gold-hover transition-colors whitespace-nowrap"
          >
            <span className="sm:hidden">Criar loja</span>
            <span className="hidden sm:inline">Criar minha loja</span>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10">
        {!showAdminLogin ? (
          <>
            {/* Hero */}
            <section className="pt-8 pb-20 grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-korta-gold/10 border border-korta-gold/20 mb-6">
                  <Sparkles className="w-3.5 h-3.5 text-korta-gold" />
                  <span className="text-xs font-medium text-korta-gold">
                    Agendamento online para barbearias
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-korta-text tracking-tight leading-[1.05]">
                  A agenda da sua{" "}
                  <span className="text-korta-gold">barbearia</span>
                  <br />
                  no piloto automático.
                </h1>

                <p className="mt-5 text-lg text-korta-muted max-w-lg">
                  Receba agendamentos 24h, evite conflitos, mande lembretes automáticos
                  e nunca mais perca cliente por telefone ocupado.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Link href="/criar-loja">
                    <Button
                      className="!bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                      size="lg"
                    >
                      <Scissors className="w-4 h-4" />
                      Começar trial grátis
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <a
                    href="#funcionalidades"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/10 text-korta-text hover:border-white/20 transition-colors text-sm font-medium"
                  >
                    Ver funcionalidades
                  </a>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-korta-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-korta-gold" /> 14 dias grátis · sem cartão
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-korta-gold" /> Pronto em 2 min
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-korta-gold" /> Link próprio
                  </span>
                </div>
              </div>

              {/* Mock card */}
              <div className="hidden md:block relative">
                <div className="relative bg-korta-surface rounded-2xl p-6 border border-korta-gold/15 shadow-2xl shadow-black/40">
                  <div className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-korta-gold text-korta-bg text-xs font-bold">
                    PRÓXIMO
                  </div>
                  <div className="text-korta-muted text-xs uppercase tracking-wider mb-2">
                    Agendamento confirmado
                  </div>
                  <div className="text-korta-text text-2xl font-bold">Corte Degradê</div>
                  <div className="text-korta-muted text-sm mt-1">Com Pedro · 40 min</div>
                  <div className="mt-5 p-4 rounded-xl bg-korta-bg border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-korta-muted text-xs">Quinta-feira</div>
                        <div className="text-korta-text text-lg font-semibold">16:00</div>
                      </div>
                      <div className="text-right">
                        <div className="text-korta-muted text-xs">Total</div>
                        <div className="text-korta-gold text-lg font-semibold">R$ 55,00</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-korta-muted">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    Lembrete enviado 24h antes
                  </div>
                </div>
                <div className="absolute -z-10 -bottom-8 -right-8 w-64 h-64 bg-korta-gold/5 rounded-full blur-3xl" />
              </div>
            </section>

            {/* Features */}
            <section id="funcionalidades" className="py-16 border-t border-white/5">
              <h2 className="text-3xl sm:text-4xl font-bold text-korta-text text-center">
                Tudo que sua barbearia precisa,{" "}
                <span className="text-korta-gold">em um só lugar</span>
              </h2>
              <p className="text-center text-korta-muted mt-3 max-w-xl mx-auto">
                Painel completo para o time + portal próprio para o cliente agendar sozinho.
              </p>

              <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FeatureCard
                  icon={<CalendarDays />}
                  title="Agenda inteligente"
                  desc="Visão por barbeiro, conflitos bloqueados, bloqueios e folgas em poucos cliques."
                />
                <FeatureCard
                  icon={<Smartphone />}
                  title="Link público"
                  desc="Um link só seu — seu cliente agenda em poucos toques, do próprio celular."
                />
                <FeatureCard
                  icon={<BellRing />}
                  title="WhatsApp automático"
                  desc="Confirmação na hora e lembrete 24h antes por WhatsApp e email. Em todos os planos."
                />
                <FeatureCard
                  icon={<Users />}
                  title="Portal do barbeiro"
                  desc="Cada barbeiro tem seu login — vê a própria agenda e perfil, sem acessar dados da loja."
                />
              </div>
            </section>

            {/* Diferenciais */}
            <section className="py-16 border-t border-white/5">
              <h2 className="text-3xl sm:text-4xl font-bold text-korta-text text-center">
                O que só o Korta{" "}
                <span className="text-korta-gold">te entrega</span>
              </h2>
              <p className="text-center text-korta-muted mt-3 max-w-xl mx-auto">
                Ferramentas que nenhum outro sistema de barbearia tem.
              </p>

              <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="bg-korta-surface/50 rounded-xl p-6 border border-korta-gold/15">
                  <div className="w-12 h-12 rounded-xl bg-korta-gold/10 border border-korta-gold/20 flex items-center justify-center text-korta-gold mb-4">
                    <Bot className="w-6 h-6" />
                  </div>
                  <h3 className="text-korta-text font-bold text-lg">Atendente virtual IA</h3>
                  <p className="text-sm text-korta-muted mt-2 leading-relaxed">
                    Seu cliente manda mensagem no WhatsApp e a IA agenda sozinha — 24h por dia, 7 dias por semana. Sem perder cliente fora do horário.
                  </p>
                  <span className="inline-block mt-3 text-xs text-korta-gold font-medium px-2 py-0.5 rounded-full bg-korta-gold/10 border border-korta-gold/20">
                    Plano Business e Korta IA
                  </span>
                </div>

                <div className="bg-korta-surface/50 rounded-xl p-6 border border-white/5 hover:border-korta-gold/20 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-korta-gold/10 border border-korta-gold/20 flex items-center justify-center text-korta-gold mb-4">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h3 className="text-korta-text font-bold text-lg">CRM inteligente</h3>
                  <p className="text-sm text-korta-muted mt-2 leading-relaxed">
                    Saiba quem sumiu, quem faz aniversário e quem é VIP. Veja ticket médio, barbeiro preferido e frequência — tudo automático.
                  </p>
                  <span className="inline-block mt-3 text-xs text-korta-muted font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    Todos os planos
                  </span>
                </div>

                <div className="bg-korta-surface/50 rounded-xl p-6 border border-white/5 hover:border-korta-gold/20 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-korta-gold/10 border border-korta-gold/20 flex items-center justify-center text-korta-gold mb-4">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <h3 className="text-korta-text font-bold text-lg">Dashboard completa</h3>
                  <p className="text-sm text-korta-muted mt-2 leading-relaxed">
                    Faturamento por barbeiro, horários de pico, taxa de ocupação e comparativo mensal. Dados que a concorrência cobra R$ 179+ para mostrar.
                  </p>
                  <span className="inline-block mt-3 text-xs text-korta-muted font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    Todos os planos
                  </span>
                </div>
              </div>
            </section>

            {/* Preço */}
            <section className="py-16 border-t border-white/5 text-center">
              <h2 className="text-3xl font-bold text-korta-text">
                A partir de <span className="text-korta-gold">R$ 39,90</span>/mês
              </h2>
              <p className="text-korta-muted mt-3 max-w-lg mx-auto">
                WhatsApp, CRM e dashboard já inclusos no plano mais barato do mercado.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/criar-loja">
                  <Button
                    className="!bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                    size="lg"
                  >
                    Começar trial grátis <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link
                  href="/para-barbearias"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/10 text-korta-text hover:border-white/20 transition-colors text-sm font-medium"
                >
                  Ver todos os planos
                </Link>
              </div>
            </section>

            {/* CTA final */}
            <section className="py-16 border-t border-white/5">
              <div className="bg-korta-surface rounded-2xl p-8 sm:p-12 border border-korta-gold/15 text-center">
                <Sparkles className="w-8 h-8 text-korta-gold mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-korta-text">
                  Teste 14 dias grátis. Sem compromisso.
                </h2>
                <p className="text-korta-muted mt-3 max-w-xl mx-auto">
                  Crie sua barbearia agora, configure em 2 minutos e já receba agendamentos
                  hoje. No fim do trial você escolhe um plano para continuar.
                </p>
                <Link href="/criar-loja">
                  <Button
                    className="mt-6 !bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                    size="lg"
                  >
                    Começar trial grátis <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </section>
          </>
        ) : (
          /* Login interno */
          <div className="max-w-md mx-auto mt-12 mb-20">
            <div className="bg-korta-surface rounded-2xl p-8 border border-white/5 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-korta-gold/15 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-korta-gold" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-korta-text">Entrar</h2>
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

              <div className="mt-5 pt-5 border-t border-white/5 text-center">
                <p className="text-xs text-korta-muted">
                  Ainda não tem conta?{" "}
                  <Link href="/criar-loja" className="text-korta-gold hover:underline">
                    Criar minha loja
                  </Link>
                </p>
              </div>

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

      <footer className="relative z-10 py-8 text-center border-t border-white/5">
        <p className="text-xs text-korta-muted/70">
          Korta &copy; 2026 · agendamento para barbearias
        </p>
        <p className="text-xs text-korta-muted/60 mt-2 flex items-center justify-center gap-3">
          <Link href="/termos" className="hover:text-korta-text transition-colors">
            Termos
          </Link>
          <span>·</span>
          <Link href="/privacidade" className="hover:text-korta-text transition-colors">
            Privacidade
          </Link>
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-korta-surface/50 rounded-xl p-5 border border-white/5 hover:border-korta-gold/20 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-korta-gold/10 border border-korta-gold/20 flex items-center justify-center text-korta-gold mb-3 [&>svg]:w-5 [&>svg]:h-5">
        {icon}
      </div>
      <h3 className="text-korta-text font-semibold">{title}</h3>
      <p className="text-sm text-korta-muted mt-1.5">{desc}</p>
    </div>
  );
}
