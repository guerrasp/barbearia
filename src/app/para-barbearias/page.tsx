import Link from "next/link";
import KortaLogo from "@/components/brand/KortaLogo";
import {
  ArrowRight,
  Check,
  Sparkles,
  Users,
  Crown,
  Rocket,
  Bot,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Korta para barbearias — planos e funcionalidades",
  description:
    "Receba agendamentos 24h, gerencie barbeiros, comissões e clientes. 14 dias grátis em qualquer plano, sem cartão.",
};

interface Plan {
  name: string;
  badge?: string;
  price: string;
  priceSuffix?: string;
  description: string;
  cta: { label: string; href: string };
  highlight?: boolean;
  icon: React.ReactNode;
  features: string[];
}

const PLANS: Plan[] = [
  {
    name: "Pioneiro",
    badge: "Mais acessível",
    price: "R$ 39,90",
    priceSuffix: "/mês",
    description: "Para começar agora — sem cartão nos 14 dias de teste.",
    cta: { label: "Começar trial grátis", href: "/criar-loja" },
    icon: <Rocket className="w-5 h-5" />,
    features: [
      "Até 2 barbeiros",
      "Agendamentos ilimitados",
      "Link público próprio",
      "Lembretes por WhatsApp e email",
      "Painel + relatórios básicos",
    ],
  },
  {
    name: "Pro",
    price: "R$ 69,90",
    priceSuffix: "/mês",
    description: "Para barbearias que cresceram do dono solo para uma equipe.",
    cta: { label: "Começar trial grátis", href: "/criar-loja?plan=PRO" },
    icon: <Sparkles className="w-5 h-5" />,
    features: [
      "Até 5 barbeiros",
      "Lembretes por WhatsApp e email",
      "Comissão automática por barbeiro",
      "Múltiplos serviços por horário",
      "Suporte prioritário",
    ],
  },
  {
    name: "Business",
    price: "R$ 99,90",
    priceSuffix: "/mês",
    description: "Multi-unidades, time grande e IA para experimentar.",
    cta: { label: "Começar trial grátis", href: "/criar-loja?plan=BUSINESS" },
    icon: <Crown className="w-5 h-5" />,
    features: [
      "Barbeiros ilimitados",
      "Atendente virtual IA (50 msg/mês)",
      "Relatórios avançados + exportação CSV",
      "Múltiplas unidades (em breve)",
      "Tudo do Pro",
    ],
  },
  {
    name: "Korta IA",
    badge: "Novo",
    price: "R$ 149,90",
    priceSuffix: "/mês",
    description: "Atendente virtual 24h — sua barbearia nunca dorme.",
    cta: { label: "Começar trial grátis", href: "/criar-loja?plan=KORTA_IA" },
    highlight: true,
    icon: <Bot className="w-5 h-5" />,
    features: [
      "Atendente virtual IA ilimitado 24h",
      "Agendamento por conversa no WhatsApp",
      "Barbeiros ilimitados",
      "Relatórios avançados + exportação CSV",
      "Tudo do Business",
    ],
  },
];

