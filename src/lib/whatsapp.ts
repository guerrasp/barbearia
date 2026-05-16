import { prisma } from "@/lib/prisma";

function formatDateBR(d: Date) {
  return d.toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadAppointment(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      store: { select: { name: true, phone: true, address: true } },
      customer: { select: { name: true, phone: true } },
      barber: { select: { name: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  });
}

/**
 * Envia confirmação de agendamento via WhatsApp através do webhook n8n
 * que integra com Evolution API.
 *
 * Não bloqueia a criação do agendamento — chamar com .catch() do lado
 * de quem invoca.
 */
export async function sendWhatsAppConfirmation(appointmentId: string) {
  const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl) return { skipped: "webhook_not_configured" as const };

  const ap = await loadAppointment(appointmentId);
  if (!ap || !ap.customer.phone) return { skipped: "no_phone" as const };

  const servicesList = ap.services.map((s) => s.service.name).join(", ");

  const message = `*Agendamento Confirmado!* ✅

Olá ${ap.customer.name}, seu horário está reservado na *${ap.store.name}*.

📅 ${formatDateBR(ap.startAt)}
💈 Barbeiro: ${ap.barber.name}
✂️ Serviços: ${servicesList}
🔐 Código: ${ap.code}

Para cancelar ou remarcar, entre em contato${ap.store.phone ? ` pelo ${ap.store.phone}` : ""}.

Nos vemos em breve!`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: ap.customer.phone.replace(/\D/g, ""), // Remove non-digits
        text: message,
      }),
    });

    if (!response.ok) {
      console.error("Erro ao enviar WhatsApp:", response.statusText);
      return { sent: false as const, error: response.statusText };
    }

    return { sent: true as const };
  } catch (error) {
    console.error("Erro ao chamar webhook WhatsApp:", error);
    return { sent: false as const, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Envia lembrete de agendamento 24h antes via WhatsApp
 */
export async function sendWhatsAppReminder(appointmentId: string) {
  const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl) return { skipped: "webhook_not_configured" as const };

  const ap = await loadAppointment(appointmentId);
  if (!ap || !ap.customer.phone) return { skipped: "no_phone" as const };

  const message = `*Lembrete: Seu agendamento é amanhã!* 🔔

Olá ${ap.customer.name},

📅 ${formatDateBR(ap.startAt)}
💈 Barbeiro: ${ap.barber.name}
🔐 Código: ${ap.code}

Nos vemos em breve!${ap.store.address ? ` ${ap.store.address}` : ""}`;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: ap.customer.phone.replace(/\D/g, ""),
        text: message,
      }),
    });

    if (!response.ok) {
      console.error("Erro ao enviar lembrete WhatsApp:", response.statusText);
      return { sent: false as const, error: response.statusText };
    }

    return { sent: true as const };
  } catch (error) {
    console.error("Erro ao chamar webhook WhatsApp (reminder):", error);
    return { sent: false as const, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
