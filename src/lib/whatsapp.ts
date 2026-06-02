import { prisma } from "@/lib/prisma";

const WHATSAPP_SERVER = process.env.WHATSAPP_SERVER_URL || "";
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || "";

function formatDateBR(d: Date) {
  return d.toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ensureBrazilCode(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : "55" + digits;
}

function mapsLink(address: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

async function loadAppointment(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      store: { select: { id: true, name: true, phone: true, address: true } },
      customer: { select: { name: true, phone: true } },
      barber: { select: { name: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  });
}

/**
 * Envia mensagem via servidor WhatsApp multi-sessão.
 * Rota: POST /send/:storeId
 */
async function sendViaWhatsApp(storeId: string, phone: string, text: string) {
  if (!WHATSAPP_SERVER) {
    console.log("⚠️ WHATSAPP_SERVER_URL não configurada");
    return { skipped: "server_not_configured" as const };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (WHATSAPP_API_KEY) headers["X-API-Key"] = WHATSAPP_API_KEY;

  const url = `${WHATSAPP_SERVER}/send/${storeId}`;
  console.log(`📱 Enviando WhatsApp para ${phone} via ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`❌ WhatsApp erro (${response.status}):`, body);
    return { sent: false as const, error: response.statusText };
  }

  console.log("✅ WhatsApp enviado com sucesso");
  return { sent: true as const };
}

/**
 * Envia confirmação de agendamento via WhatsApp da própria loja.
 */
export async function sendWhatsAppConfirmation(appointmentId: string) {
  const ap = await loadAppointment(appointmentId);
  if (!ap || !ap.customer.phone) {
    console.log("⚠️ Agendamento ou telefone não encontrados");
    return { skipped: "no_phone" as const };
  }

  const servicesList = ap.services.map((s) => s.service.name).join(", ");

  const locationLine = ap.store.address
    ? `\n📍 ${ap.store.address}\n${mapsLink(ap.store.address)}`
    : "";

  const message = `*Agendamento Confirmado!* ✅

Olá ${ap.customer.name}, seu horário está reservado na *${ap.store.name}*.

📅 ${formatDateBR(ap.startAt)}
💈 Barbeiro: ${ap.barber.name}
✂️ Serviços: ${servicesList}
🔐 Código: ${ap.code}${locationLine}

Para cancelar ou remarcar, entre em contato${ap.store.phone ? ` pelo ${ap.store.phone}` : ""}.

Nos vemos em breve!`;

  const phone = ensureBrazilCode(ap.customer.phone);
  return sendViaWhatsApp(ap.store.id, phone, message);
}

/**
 * Envia lembrete de agendamento 24h antes via WhatsApp
 */
export async function sendWhatsAppReminder(appointmentId: string) {
  const ap = await loadAppointment(appointmentId);
  if (!ap || !ap.customer.phone) return { skipped: "no_phone" as const };

  const locationLine = ap.store.address
    ? `\n📍 ${ap.store.address}\n${mapsLink(ap.store.address)}`
    : "";

  const message = `*Lembrete: Seu agendamento é amanhã!* 🔔

Olá ${ap.customer.name},

📅 ${formatDateBR(ap.startAt)}
💈 Barbeiro: ${ap.barber.name}
🔐 Código: ${ap.code}${locationLine}

Nos vemos em breve!`;

  const phone = ensureBrazilCode(ap.customer.phone);
  return sendViaWhatsApp(ap.store.id, phone, message);
}