export default function ParaBarbeariaPage() {
  return (
    <div className="korta-surface min-h-screen bg-korta-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-korta-bg via-korta-bg to-[#060b1a]" />
      <div className="absolute top-[-25%] right-[-10%] w-[600px] h-[600px] bg-korta-gold/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-30%] left-[-15%] w-[500px] h-[500px] bg-korta-surface/60 rounded-full blur-[100px]" />

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6">
        <KortaLogo size="md" href="/" />
        <Link
          href="/criar-loja"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-korta-gold text-korta-bg text-sm font-semibold hover:bg-korta-gold-hover transition-colors"
        >
          Criar minha loja <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 pb-20">
        {/* Hero */}
        <section className="text-center pt-8 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-korta-gold/10 border border-korta-gold/20 mb-5">
            <Users className="w-3.5 h-3.5 text-korta-gold" />
            <span className="text-xs font-medium text-korta-gold">
              Para donos de barbearia
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-korta-text tracking-tight">
            Planos que crescem com{" "}
            <span className="text-korta-gold">você</span>.
          </h1>
          <p className="mt-4 text-lg text-korta-muted max-w-2xl mx-auto">
            14 dias grátis em qualquer plano. Sem cartão para começar. Cancele
            quando quiser.
          </p>
        </section>

        {/* Planos */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </section>

        {/* Por que Korta */}
        <section className="mt-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-korta-text text-center">
            Por que o Korta é <span className="text-korta-gold">diferente</span>
          </h2>
          <p className="text-center text-korta-muted mt-3 max-w-2xl mx-auto">
            Comparamos com os principais sistemas do mercado.
          </p>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 text-left text-korta-muted font-medium">Recurso</th>
                  <th className="py-3 text-center text-korta-gold font-bold">Korta</th>
                  <th className="py-3 text-center text-korta-muted font-medium">Concorrência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-korta-text">
                {[
                  ["WhatsApp em todos os planos", true, "Geralmente add-on ou planos caros"],
                  ["CRM com clientes inativos", true, "Nenhum oferece integrado"],
                  ["Aniversariantes automático", true, "Nenhum oferece"],
                  ["Dashboard com faturamento por barbeiro", true, "Só em planos de R$ 179+"],
                  ["Horários de pico + ocupação", true, "Raro, geralmente manual"],
                  ["Atendente virtual IA", true, "Apenas menus numerados"],
                  ["Portal exclusivo do barbeiro", true, "Poucos oferecem"],
                  ["A partir de R$ 39,90/mês", true, "Média do mercado: R$ 89+"],
                ].map(([feature, korta, others]) => (
                  <tr key={feature as string}>
                    <td className="py-3">{feature as string}</td>
                    <td className="py-3 text-center">
                      {korta ? <Check className="w-5 h-5 text-korta-gold mx-auto" /> : <span className="text-korta-muted">—</span>}
                    </td>
                    <td className="py-3 text-center text-korta-muted text-xs">{others as string}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ curto */}
        <section className="mt-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-korta-text text-center">
            Perguntas frequentes
          </h2>
          <div className="mt-8 grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <Faq
              q="Preciso de cartão para começar?"
              a="Não. Você tem 14 dias para testar tudo sem informar cartão.
              No fim do trial você escolhe um plano para continuar."
            />
            <Faq
              q="Como meu cliente agenda?"
              a="Você ganha um link único e exclusivo da sua loja para colocar no
              Instagram, WhatsApp e Google. O cliente escolhe o serviço, barbeiro e
              horário em poucos toques."
            />
            <Faq
              q="Posso trocar de plano depois?"
              a="Sim. Você troca direto pelo painel a qualquer momento, sem
              perder histórico nem precisar refazer agenda."
            />
            <Faq
              q="O que é o Atendente Virtual IA?"
              a="É como ter um recepcionista 24h no WhatsApp da sua loja. O cliente manda mensagem, a IA entende o que ele quer, sugere horários e agenda automaticamente. Disponível no Business (50 msg/mês) e ilimitado no Korta IA."
            />
            <Faq
              q="E se eu tiver mais de uma unidade?"
              a="O plano Business e Korta IA suportam multi-unidades. Gerencie todas as lojas em um único painel."
            />
          </div>
        </section>

        {/* CTA final */}
        <section className="mt-16 bg-korta-surface rounded-2xl p-8 sm:p-12 border border-korta-gold/15 text-center">
          <Sparkles className="w-8 h-8 text-korta-gold mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-korta-text">
            Bora colocar sua barbearia no piloto automático?
          </h2>
          <p className="text-korta-muted mt-3 max-w-xl mx-auto">
            14 dias grátis. 2 minutos para configurar. Sem cartão.
          </p>
          <Link
            href="/criar-loja"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-lg bg-korta-gold text-korta-bg font-semibold hover:bg-korta-gold-hover transition-colors"
          >
            Começar trial grátis <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
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

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={`relative rounded-2xl p-6 border transition-all ${
        plan.highlight
          ? "bg-korta-surface border-korta-gold/40 shadow-2xl shadow-korta-gold/10 md:scale-[1.02]"
          : "bg-korta-surface/70 border-white/5"
      }`}
    >
      {plan.badge && (
        <span
          className={`absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-bold ${
            plan.highlight
              ? "bg-korta-gold text-korta-bg"
              : "bg-white/10 text-korta-muted border border-white/10"
          }`}
        >
          {plan.badge}
        </span>
      )}

      <div className="flex items-center gap-2 mb-2 text-korta-gold">
        {plan.icon}
        <h3 className="text-lg font-bold text-korta-text">{plan.name}</h3>
      </div>
      <p className="text-sm text-korta-muted min-h-[40px]">{plan.description}</p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-korta-text">{plan.price}</span>
        {plan.priceSuffix && (
          <span className="text-sm text-korta-muted">{plan.priceSuffix}</span>
        )}
      </div>
      <p className="mt-1.5 text-xs text-korta-gold flex items-center gap-1">
        <Check className="w-3.5 h-3.5" /> 14 dias grátis · sem cartão
      </p>

      <Link
        href={plan.cta.href}
        className={`mt-5 inline-flex items-center justify-center w-full gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          plan.highlight
            ? "bg-korta-gold text-korta-bg hover:bg-korta-gold-hover"
            : "bg-white/5 text-korta-text hover:bg-white/10 border border-white/5"
        }`}
      >
        {plan.cta.label} <ArrowRight className="w-3.5 h-3.5" />
      </Link>

      <ul className="mt-6 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-korta-text">
            <Check className="w-4 h-4 text-korta-gold mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-korta-surface/60 rounded-xl p-5 border border-white/5">
      <h3 className="text-korta-text font-semibold">{q}</h3>
      <p className="text-sm text-korta-muted mt-2 leading-relaxed">{a}</p>
    </div>
  );
}
