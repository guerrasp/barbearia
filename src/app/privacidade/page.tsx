import Link from "next/link";
import KortaLogo from "@/components/brand/KortaLogo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidade — Korta",
  description: "Como o Korta coleta, usa e protege seus dados.",
};

export default function PrivacidadePage() {
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
          <h1>Política de privacidade</h1>
          <p className="text-korta-muted text-sm">
            Última atualização: 25 de abril de 2026
          </p>

          <p>
            Esta Política descreve como o Korta coleta, usa, compartilha e protege
            seus dados pessoais, em conformidade com a Lei Geral de Proteção de
            Dados (LGPD — Lei 13.709/2018).
          </p>

          <h2>1. Quem é o controlador</h2>
          <p>
            O Korta atua como <strong>operador</strong> dos dados dos clientes finais
            das barbearias. Cada dono de barbearia (Admin) é o{" "}
            <strong>controlador</strong> dos dados que cadastra em sua loja e
            responde diretamente aos titulares dessas informações.
          </p>

          <h2>2. Dados que coletamos</h2>
          <p>
            <strong>Do dono da barbearia (Admin):</strong> nome, email, senha
            (criptografada), telefone, dados da loja (nome, endereço, slug),
            informações de pagamento processadas pela Stripe (não armazenamos cartão
            no Korta).
          </p>
          <p>
            <strong>Do cliente final que agenda:</strong> nome, telefone, email
            opcional. Apenas o necessário para o agendamento.
          </p>
          <p>
            <strong>Automaticamente:</strong> endereço IP, tipo de dispositivo,
            páginas acessadas e logs técnicos para garantir segurança e diagnosticar
            problemas.
          </p>

          <h2>3. Por que coletamos</h2>
          <ul>
            <li>Permitir o uso da plataforma e prestação do serviço contratado</li>
            <li>Enviar emails transacionais (confirmações, lembretes)</li>
            <li>Processar pagamentos da assinatura via Stripe</li>
            <li>Prevenir fraudes e abusos</li>
            <li>
              Cumprir obrigações legais (notas fiscais, requisições judiciais)
            </li>
          </ul>

          <h2>4. Com quem compartilhamos</h2>
          <p>
            Não vendemos seus dados. Compartilhamos apenas com prestadores
            essenciais ao funcionamento:
          </p>
          <ul>
            <li>
              <strong>Vercel</strong> — hospedagem da aplicação
            </li>
            <li>
              <strong>Supabase</strong> — banco de dados e autenticação
            </li>
            <li>
              <strong>Stripe</strong> — processamento de pagamentos
            </li>
            <li>
              <strong>Resend</strong> — envio de emails transacionais
            </li>
          </ul>
          <p>
            Todos cumprem padrões internacionais de segurança e proteção de dados.
          </p>

          <h2>5. Cookies e tecnologias similares</h2>
          <p>
            O Korta utiliza apenas cookies essenciais para autenticação e
            funcionamento da sessão. Não utilizamos cookies de rastreamento,
            publicidade ou analytics de terceiros.
          </p>

          <h2>6. Seus direitos como titular (LGPD)</h2>
          <p>
            Você pode, a qualquer momento, exercer os seguintes direitos:
          </p>
          <ul>
            <li>Confirmar a existência de tratamento dos seus dados</li>
            <li>Acessar e corrigir seus dados</li>
            <li>Solicitar exclusão dos dados (exceto os que devemos reter por lei)</li>
            <li>Revogar consentimento</li>
            <li>Portar seus dados para outro fornecedor</li>
          </ul>
          <p>
            Para exercer qualquer desses direitos, entre em contato pelo email da
            sua loja cadastrado no painel administrativo.
          </p>

          <h2>7. Retenção de dados</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Após o cancelamento,
            preservamos por mais 6 meses para fins de auditoria e cumprimento de
            obrigações legais — depois disso, os dados são removidos
            permanentemente.
          </p>

          <h2>8. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais razoáveis para proteger seus
            dados contra acesso não autorizado, alteração ou destruição: criptografia
            em trânsito (HTTPS), senhas com hash, isolamento por loja em todo o banco
            (multi-tenant), logs de auditoria e backups automáticos.
          </p>
          <p>
            Apesar de todos os esforços, nenhum sistema é 100% seguro. Em caso de
            incidente que afete seus dados, comunicaremos por email em até 72 horas.
          </p>

          <h2>9. Crianças e adolescentes</h2>
          <p>
            O Korta não é destinado a menores de 18 anos. Se identificarmos dados
            cadastrados por menores sem autorização, removeremos imediatamente.
          </p>

          <h2>10. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta Política periodicamente. Mudanças materiais serão
            comunicadas por email aos administradores cadastrados.
          </p>

          <h2>11. Contato e encarregado (DPO)</h2>
          <p>
            Para dúvidas sobre tratamento de dados, exercício de direitos ou
            denúncias, entre em contato pelo email cadastrado durante o onboarding.
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
