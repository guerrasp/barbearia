import { NextRequest, NextResponse } from "next/server";
import { isAiEnabled } from "@/lib/ai-chatbot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/chatbot/diag — diagnóstico temporário do ambiente.
 * Protegido pela mesma API key do webhook. NÃO expõe a chave em si.
 */
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.WHATSAPP_API_KEY || apiKey !== process.env.WHATSAPP_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

  return NextResponse.json({
    aiEnabled: isAiEnabled(),
    hasAnthropicKey: Boolean(anthropicKey),
    anthropicKeyLength: anthropicKey.length,
    anthropicKeyPrefix: anthropicKey ? anthropicKey.substring(0, 12) : null,
    hasWhatsappServer: Boolean(process.env.WHATSAPP_SERVER_URL),
    nodeEnv: process.env.NODE_ENV,
  });
}
