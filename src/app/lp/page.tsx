import Link from "next/link";
import KortaLogo from "@/components/brand/KortaLogo";
import {
  ArrowRight, Check, Bot, Clock, CalendarCheck, MessageCircle,
  TrendingUp, ShieldCheck, Star, Zap,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Korta — Atendente de IA que enche a agenda da sua barbearia 24h",
  description:
    "O Korta responde seus clientes no WhatsApp, agenda horários e lota sua agenda — 24 horas por dia, sem você mexer no celular. 14 dias grátis, sem cartão.",
};

const CTA_HREF = "/criar-loja?plan=KORTA_IA";

export default function LandingAds() {
  return (
    <div className="korta-surface min-h-screen bg-korta-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-korta-bg via-korta-bg to-[#060b1a]" />
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-korta-gold/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-25%] left-[-15%] w-[500px] h-[500px] bg-korta-surface/60 rounded-full blur-[100px]" />

      {/* Top bar minimalista (sem distrações) */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-10 py-5">
        <KortaLogo size="md" priority />
        <Link
          href={CTA_HREF}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-korta-gold text-korta-bg text-sm font-bold hover:bg-korta-gold-hover transition-colors"
        >
          Testar grátis <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-5 sm:px-10">
        {/* ── HERO ── */}
        <section className="pt-6 pb-14 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-korta-gold/10 border border-korta-gold/25 mb-5">
              <Bot className="w-3.5 h-3.5 text-korta-gold" />
              <span className="text-xs font-semibold text-korta-gold">Atendente de IA para barbearias</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-korta-text leading-[1.05] tracking-tight">
              Sua barbearia atende sozinha no WhatsApp.{" "}
              <span className="text-korta-gold">24 horas por dia.</span>
            </h1>
            <p className="mt-5 text-lg text-korta-muted max-w-xl">
              O Korta responde seus clientes, agenda os horários e <strong className="text-korta-text">lota
              sua agenda</strong> — enquanto você corta cabelo (ou dorme). Sem você
              tocar no celular.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href={CTA_HREF}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-korta-gold text-korta-bg font-bold text-base hover:bg-korta-gold-hover transition-colors shadow-lg shadow-korta-gold/20"
              >
                Começar grátis por 14 dias <ArrowRight className="w-4.5 h-4.5" />
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-korta-muted">
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-korta-gold" /> Sem cartão</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-korta-gold" /> Pronto em 2 minutos</span>
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-korta-gold" /> Cancele quando quiser</span>
            </div>
          </div>

          {/* Demo do chatbot — conversa estilo WhatsApp */}
          <ChatDemo />
        </section>

        {/* ── DOR ── */}
        <section className="py-12 border-t border-white/5 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-korta-text max-w-2xl mx-auto">
            Quantos clientes você <span className="text-korta-gold">perde</span> por não responder o WhatsApp a tempo?
          </h2>
          <p className="mt-4 text-korta-muted max-w-xl mx-auto">
            Cliente manda mensagem às 22h, você só vê de manhã, ele já marcou em outra.
            Com o Korta, a IA responde <strong className="text-korta-text">na hora</strong> e fecha o horário.
          </p>
          <div className="mt-8 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <Stat icon={<Clock />} title="Responde em segundos" desc="24h por dia, até de madrugada e domingo" />
            <Stat icon={<CalendarCheck />} title="Agenda sozinho" desc="Cliente escolhe serviço, barbeiro e horário no chat" />
            <Stat icon={<TrendingUp />} title="Menos no-show" desc="Lembrete automático 24h antes do horário" />
          </div>
        </section>

        {/* ── COMPARATIVO ── */}
        <section className="py-12 border-t border-white/5">
          <h2 className="text-2xl sm:text-3xl font-bold text-korta-text text-center">
            Por que o Korta é <span className="text-korta-gold">diferente</span>
          </h2>
          <p className="text-center text-korta-muted mt-2">O que só o Korta entrega.</p>
          <div className="mt-7 overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 text-left text-korta-muted font-medium">Recurso</th>
                  <th className="py-3 text-center text-korta-gold font-bold">Korta</th>
                  <th className="py-3 text-center text-korta-muted font-medium">Outros sistemas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-korta-text">
                {[
                  ["Atendente de IA que conversa e agenda", true, "Só menus automáticos"],
                  ["Lembrete por WhatsApp em todos os planos", true, "Geralmente custa à parte"],
                  ["CRM (clientes inativos, aniversários)", true, "Nenhum tem integrado"],
                  ["Relatórios de faturamento + CSV", true, "Só em planos caros"],
                  ["A partir de R$ 39,90/mês", true, "Média do mercado: R$ 89+"],
                ].map(([f, ok, other]) => (
                  <tr key={f as string}>
                    <td className="py-3 pr-3">{f as string}</td>
                    <td className="py-3 text-center">{ok ? <Check className="w-5 h-5 text-korta-gold mx-auto" /> : "—"}</td>
                    <td className="py-3 text-center text-korta-muted text-xs">{other as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── PROVA SOCIAL ── */}
        <section className="py-12 border-t border-white/5">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-korta-gold fill-korta-gold" />)}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-korta-text text-center">
            Barbeiros que pararam de perder cliente
          </h2>
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Quote
              text="A IA agenda enquanto eu tô atendendo. Minha agenda lotou e eu não respondo mais WhatsApp na correria."
              name="Rafael, Barber Studio"
            />
            <Quote
              text="Cliente manda mensagem de madrugada e já sai agendado. Antes eu perdia esses horários todos."
              name="Marcos, Premium Cortes"
            />
            <Quote
              text="O lembrete automático cortou as faltas pela metade. Só isso já pagou a mensalidade."
              name="João, Vintage Barbearia"
            />
          </div>
          <p className="text-center text-[11px] text-korta-muted/50 mt-4">
            Depoimentos ilustrativos.
          </p>
        </section>

        {/* ── OFERTA / CTA FINAL ── */}
        <section className="py-12 border-t border-white/5">
          <div className="bg-korta-surface rounded-2xl p-8 sm:p-12 border border-korta-gold/20 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-korta-gold/10 rounded-full blur-3xl" />
            <div className="relative">
              <Zap className="w-8 h-8 text-korta-gold mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-korta-text">
                Coloque sua barbearia no piloto automático
              </h2>
              <p className="text-korta-muted mt-3 max-w-xl mx-auto">
                14 dias grátis com o atendente de IA liberado. Sem cartão.
                Configure em 2 minutos e já receba agendamentos hoje.
              </p>
              <Link
                href={CTA_HREF}
                className="inline-flex items-center gap-2 mt-7 px-8 py-4 rounded-xl bg-korta-gold text-korta-bg font-bold text-base hover:bg-korta-gold-hover transition-colors shadow-lg shadow-korta-gold/20"
              >
                Quero testar grátis <ArrowRight className="w-4.5 h-4.5" />
              </Link>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-korta-muted">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-korta-gold" /> Seus dados protegidos</span>
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-korta-gold" /> Sem fidelidade</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 py-8 text-center border-t border-white/5">
        <p className="text-xs text-korta-muted/70">Korta &copy; 2026 · agendamento com IA para barbearias</p>
        <p className="text-xs text-korta-muted/60 mt-2 flex items-center justify-center gap-3">
          <Link href="/termos" className="hover:text-korta-text">Termos</Link>
          <span>·</span>
          <Link href="/privacidade" className="hover:text-korta-text">Privacidade</Link>
        </p>
      </footer>
    </div>
  );
}

function ChatDemo() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="bg-[#0b141a] rounded-[2rem] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header do "WhatsApp" */}
        <div className="bg-korta-surface px-4 py-3 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-full bg-korta-gold/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-korta-gold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-korta-text leading-tight">Barbearia (Korta)</p>
            <p className="text-[11px] text-emerald-400">online</p>
          </div>
        </div>
        {/* Mensagens */}
        <div className="p-3 space-y-2 bg-[#0b141a] min-h-[360px]">
          <Bubble side="right">quero cortar o cabelo amanhã às 15h</Bubble>
          <Bubble side="left">Boa! ✂️ Com quem você prefere — Rafael ou João? (ou &quot;tanto faz&quot;)</Bubble>
          <Bubble side="right">tanto faz</Bubble>
          <Bubble side="left">Fechou com o Rafael! Amanhã o horário das 15h está livre. Confirmo? 🗓️</Bubble>
          <Bubble side="right">confirma 👍</Bubble>
          <Bubble side="left">
            Prontinho, tá agendado! ✅<br />📅 Amanhã às 15h<br />✂️ Corte Masculino<br />💈 Rafael<br />Te espero! 😄
          </Bubble>
        </div>
      </div>
      <p className="text-center text-xs text-korta-muted mt-3 flex items-center justify-center gap-1.5">
        <MessageCircle className="w-3.5 h-3.5 text-korta-gold" /> Conversa real do atendente de IA
      </p>
    </div>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  const right = side === "right";
  return (
    <div className={`flex ${right ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug ${
          right
            ? "bg-[#005c4b] text-white rounded-br-sm"
            : "bg-korta-surface text-korta-text rounded-bl-sm border border-white/5"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Stat({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-korta-surface/50 rounded-xl p-5 border border-white/5 text-left">
      <div className="w-9 h-9 rounded-lg bg-korta-gold/10 border border-korta-gold/20 flex items-center justify-center text-korta-gold mb-3 [&>svg]:w-4.5 [&>svg]:h-4.5">
        {icon}
      </div>
      <h3 className="text-korta-text font-semibold text-sm">{title}</h3>
      <p className="text-xs text-korta-muted mt-1">{desc}</p>
    </div>
  );
}

function Quote({ text, name }: { text: string; name: string }) {
  return (
    <div className="bg-korta-surface/50 rounded-xl p-5 border border-white/5">
      <div className="flex gap-0.5 mb-2">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-korta-gold fill-korta-gold" />)}
      </div>
      <p className="text-sm text-korta-text leading-relaxed">&quot;{text}&quot;</p>
      <p className="text-xs text-korta-muted mt-3 font-medium">{name}</p>
    </div>
  );
}
