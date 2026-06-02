import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY || "";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export function isAiEnabled(): boolean {
  return Boolean(apiKey);
}

/**
 * Resultado da extração de intenção da IA.
 */
export interface AiParsedIntent {
  intent: "agendar" | "meus_agendamentos" | "cancelar" | "falar_humano" | "saudacao" | "desconhecido";
  serviceName?: string;
  barberName?: string;
  date?: string;       // "hoje", "amanha", "segunda", "15/06", etc
  time?: string;       // "15:00", "tarde", "manha", etc
  confidence: number;  // 0-1
}

/**
 * Usa Claude Haiku para extrair a intenção do cliente a partir de uma
 * mensagem livre, considerando o contexto da loja (serviços e barbeiros).
 *
 * Custo estimado: ~0.3 centavos por chamada (~R$ 0,01-0,02).
 */
export async function parseIntent(
  message: string,
  context: {
    storeName: string;
    services: string[];
    barbers: string[];
    currentStep?: string;
  },
): Promise<AiParsedIntent> {
  const ai = getClient();
  if (!ai) {
    return { intent: "desconhecido", confidence: 0 };
  }

  const systemPrompt = `Você é o assistente de agendamento da barbearia "${context.storeName}".

Sua ÚNICA tarefa é extrair a intenção do cliente a partir da mensagem e retornar JSON puro.

Serviços disponíveis: ${context.services.join(", ")}
Barbeiros disponíveis: ${context.barbers.join(", ")}

Extraia:
- intent: "agendar" | "meus_agendamentos" | "cancelar" | "falar_humano" | "saudacao" | "desconhecido"
- serviceName: nome do serviço mencionado (deve ser um dos listados, ou null)
- barberName: nome do barbeiro mencionado (deve ser um dos listados, ou null)
- date: referência temporal ("hoje", "amanha", "segunda", "15/06", etc, ou null)
- time: horário mencionado ("15:00", "15h", "tarde", "manha", ou null)
- confidence: 0 a 1

Regras:
- Se o cliente disse "oi", "olá", "bom dia", intent = "saudacao"
- Se menciona "agendar", "cortar", "marcar", "quero", nomes de serviço → intent = "agendar"
- Se menciona "meus horários", "meus agendamentos", "quando é" → intent = "meus_agendamentos"
- Se menciona "cancelar", "desmarcar" → intent = "cancelar"
- Se menciona "falar com alguém", "atendente", "humano" → intent = "falar_humano"
- Faça fuzzy matching nos nomes (ex: "degradê" → "Corte Degradê", "Pedro" → "Pedro")
- "tarde" = após 12:00, "manhã" = antes de 12:00
- Retorne APENAS JSON válido, sem markdown, sem explicação.`;

  try {
    const response = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: message }],
      system: systemPrompt,
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";

    // Extrai JSON da resposta (pode vir com whitespace)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { intent: "desconhecido", confidence: 0 };
    }

    const parsed = JSON.parse(jsonMatch[0]) as AiParsedIntent;
    return {
      intent: parsed.intent || "desconhecido",
      serviceName: parsed.serviceName || undefined,
      barberName: parsed.barberName || undefined,
      date: parsed.date || undefined,
      time: parsed.time || undefined,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };
  } catch (error) {
    console.error("[ai-chatbot] Erro ao chamar Claude:", error);
    return { intent: "desconhecido", confidence: 0 };
  }
}

/**
 * Gera uma resposta conversacional da IA quando precisa pedir mais informações
 * ou confirmar o agendamento. Mais natural que templates fixos.
 */
export async function generateReply(
  prompt: string,
  context: { storeName: string },
): Promise<string> {
  const ai = getClient();
  if (!ai) return prompt; // fallback: retorna o prompt como está

  try {
    const response = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: `Você é o atendente virtual da "${context.storeName}", uma barbearia.
Seja simpático, direto e use emojis com moderação. Sempre em português BR.
Responda em no máximo 3 linhas. Nunca invente informações.`,
      messages: [{ role: "user", content: prompt }],
    });

    return response.content[0]?.type === "text"
      ? response.content[0].text
      : prompt;
  } catch {
    return prompt;
  }
}
