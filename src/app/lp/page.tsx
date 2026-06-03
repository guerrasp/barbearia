import Link from "next/link";
import KortaLogo from "@/components/brand/KortaLogo";
import {
  ArrowRight, Check, X, Bot, CalendarCheck, MessageCircle,
  TrendingUp, ShieldCheck, Star, Zap, Moon, BellRing, Users,
  DollarSign, Gift, Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Reveal from "./Reveal";
import AnimatedChatDemo from "./AnimatedChatDemo";

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
        <section className="pt-6 pb-12 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <Reveal>
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
          </Reveal>

          {/* Demo do chatbot — digitando ao vivo */}
          <Reveal delay={150}>
            <AnimatedChatDemo />
          </Reveal>
        </section>

        {/* ── BARRA DE NÚMEROS ── */}
        <Reveal>
          <section className="py-7 border-y border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <NumberStat value="24h" label="Atendendo sem parar" />
            <NumberStat value="< 5s" label="Tempo de resposta" />
            <NumberStat value="-50%" label="Faltas (no-show)" />
            <NumberStat value="2 min" label="Para configurar" />
          </section>
        </Reveal>

        {/* ── DOR ── */}
        <section className="py-14 border-b border-white/5 text-center">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-bold text-korta-text max-w-2xl mx-auto leading-tight">
              Todo cliente que você não responde a tempo,{" "}
              <span className="text-korta-gold">vira corte na concorrência.</span>
            </h2>
            <p className="mt-4 text-korta-muted max-w-xl mx-auto">
              Cliente manda mensagem às 22h, você só vê de manhã — ele já marcou em outra.
              Você atende uma cadeira e o celular fica apitando sem parar. No fim do mês,
              a conta é cruel: <strong className="text-korta-text">horário vago é dinheiro que não volta.</strong>
            </p>
          </Reveal>

          <div className="mt-9 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <Reveal delay={0}>
              <PainCard
                icon={<Moon />}
                title="Mensagem de madrugada"
                desc="Cliente quer marcar às 23h. Você responde só amanhã — tarde demais."
              />
            </Reveal>
            <Reveal delay={100}>
              <PainCard
                icon={<MessageCircle />}
                title="Celular não para"
                desc="Atender no WhatsApp no meio do corte tira seu foco e atrasa todo mundo."
              />
            </Reveal>
            <Reveal delay={200}>
              <PainCard
                icon={<X />}
                title="Cliente que some"
                desc="Marcou e não apareceu. Sem lembrete, a cadeira fica vazia e você no prejuízo."
              />
            </Reveal>
          </div>
        </section>

        {/* ── SOLUÇÃO / COMO FUNCIONA ── */}
        <section className="py-14 border-b border-white/5">
          <Reveal>
            <p className="text-center text-sm font-semibold text-korta-gold uppercase tracking-wide">A solução</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-korta-text text-center mt-2 max-w-2xl mx-auto leading-tight">
              Um atendente de IA que <span className="text-korta-gold">nunca dorme</span> e fecha horário sozinho
            </h2>
            <p className="text-center text-korta-muted mt-3 max-w-xl mx-auto">
              Funciona no seu próprio WhatsApp. O cliente conversa normal, como conversaria com você.
              A IA entende, oferece os horários livres e já deixa agendado.
            </p>
          </Reveal>

          <div className="mt-10 grid md:grid-cols-3 gap-5">
            <Reveal delay={0}>
              <StepCard
                step="1"
                icon={<MessageCircle />}
                title="O cliente chama no WhatsApp"
                desc='"Tem horário pra amanhã?", "qual o endereço?", "fazem barba?" — a IA entende tudo e responde na hora.'
              />
            </Reveal>
            <Reveal delay={100}>
              <StepCard
                step="2"
                icon={<CalendarCheck />}
                title="A IA agenda sozinha"
                desc="Mostra os horários livres do barbeiro certo, confirma o serviço e fecha o agendamento — sem você."
              />
            </Reveal>
            <Reveal delay={200}>
              <StepCard
                step="3"
                icon={<BellRing />}
                title="Lembrete automático"
                desc="No dia anterior, o cliente recebe um lembrete pelo WhatsApp. Menos falta, agenda cheia."
              />
            </Reveal>
          </div>
        </section>

        {/* ── DEMO EM DESTAQUE ── */}
        <section className="py-14 border-b border-white/5">
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
            <Reveal>
              <p className="text-sm font-semibold text-korta-gold uppercase tracking-wide">Veja na prática</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-korta-text mt-2 leading-tight">
                Não é um robô de menu. É uma conversa de verdade.
              </h2>
              <p className="mt-4 text-korta-muted">
                A maioria dos sistemas só manda &quot;digite 1 para agendar&quot;. O cliente odeia.
                O Korta entende linguagem natural — pergunta de endereço, tipos de corte,
                preço, horário — e <strong className="text-korta-text">conduz até o agendamento</strong>.
              </p>
              <ul className="mt-6 space-y-3">
                <FeatureLine text="Responde dúvidas (endereço, serviços, preços)" />
                <FeatureLine text="Sugere o melhor horário disponível" />
                <FeatureLine text="Reconhece cliente que já é da casa" />
                <FeatureLine text="Passa pro humano quando precisa" />
              </ul>
              <Link
                href={CTA_HREF}
                className="inline-flex items-center gap-2 mt-7 px-6 py-3 rounded-xl bg-korta-gold text-korta-bg font-bold hover:bg-korta-gold-hover transition-colors"
              >
                Quero isso na minha barbearia <ArrowRight className="w-4 h-4" />
              </Link>
            </Reveal>
            <Reveal delay={150}>
              <AnimatedChatDemo />
            </Reveal>
          </div>
        </section>

        {/* ── ALÉM DO CHATBOT (features) ── */}
        <section className="py-14 border-b border-white/5">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-bold text-korta-text text-center">
              Muito mais que um chatbot
            </h2>
            <p className="text-center text-korta-muted mt-2 max-w-xl mx-auto">
              O Korta é o sistema completo da sua barbearia — tudo num lugar só.
            </p>
          </Reveal>
          <div className="mt-9 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <CalendarCheck />, t: "Agenda online", d: "Você e cada barbeiro veem a agenda em tempo real, no celular ou no PC." },
              { icon: <Users />, t: "CRM integrado", d: "Clientes inativos, aniversariantes e histórico — para você trazer gente de volta." },
              { icon: <BellRing />, t: "Lembretes automáticos", d: "Confirmação e lembrete por WhatsApp que derrubam as faltas." },
              { icon: <TrendingUp />, t: "Relatórios de faturamento", d: "Quanto entrou, por barbeiro, por serviço. Exporta em CSV." },
              { icon: <Gift />, t: "Clube de assinatura", d: "Receita recorrente: cliente paga mensalidade e corta quando quiser." },
              { icon: <Bot />, t: "Atendente de IA", d: "O cérebro que conversa, agenda e atende 24 horas no WhatsApp." },
            ].map((f, i) => (
              <Reveal key={f.t} delay={(i % 3) * 80}>
                <FeatureCard icon={f.icon} title={f.t} desc={f.d} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── COMPARATIVO ── */}
        <section className="py-14 border-b border-white/5">
          <Reveal>
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
                    ["Clube de assinatura (receita recorrente)", true, "Raro de encontrar"],
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
          </Reveal>
        </section>

        {/* ── ROI / MATEMÁTICA ── */}
        <section className="py-14 border-b border-white/5">
          <Reveal>
            <div className="bg-korta-surface/40 rounded-2xl p-8 sm:p-10 border border-white/5">
              <div className="flex items-center gap-2 justify-center mb-3">
                <DollarSign className="w-5 h-5 text-korta-gold" />
                <p className="text-sm font-semibold text-korta-gold uppercase tracking-wide">Faz a conta</p>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-korta-text text-center max-w-2xl mx-auto leading-tight">
                Recuperar <span className="text-korta-gold">1 cliente por semana</span> já paga o Korta — e sobra.
              </h2>
              <p className="text-center text-korta-muted mt-4 max-w-xl mx-auto">
                Um corte médio sai por R$ 45. Se a IA recupera só 1 agendamento por semana
                que você perderia por não responder a tempo, são ~R$ 180 a mais por mês.
                O plano mais completo custa <strong className="text-korta-text">menos que isso</strong>.
              </p>
              <div className="mt-7 grid grid-cols-3 gap-4 max-w-lg mx-auto text-center">
                <div>
                  <p className="text-2xl font-bold text-korta-gold">+4</p>
                  <p className="text-xs text-korta-muted mt-1">cortes/mês recuperados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-korta-gold">R$ 180</p>
                  <p className="text-xs text-korta-muted mt-1">a mais no caixa</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-korta-gold">∞</p>
                  <p className="text-xs text-korta-muted mt-1">horas livres pra você</p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── PROVA SOCIAL ── */}
        <section className="py-14 border-b border-white/5">
          <Reveal>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-korta-gold fill-korta-gold" />)}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-korta-text text-center">
              Barbeiros que pararam de perder cliente
            </h2>
          </Reveal>
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {[
              { text: "A IA agenda enquanto eu tô atendendo. Minha agenda lotou e eu não respondo mais WhatsApp na correria.", name: "Rafael, Barber Studio" },
              { text: "Cliente manda mensagem de madrugada e já sai agendado. Antes eu perdia esses horários todos.", name: "Marcos, Premium Cortes" },
              { text: "O lembrete automático cortou as faltas pela metade. Só isso já pagou a mensalidade.", name: "João, Vintage Barbearia" },
            ].map((q, i) => (
              <Reveal key={q.name} delay={i * 90}>
                <Quote text={q.text} name={q.name} />
              </Reveal>
            ))}
          </div>
          <p className="text-center text-[11px] text-korta-muted/50 mt-4">Depoimentos ilustrativos.</p>
        </section>

        {/* ── FAQ ── */}
        <section className="py-14 border-b border-white/5">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-bold text-korta-text text-center">Perguntas frequentes</h2>
          </Reveal>
          <div className="mt-8 max-w-2xl mx-auto space-y-3">
            {[
              { q: "Preciso de um número novo de WhatsApp?", a: "Não. O Korta funciona com o WhatsApp que sua barbearia já usa. A conexão leva 1 minuto, é só ler um QR Code." },
              { q: "A IA responde igual a um robô chato?", a: "Não. Ela entende linguagem natural — o cliente escreve como escreveria pra você. E quando algo foge do agendamento, ela chama você." },
              { q: "É difícil de configurar?", a: "Em 2 minutos você cadastra serviços, barbeiros e horários. A partir daí a IA já começa a atender." },
              { q: "Tem fidelidade ou multa pra cancelar?", a: "Nenhuma. Você testa 14 dias grátis, sem cartão, e cancela quando quiser." },
              { q: "Funciona pra mais de um barbeiro?", a: "Sim. Cada barbeiro tem a própria agenda e login, e a IA agenda no profissional certo." },
            ].map((item, i) => (
              <Reveal key={item.q} delay={Math.min(i, 3) * 60}>
                <FaqItem q={item.q} a={item.a} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── OFERTA / CTA FINAL ── */}
        <section className="py-14">
          <Reveal>
            <div className="bg-korta-surface rounded-2xl p-8 sm:p-12 border border-korta-gold/20 text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-korta-gold/10 rounded-full blur-3xl" />
              <div className="relative">
                <Sparkles className="w-8 h-8 text-korta-gold mx-auto mb-4" />
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
                  <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-korta-gold" /> Pronto em 2 minutos</span>
                </div>
              </div>
            </div>
          </Reveal>
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

function NumberStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl sm:text-3xl font-bold text-korta-gold">{value}</p>
      <p className="text-xs text-korta-muted mt-1">{label}</p>
    </div>
  );
}

function PainCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-korta-surface/40 rounded-xl p-5 border border-white/5 h-full">
      <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3 [&>svg]:w-4.5 [&>svg]:h-4.5">
        {icon}
      </div>
      <h3 className="text-korta-text font-semibold text-sm">{title}</h3>
      <p className="text-xs text-korta-muted mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ step, icon, title, desc }: { step: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-korta-surface/50 rounded-xl p-6 border border-white/5 h-full relative">
      <span className="absolute top-5 right-5 text-3xl font-bold text-korta-gold/15">{step}</span>
      <div className="w-10 h-10 rounded-lg bg-korta-gold/10 border border-korta-gold/20 flex items-center justify-center text-korta-gold mb-4 [&>svg]:w-5 [&>svg]:h-5">
        {icon}
      </div>
      <h3 className="text-korta-text font-semibold">{title}</h3>
      <p className="text-sm text-korta-muted mt-2 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureLine({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-korta-text">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-korta-gold/15 flex items-center justify-center shrink-0">
        <Check className="w-3 h-3 text-korta-gold" />
      </span>
      {text}
    </li>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-korta-surface/50 rounded-xl p-5 border border-white/5 h-full">
      <div className="w-9 h-9 rounded-lg bg-korta-gold/10 border border-korta-gold/20 flex items-center justify-center text-korta-gold mb-3 [&>svg]:w-4.5 [&>svg]:h-4.5">
        {icon}
      </div>
      <h3 className="text-korta-text font-semibold text-sm">{title}</h3>
      <p className="text-xs text-korta-muted mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}

function Quote({ text, name }: { text: string; name: string }) {
  return (
    <div className="bg-korta-surface/50 rounded-xl p-5 border border-white/5 h-full">
      <div className="flex gap-0.5 mb-2">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-korta-gold fill-korta-gold" />)}
      </div>
      <p className="text-sm text-korta-text leading-relaxed">&quot;{text}&quot;</p>
      <p className="text-xs text-korta-muted mt-3 font-medium">{name}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group bg-korta-surface/40 rounded-xl border border-white/5 px-5 py-4">
      <summary className="flex items-center justify-between cursor-pointer list-none text-korta-text font-medium text-sm">
        {q}
        <span className="ml-3 text-korta-gold transition-transform group-open:rotate-45 text-xl leading-none">+</span>
      </summary>
      <p className="text-sm text-korta-muted mt-3 leading-relaxed">{a}</p>
    </details>
  );
}
