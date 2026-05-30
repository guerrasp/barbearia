import { NextRequest, NextResponse } from "next/server";
import { requireUserForStore } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

const WHATSAPP_SERVER = process.env.WHATSAPP_SERVER_URL || "";
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || "";

async function proxyToWhatsApp(path: string, method: string = "GET") {
  if (!WHATSAPP_SERVER) {
    return { status: 503, data: { error: "WHATSAPP_SERVER_URL não configurada" } };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (WHATSAPP_API_KEY) headers["X-API-Key"] = WHATSAPP_API_KEY;

  const res = await fetch(`${WHATSAPP_SERVER}${path}`, { method, headers });
  const data = await res.json();
  return { status: res.status, data };
}

// GET/POST/DELETE /api/whatsapp/:action
// actions: connect, status, qr, disconnect
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  // Auth check
  const auth = await requireUserForStore(req, storeId);
  if (!auth.ok) return auth.response;

  switch (action) {
    case "status": {
      const { status, data } = await proxyToWhatsApp(`/session/${storeId}/status`);
      return NextResponse.json(data, { status });
    }
    case "qr": {
      const { status, data } = await proxyToWhatsApp(`/session/${storeId}/qr`);
      return NextResponse.json(data, { status });
    }
    default:
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const body = await req.json().catch(() => ({}));
  const storeId = body.storeId as string;
  if (!storeId) {
    return NextResponse.json({ error: "storeId obrigatório" }, { status: 400 });
  }

  const auth = await requireUserForStore(req, storeId);
  if (!auth.ok) return auth.response;

  switch (action) {
    case "connect": {
      const { status, data } = await proxyToWhatsApp(`/session/${storeId}/start`, "POST");
      return NextResponse.json(data, { status });
    }
    case "disconnect": {
      const { status, data } = await proxyToWhatsApp(`/session/${storeId}`, "DELETE");
      // Limpa o telefone whatsapp da store
      await prisma.store.update({
        where: { id: storeId },
        data: { whatsappPhone: null },
      }).catch(() => {});
      return NextResponse.json(data, { status });
    }
    default:
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }
}
