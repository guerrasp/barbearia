/**
 * Agente de suporte + vendas do Korta.
 *
 * Diferença do chatbot das barbearias (state-machine com steps):
 * Este agente é CONVERSACIONAL — mantém histórico completo das mensagens
 * e usa Claude com a base de conhecimento do produto para responder
 * qualquer dúvida, conduzir vendas e escalar quando necessário.
 *
 * Identificação automática:
 *  - Se o telefone pertence a um lojista cadastrado → modo SUPORTE
 *  - Se não → modo VENDAS (lead novo)
 *
 * Escalação:
 *  - Quando a IA detecta que precisa de humano (bug grave, reembolso,
 *    frustração), inclui [ESCALAR] na resposta e o sistema notifica.
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { KORTA_KNOWLEDGE } from "@/lib/korta-knowledge";
import { PLAN_LABELS } from "@/lib/plan-limits";

// ── Claude client (singleton) ─────────────────────────────────
const apiKey = process.env.ANTHROPIC_API_KEY || "";
let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

// ── Types ─────────────────────────────────────────────────────
interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentConversation {
  messages: AgentMessage[];
  customerPhone: string;
  isExistingCustomer: boolean;
  storeName?: string;
  storePlan?: string;
  escalated: boolean;
}

export interface AgentResult {
  reply: string;
  escalated: boolean;
}

// ── Config ────────────────────────────────────────────────────
const MAX_HISTORY = 20; // últimas 20 mensagens no contexto
export const KORTA_SUPPORT_STORE_ID = "korta-support";

// ── Persistência (reutiliza chatbot_conversations) ────────────
async function loadConv(convKey: string): Promise<AgentConversation> {
  const row = await prisma.chatbotConversation.findUnique({
    where: { storeId_phone: { storeId: KORTA_SUPPORT_STORE_ID, phone: convKey } },
  });

  if (!row) {
    return {
      messages: [],
      customerPhone: "",
      isExistingCustomer: false,
      escalated: false,
    };
  }

  const data = row.data as unknown as Partial<AgentConversation>;
  return {
    messages: Array.isArray(data?.messages) ? data.messages : [],
    customerPhone: data?.customerPhone || "",
    isExistingCustomer: data?.isExistingCustomer || false,
    storeName: data?.storeName,
    storePlan: data?.storePlan,
    escalated: data?.escalated || false,
  };
}

async function saveConv(convKey: string, conv: AgentConversation) {
  // Prisma Json type expects a plain object castable to InputJsonValue
  const data = JSON.parse(JSON.stringify(conv));
  await prisma.chatbotConversation.upsert({
    where: { storeId_phone: { storeId: KORTA_SUPPORT_STORE_ID, phone: convKey } },
    create: {
      storeId: KORTA_SUPPORT_STORE_ID,
      phone: convKey,
      step: conv.escalated ? "escalated" : "active",
      data,
    },
    update: {
      step: conv.escalated ? "escalated" : "active",
      data,
    },
  });
}

// ── Lookup: é cliente existente? ──────────────────────────────
async function lookupCustomer(phone: string): Promise<{
  isCustomer: boolean;
  storeName?: string;
  plan?: string;
}> {
  if (!phone || phone.length < 8) return { isCustomer: false };

  // Busca loja pelo telefone (últimos 8 dígitos para flexibilidade)
  const suffix = phone.slice(-8);
  const store = await prisma.store.findFirst({
    where: {
      OR: [
        { whatsappPhone: { contains: suffix } },
        { phone: { contains: suffix } },
      ],
    },
    select: { name: true, plan: true },
  });

  if (store) {
    return {
      isCustomer: true,
      storeName: store.name,
      plan: PLAN_LABELS[store.plan],
    };
  }

  return { isCustomer: false };
}

// ── Processa mensagem ─────────────────────────────────────────
export async function handleSupportMessage(
  convKey: string,
  phone: string,
  text: string,
): Promise<AgentResult> {
  const ai = getClient();
  if (!ai) {
    return {
      reply:
        "Olá! No momento nosso atendimento automático está indisponível. " +
        "Acesse korta.ia.br para saber mais ou tente novamente em alguns minutos. 🙏",
      escalated: false,
    };
  }

  // Carrega conversa existente
  const conv = await loadConv(convKey);

  // Na primeira mensagem, identifica se é cliente existente
  if (conv.messages.length === 0 && phone) {
    const lookup = await lookupCustomer(phone);
    conv.customerPhone = phone;
    conv.isExistingCustomer = lookup.isCustomer;
    conv.storeName = lookup.storeName;
    conv.storePlan = lookup.plan;
  }

  // Adiciona mensagem do usuário
  conv.messages.push({ role: "user", content: text });

  // Mantém histórico limitado
  if (conv.messages.length > MAX_HISTORY) {
    conv.messages = conv.messages.slice(-MAX_HISTORY);
  }

  // ── Monta contexto do cliente ────────
  let customerContext: string;
  if (conv.isExistingCustomer) {
    customerContext = `
CONTEXTO DO CLIENTE:
- CLIENTE EXISTENTE do Korta.
- Barbearia: "${conv.storeName}"
- Plano atual: ${conv.storePlan}
- Foque em SUPORTE: ajude com dúvidas de uso, configuração, problemas.
- Se a dúvida exigir upgrade de plano, explique naturalmente qual plano resolve.
- Guie passo a passo quando possível ("vá em Menu → Serviços → Novo Serviço").`;
  } else {
    customerContext = `
CONTEXTO DO CLIENTE:
- LEAD — não é cliente ainda.
- Foque em VENDAS CONSULTIVAS: entenda a necessidade, explique como o Korta resolve.
- Não seja agressivo. Responda a dúvida PRIMEIRO, depois sugira o teste grátis.
- Link do teste grátis: korta.ia.br/criar-loja?plan=KORTA_IA
- Se perguntar preço, explique os 4 planos de forma clara.
- Se parecer interessado, mande o link com naturalidade.`;
  }

  // ── System prompt ────────────────────
  const systemPrompt = `Você é o atendente virtual do Korta — SaaS de agendamento com IA para barbearias.
Seu nome é Korta. Você atende pelo WhatsApp oficial da empresa.

${KORTA_KNOWLEDGE}

${customerContext}

REGRAS:
1. Seja simpático, direto e profissional. Português BR sempre.
2. Use emojis com moderação (2-3 por mensagem no máximo).
3. Respostas curtas: 3-5 linhas. Ninguém lê paredes de texto no WhatsApp.
4. NUNCA invente funcionalidades ou preços que não existem na base acima.
5. Se não souber, diga: "Vou verificar com a equipe e te retorno."
6. Se o cliente pedir para falar com humano, quiser reembolso, relatar bug grave,
   ou estiver irritado/frustrado, inclua [ESCALAR] no INÍCIO da resposta.
   O cliente NÃO verá essa tag. Exemplo: "[ESCALAR] Entendo sua frustração..."
7. NUNCA peça dados sensíveis (senha, número de cartão).
8. Quando responder com passos, use bullet points ou números.
9. Se perguntarem algo totalmente fora do contexto (piada, futebol, etc),
   responda brevemente e reconduza: "Haha! Mas me conta, você tem uma barbearia? 😄"
10. Quando um lead perguntar "quanto custa" ou "qual o preço", dê os 4 planos
    de forma resumida e destaque o Korta IA como o mais popular.
11. FORMATAÇÃO: use negrito do WhatsApp com UM asterisco: *texto*.
    NÃO use dois asteriscos (**texto**). NÃO use colchetes para links [texto](url).
    Para links, escreva a URL direto: korta.ia.br/criar-loja`;

  try {
    const response = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: systemPrompt,
      messages: conv.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    let reply =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // ── Converte Markdown → WhatsApp ────────
    // **bold** → *bold*  (WhatsApp usa 1 asterisco)
    // [text](url) → text: url  (WhatsApp não renderiza links markdown)
    reply = reply.replace(/\*\*(.+?)\*\*/g, "*$1*");
    reply = reply.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1: $2");

    // ── Detecta escalação ────────
    let escalated = false;
    if (reply.includes("[ESCALAR]")) {
      escalated = true;
      reply = reply.replace(/\[ESCALAR\]\s*/g, "").trim();
      conv.escalated = true;
    }

    // Salva resposta no histórico
    conv.messages.push({ role: "assistant", content: reply });

    // Persiste no banco
    await saveConv(convKey, conv);

    return { reply, escalated };
  } catch (error) {
    console.error("[korta-agent] Erro Claude:", error);
    return {
      reply:
        "Desculpe, tive um probleminha técnico. Pode repetir a mensagem? 🙏",
      escalated: false,
    };
  }
}
