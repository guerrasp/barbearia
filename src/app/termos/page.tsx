import Link from "next/link";
import KortaLogo from "@/components/brand/KortaLogo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de uso — Korta",
  description: "Termos e condições de uso do Korta.",
};

export default function TermosPage() {
  return (
    <div className="korta-surface min-h-screen bg-korta-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-korta-bg via-korta-bg to-[#060b1a]" />

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6">
        <KortaLogo size="md" href="/" />
        <Link href="/" className="text-sm text-korta-muted hover:text-korta-text">
          ← Voltar
        </Link>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 sm:px-10 pb-20">
        <article className="prose-korta">
          <h1>Termos de uso</h1>
          <p className="text-korta-muted text-sm">
            Última atualização: 25 de abril de 2026
          </p>

          <h2>1. Sobre o Korta</h2>
          <p>
            O Korta é uma plataforma de agendamento online voltada para barbearias e
            salões de beleza. Através do Korta, donos de barbearia podem criar uma
            página pública para receber agendamentos de clientes, gerenciar barbeiros,
            serviços, horários e relatórios financeiros.
          </p>

          <h2>2. Aceitação destes termos</h2>
          <p>
            Ao criar uma conta no Korta, você declara ter lido, compreendido e
            concordado integralmente com estes Termos de uso e com nossa{" "}
            <Link href="/privacidade" className="text-korta-gold underline">
              Política de privacidade
            </Link>
            . Se não concordar, não utilize o serviço.
          </p>

          <h2>3. Cadastro e uso da conta</h2>
          <p>
            Para usar o Korta como dono de barbearia (Admin), você deve ter no
            mínimo 18 anos e fornecer informações verdadeiras, completas e
            atualizadas. Você é responsável por manter a confidencialidade da sua
            senha e por todas as atividades realizadas em sua conta.
          </p>

          <h2>4. Planos, trial e cobrança</h2>
          <p>
            O Korta oferece um período de avaliação gratuito de 14 dias, sem
            necessidade de cartão de crédito. Após o término do trial, o uso
            continuado requer assinatura de um plano pago, com cobrança recorrente
            mensal processada pela Stripe.
          </p>
          <p>
            Os preços vigentes estão disponíveis em{" "}
            <Link href="/para-barbearias" className="text-korta-gold underline">
              /para-barbearias
            </Link>
            . Você pode trocar de plano ou cancelar a assinatura a qualquer momento
            pelo painel administrativo. Cancelamentos têm efeito imediato — não há
            estorno proporcional do mês corrente.
          </p>

          <h2>5. Conduta do usuário</h2>
          <p>Você concorda em não usar o Korta para:</p>
          <ul>
            <li>Atividades ilegais ou que violem direitos de terceiros</li>
            <li>Enviar spam, conteúdo ofensivo, discriminatório ou enganoso</li>
            <li>Tentar acessar dados de outras lojas ou usuários</li>
            <li>Sobrecarregar a infraestrutura via automações abusivas</li>
            <li>
              Coletar dados de clientes para fins não relacionados ao agendamento
            </li>
          </ul>

          <h2>6. Conteúdo do usuário</h2>
          <p>
            Você é o único responsável por todo conteúdo que cadastra (nome da loja,
            descrição, fotos, dados de barbeiros, serviços e clientes). O Korta
            apenas hospeda esses dados — não os endossamos nem revisamos previamente.
          </p>

          <h2>7. Disponibilidade e suporte</h2>
          <p>
            Nos esforçamos para manter o Korta disponível 24/7, mas não garantimos
            funcionamento ininterrupto. Manutenções programadas, falhas em provedores
            terceirizados (Vercel, Supabase, Stripe, Resend) ou eventos de força
            maior podem causar indisponibilidade temporária.
          </p>

          <h2>8. Limitação de responsabilidade</h2>
          <p>
            Na máxima extensão permitida por lei, o Korta não se responsabiliza por
            lucros cessantes, perda de dados, danos indiretos ou consequenciais
            decorrentes do uso ou impossibilidade de uso da plataforma.
          </p>

          <h2>9. Encerramento</h2>
          <p>
            Você pode encerrar sua conta a qualquer momento via painel ou solicitando
            por email. O Korta pode suspender ou encerrar contas que violem estes
            Termos, mediante aviso prévio razoável quando aplicável.
          </p>

          <h2>10. Alterações</h2>
          <p>
            Podemos atualizar estes Termos periodicamente. Alterações materiais serão
            comunicadas por email aos administradores cadastrados com pelo menos 15
            dias de antecedência.
          </p>

          <h2>11. Foro e legislação aplicável</h2>
          <p>
            Estes Termos são regidos pelas leis brasileiras. Eventuais disputas serão
            resolvidas no foro da comarca onde você tem domicílio (consumidor) ou,
            caso pessoa jurídica, no foro de Belo Horizonte/MG.
          </p>

          <h2>12. Contato</h2>
          <p>
            Dúvidas sobre estes Termos? Fale conosco pelo email cadastrado durante o
            onboarding ou pelos canais publicados em nosso site.
          </p>
        </article>
      </main>

      <footer className="relative z-10 py-8 text-center border-t border-white/5">
        <p className="text-xs text-korta-muted/70">
          Korta &copy; 2026 · agendamento para barbearias
        </p>
      </footer>
    </div>
  );
}
