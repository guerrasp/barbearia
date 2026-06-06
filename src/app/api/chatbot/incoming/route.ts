import { NextRequest, NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/chatbot";
import { handleSupportMessage, KORTA_SUPPORT_STORE_ID } from "@/lib/korta-agent";
import { prisma } from "@/lib/prisma";
import { limitsFor } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WHATSAPP_SERVER = process.env.WHATSAPP_SERVER_URL || "";
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || "";
const CHATBOT_API_KEY = process.env.WHATSAPP_API_KEY || ""; // mesma key do servidor WhatsApp
const ESCALATION_PHONE = process.env.KORTA_ESCALATION_PHONE || "";

/**
 * POST /api/chatbot/incoming
 *
 * Recebe mensagens do whatsapp-server.js (webhook).
 *
 * Duas funções:
 *  1) storeId normal  → chatbot de agendamento da barbearia (state machine)
 *  2) storeId = "korta-support" → agente de suporte/vendas do Korta (conversacional)
 *
 * Body: { storeId, phone, text, messageId }
 * Headers: X-API-Key (mesma do servidor WhatsApp)
 */
export async function POST(req: NextRequest) {
  // Auth via API key (mesma do whatsapp-server)
  const apiKey = req.headers.get("x-api-key");
  if (!CHATBOT_API_KEY || apiKey !== CHATBOT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { storeId, phone, text } = body;
    const convKey: string = body.convKey || phone;
    const replyJid: string = body.replyJid || phone;

    if (!storeId || !convKey || !text) {
      return NextResponse.json({ error: "storeId, convKey e text obrigatórios" }, { status: 400 });
    }

    // ── Rota: Agente de suporte/vendas do Korta ──────────
    if (storeId === KORTA_SUPPORT_STORE_ID) {
      return handleKortaSupport(convKey, phone, text, replyJid);
    }

    // ── Rota: Chatbot da barbearia (fluxo existente) ─────
    // Verifica o plano da loja e limite de mensagens
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { plan: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
    }

    const limits = limitsFor(store.plan);
    if (limits.aiMessagesPerMonth === 0) {
      return NextResponse.json({ skipped: "plan_no_chatbot" });
    }

    // Verifica limite mensal (se não for ilimitado)
    if (Number.isFinite(limits.aiMessagesPerMonth)) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthCount = await prisma.chatbotMessage.count({
        where: {
          storeId,
          createdAt: { gte: startOfMonth },
        },
      });

      if (monthCount >= limits.aiMessagesPerMonth) {
        await sendWhatsAppReply(storeId, replyJid,
          "O limite de atendimento automático deste mês foi atingido. " +
          "Entre em contato diretamente com a barbearia para agendar. " +
          "Obrigado pela compreensão! 🙏"
        );
        return NextResponse.json({ skipped: "limit_reached", monthCount });
      }
    }

    // Processa a mensagem (convKey = chave estável da conversa; phone = telefone real do cliente)
    const result = await handleIncomingMessage(storeId, convKey, phone, text);

    if (!result.reply) {
      return NextResponse.json({ skipped: "no_reply" });
    }

    // Envia resposta via WhatsApp (no JID original que chegou)
    await sendWhatsAppReply(storeId, replyJid, result.reply);

    // Registra no log se contou como mensagem IA
    if (result.aiMessageCounted) {
      await prisma.chatbotMessage.create({
        data: { storeId, phone: convKey, direction: "BOT_REPLY" },
      }).catch(() => {}); // best-effort
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("[chatbot/incoming]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ── Agente de suporte/vendas do Korta ─────────────────────────
async function handleKortaSupport(
  convKey: string,
  phone: string,
  text: string,
  replyJid: string,
) {
  try {
    const result = await handleSupportMessage(convKey, phone, text);

    // Envia resposta ao cliente
    await sendWhatsAppReply(KORTA_SUPPORT_STORE_ID, replyJid, result.reply);

    // Se escalou, notifica o dono do Korta
    if (result.escalated && ESCALATION_PHONE) {
      const notification =
        `🔴 *Escalação de suporte*\n\n` +
        `📱 Telefone: ${phone || convKey}\n` +
        `💬 Última msg: "${text.substring(0, 100)}"\n\n` +
        `Responda diretamente pelo WhatsApp do cliente.`;

      const escalationJid = ESCALATION_PHONE.replace(/\D/g, "") + "@s.whatsapp.net";
      await sendWhatsAppReply(KORTA_SUPPORT_STORE_ID, escalationJid, notification);
    }

    return NextResponse.json({ sent: true, agent: "korta-support", escalated: result.escalated });
  } catch (error) {
    console.error("[korta-support]", error);
    // Fallback: responde algo mesmo em caso de erro
    await sendWhatsAppReply(KORTA_SUPPORT_STORE_ID, replyJid,
      "Olá! Desculpe, estou com uma dificuldade técnica no momento. " +
      "Acesse korta.ia.br para mais informações ou tente novamente em instantes. 🙏"
    );
    return NextResponse.json({ error: "Erro no agente" }, { status: 500 });
  }
}

async function sendWhatsAppReply(storeId: string, phone: string, text: string) {
  if (!WHATSAPP_SERVER) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (WHATSAPP_API_KEY) headers["X-API-Key"] = WHATSAPP_API_KEY;

  await fetch(`${WHATSAPP_SERVER}/send/${storeId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, text }),
  });
}
