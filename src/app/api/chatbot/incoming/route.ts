import { NextRequest, NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/chatbot";
import { prisma } from "@/lib/prisma";
import { limitsFor } from "@/lib/plan-limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WHATSAPP_SERVER = process.env.WHATSAPP_SERVER_URL || "";
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || "";
const CHATBOT_API_KEY = process.env.WHATSAPP_API_KEY || ""; // mesma key do servidor WhatsApp

/**
 * POST /api/chatbot/incoming
 *
 * Recebe mensagens do whatsapp-server.js (webhook).
 * Processa via state machine e responde de volta.
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

    if (!storeId || !phone || !text) {
      return NextResponse.json({ error: "storeId, phone e text obrigatórios" }, { status: 400 });
    }

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
      // Plano não tem chatbot — ignora silenciosamente
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
        // Limite atingido — envia mensagem avisando
        await sendWhatsAppReply(storeId, phone,
          "O limite de atendimento automático deste mês foi atingido. " +
          "Entre em contato diretamente com a barbearia para agendar. " +
          "Obrigado pela compreensão! 🙏"
        );
        return NextResponse.json({ skipped: "limit_reached", monthCount });
      }
    }

    // Processa a mensagem
    const result = await handleIncomingMessage(storeId, phone, text);

    if (!result.reply) {
      return NextResponse.json({ skipped: "no_reply" });
    }

    // Envia resposta via WhatsApp
    await sendWhatsAppReply(storeId, phone, result.reply);

    // Registra no log se contou como mensagem IA
    if (result.aiMessageCounted) {
      await prisma.chatbotMessage.create({
        data: { storeId, phone, direction: "BOT_REPLY" },
      }).catch(() => {}); // best-effort
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("[chatbot/incoming]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
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
