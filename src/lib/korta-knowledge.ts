/**
 * Base de conhecimento do Korta.
 * Usada pelo agente de suporte/vendas para responder perguntas com precisão.
 *
 * IMPORTANTE: manter atualizada quando features, preços ou planos mudarem.
 */

export const KORTA_KNOWLEDGE = `
# Korta — Sistema de Agendamento com IA para Barbearias

## O que é o Korta?
O Korta é um SaaS de agendamento online para barbearias e salões.
Nosso diferencial é o atendente de IA que funciona no WhatsApp da barbearia,
respondendo clientes e agendando horários automaticamente, 24 horas por dia.
Site: korta.ia.br

## Planos e Preços (todos com 14 dias grátis, sem cartão)

### Pioneiro — R$ 39,90/mês
- Até 2 barbeiros
- Agenda online com link de agendamento
- Lembretes por WhatsApp (automáticos, 24h antes)
- Página pública da barbearia

### Pro — R$ 69,90/mês
- Até 5 barbeiros
- Tudo do Pioneiro
- Personalização da página (logo, capa)

### Business — R$ 99,90/mês
- Barbeiros ilimitados
- Relatórios avançados (faturamento por período, barbeiro, serviço + CSV)
- CRM integrado (clientes inativos, aniversariantes, histórico)
- Clube de assinatura (planos mensais para clientes)
- IA do WhatsApp: 50 mensagens/mês
- Multi-unidade (mais de uma loja)

### Korta IA — R$ 149,90/mês (mais popular)
- Tudo do Business
- IA do WhatsApp ILIMITADA
- Atendente de IA 24h no WhatsApp
- Prioridade no suporte
- Ideal para quem quer automatizar o atendimento por completo

## Funcionalidades Detalhadas

### Agenda Online
- Cada barbeiro tem sua própria agenda independente
- Horários configuráveis por dia da semana
- Bloqueio de horários (folgas, intervalos, feriados)
- Visualização por dia e semana
- Clientes agendam pelo link público ou pelo WhatsApp

### Atendente de IA (WhatsApp)
- Responde mensagens automaticamente no WhatsApp da barbearia
- Entende linguagem natural (ex: "quero cortar o cabelo amanhã de tarde")
- NÃO é menu robótico (não manda "digite 1, 2, 3...")
- Agenda verificando disponibilidade real dos barbeiros
- Responde dúvidas (endereço, serviços, preços, horários)
- Reconhece clientes que já vieram antes (pelo número)
- Escala para o humano quando necessário
- Funciona 24h — inclusive madrugada, domingo e feriado
- Disponível: Business (50 msg/mês) e Korta IA (ilimitado)

### Lembretes Automáticos
- WhatsApp enviado automaticamente 24h antes do agendamento
- Reduz faltas (no-show) em até 50%
- Incluído em TODOS os planos (inclusive Pioneiro)
- O cliente recebe lembrete sem a barbearia fazer nada

### CRM Integrado (Business e Korta IA)
- Lista de clientes inativos (não voltaram há X dias)
- Aniversariantes do mês
- Histórico completo do cliente (todos os cortes e gastos)
- Filtros e busca por nome/telefone

### Relatórios (Business e Korta IA)
- Faturamento total e por período
- Por barbeiro e por serviço
- Exportação em CSV
- KPIs: ticket médio, total de agendamentos, receita

### Clube de Assinatura (Business e Korta IA)
- O dono cria planos mensais (ex: "2 cortes por mês por R$ 70")
- Clientes assinam via painel
- Garante receita recorrente para a barbearia
- Controle de créditos por mês

### Login do Barbeiro / Funcionário
- Cada barbeiro pode ter seu próprio login separado do admin
- Visualiza apenas sua agenda pessoal
- O admin cria o acesso pelo painel (menu Barbeiros → Criar acesso)
- Não precisa compartilhar a senha do dono

## Como Começar (passo a passo)

1. Acesse korta.ia.br/criar-loja e clique em "Começar grátis"
2. Crie sua conta com email e senha
3. Dê o nome da barbearia
4. Cadastre seus serviços (nome, preço, duração em minutos)
5. Adicione seus barbeiros (nome, telefone, email)
6. Configure os horários de funcionamento de cada barbeiro
7. Pronto! Compartilhe o link da agenda com seus clientes

### Como conectar o WhatsApp (IA)
1. No painel admin, clique no menu "WhatsApp"
2. Clique em "Conectar WhatsApp"
3. Escaneie o QR Code com o WhatsApp da barbearia
4. Pronto — a IA já começa a responder automaticamente
Obs: usa o MESMO WhatsApp que a barbearia já tem, não precisa de número novo.

### Como adicionar um serviço
1. Menu lateral → Serviços
2. Clique em "Novo Serviço"
3. Preencha nome, preço e duração (em minutos)
4. Salvar

### Como adicionar um barbeiro
1. Menu lateral → Barbeiros
2. Clique em "Novo Barbeiro"
3. Preencha nome, telefone e email
4. Configure os horários de trabalho
5. Salvar

### Como ver relatórios
1. Menu lateral → Relatórios (disponível em Business e Korta IA)
2. Escolha o período
3. Veja KPIs, gráficos por barbeiro e serviço
4. Exporte em CSV se quiser

### Como criar login pro barbeiro
1. Menu lateral → Barbeiros
2. Clique no ícone de chave ao lado do barbeiro
3. Defina email e senha pro barbeiro
4. O barbeiro acessa com esses dados

### Como mudar de plano
1. Menu lateral → Assinatura
2. Clique em "Alterar plano"
3. Escolha o novo plano
4. O upgrade é imediato; downgrade ao final do ciclo

## Perguntas Frequentes

P: Preciso de um número novo de WhatsApp?
R: Não. O Korta funciona com o WhatsApp que sua barbearia já usa.

P: Tem fidelidade ou multa pra cancelar?
R: Não. Cancele quando quiser, sem multa e sem burocracia.

P: Precisa de cartão de crédito para testar?
R: Não. São 14 dias grátis de qualquer plano, sem cartão.

P: A IA responde igual a um robô chato?
R: Não. Ela conversa naturalmente, como se fosse um atendente humano.

P: Funciona no celular?
R: Sim. O painel é responsivo, funciona em celular, tablet e computador.

P: Posso mudar de plano depois?
R: Sim. Upgrade ou downgrade a qualquer momento.

P: Quantos clientes posso ter?
R: Ilimitados em todos os planos.

P: Funciona só para barbearia?
R: O foco é em barbearias, mas funciona para qualquer salão de beleza.

P: A IA funciona com qualquer idioma?
R: Otimizada para português brasileiro.

P: E se a IA não souber responder?
R: Ela avisa educadamente e pode chamar o responsável pela barbearia.

P: Como funciona o pagamento?
R: Via cartão de crédito no Stripe (plataforma segura internacional). Cobrança mensal.

P: Posso cancelar o teste antes dos 14 dias?
R: Sim, sem cobrança nenhuma.

## Links Importantes
- Criar conta / teste grátis: korta.ia.br/criar-loja
- Teste com o plano Korta IA: korta.ia.br/criar-loja?plan=KORTA_IA
- Landing page: korta.ia.br/lp
- Termos de uso: korta.ia.br/termos
- Privacidade: korta.ia.br/privacidade
`;
