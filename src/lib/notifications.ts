import { prisma } from "@/lib/prisma";
import { resend, EMAIL_FROM } from "@/lib/email";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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
      customer: { select: { name: true, email: true, phone: true } },
      barber: { select: { name: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  });
}

function baseLayout(title: string, store: string, bodyHtml: string) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#1e293b;border-radius:12px;padding:28px;border:1px solid #334155;">
    <h1 style="color:#fbbf24;margin:0 0 8px;font-size:20px;">${title}</h1>
    <p style="color:#94a3b8;margin:0 0 20px;font-size:13px;">${store}</p>
    ${bodyHtml}
  </div></body></html>`;
}

export async function sendAppointmentConfirmation(appointmentId: string) {
  if (!resend) return { skipped: "resend_not_configured" as const };
  const ap = await loadAppointment(appointmentId);
  if (!ap || !ap.customer.email) return { skipped: "no_email" as const };

  const servicesList = ap.services
    .map((s) => `<li>${s.service.name}</li>`)
    .join("");

  const html = baseLayout(
    "Agendamento confirmado!",
    ap.store.name,
    `<p>Olá <strong>${ap.customer.name}</strong>, seu horário está reservado.</p>
     <div style="background:#0f172a;border-radius:8px;padding:16px;margin:16px 0;">
       <p style="margin:0 0 4px;color:#fbbf24;font-size:12px;">CÓDIGO</p>
       <p style="margin:0 0 12px;font-size:18px;font-weight:bold;">${ap.code}</p>
       <p style="margin:0;">📅 ${formatDateBR(ap.startAt)}</p>
       <p style="margin:4px 0 0;">💈 ${ap.barber.name}</p>
       <ul style="margin:8px 0 0;padding-left:18px;">${servicesList}</ul>
       <p style="margin:12px 0 0;font-weight:bold;color:#fbbf24;">Total: ${formatBRL(ap.total)}</p>
     </div>
     <p style="color:#94a3b8;font-size:12px;">Para cancelar ou remarcar, entre em contato${ap.store.phone ? ` pelo ${ap.store.phone}` : ""}.</p>`,
  );

  const res = await resend.emails.send({
    from: EMAIL_FROM,
    to: ap.customer.email,
    subject: `Agendamento confirmado — ${ap.code}`,
    html,
  });
  return { sent: true as const, id: res.data?.id };
}

export async function sendAppointmentReminder(appointmentId: string) {
  if (!resend) return { skipped: "resend_not_configured" as const };
  const ap = await loadAppointment(appointmentId);
  if (!ap || !ap.customer.email) return { skipped: "no_email" as const };

  const html = baseLayout(
    "Lembrete: seu horário é amanhã",
    ap.store.name,
    `<p>Olá <strong>${ap.customer.name}</strong>, lembrete do seu agendamento:</p>
     <div style="background:#0f172a;border-radius:8px;padding:16px;margin:16px 0;">
       <p style="margin:0;">📅 ${formatDateBR(ap.startAt)}</p>
       <p style="margin:4px 0 0;">💈 ${ap.barber.name}</p>
       <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">Código: <strong>${ap.code}</strong></p>
     </div>
     <p style="color:#94a3b8;font-size:12px;">Nos vemos em breve!${ap.store.address ? ` ${ap.store.address}` : ""}</p>`,
  );

  const res = await resend.emails.send({
    from: EMAIL_FROM,
    to: ap.customer.email,
    subject: `Lembrete: ${ap.code} amanhã`,
    html,
  });
  return { sent: true as const, id: res.data?.id };
}
