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
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#0B132B;color:#F8FAFC;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#1C2541;border-radius:16px;padding:28px;border:1px solid rgba(212,175,55,0.18);">
    <div style="display:flex;align-items:center;gap:10px;margin:0 0 18px;">
      <div style="width:32px;height:32px;border-radius:8px;background:#D4AF37;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;color:#0B132B;font-size:18px;">K</div>
      <span style="font-size:18px;font-weight:bold;letter-spacing:-0.02em;color:#F8FAFC;">Korta</span>
    </div>
    <h1 style="color:#D4AF37;margin:0 0 6px;font-size:20px;">${title}</h1>
    <p style="color:#94A3B8;margin:0 0 20px;font-size:13px;">${store}</p>
    ${bodyHtml}
    <p style="color:#64748b;font-size:11px;margin:24px 0 0;text-align:center;">Enviado por Korta · agendamento para barbearias</p>
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
     <div style="background:#0B132B;border-radius:8px;padding:16px;margin:16px 0;">
       <p style="margin:0 0 4px;color:#D4AF37;font-size:12px;">CÓDIGO</p>
       <p style="margin:0 0 12px;font-size:18px;font-weight:bold;">${ap.code}</p>
       <p style="margin:0;">📅 ${formatDateBR(ap.startAt)}</p>
       <p style="margin:4px 0 0;">💈 ${ap.barber.name}</p>
       <ul style="margin:8px 0 0;padding-left:18px;">${servicesList}</ul>
       <p style="margin:12px 0 0;font-weight:bold;color:#D4AF37;">Total: ${formatBRL(ap.total)}</p>
     </div>
     <p style="color:#94A3B8;font-size:12px;">Para cancelar ou remarcar, entre em contato${ap.store.phone ? ` pelo ${ap.store.phone}` : ""}.</p>`,
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
     <div style="background:#0B132B;border-radius:8px;padding:16px;margin:16px 0;">
       <p style="margin:0;">📅 ${formatDateBR(ap.startAt)}</p>
       <p style="margin:4px 0 0;">💈 ${ap.barber.name}</p>
       <p style="margin:8px 0 0;font-size:13px;color:#94A3B8;">Código: <strong>${ap.code}</strong></p>
     </div>
     <p style="color:#94A3B8;font-size:12px;">Nos vemos em breve!${ap.store.address ? ` ${ap.store.address}` : ""}</p>`,
  );

  const res = await resend.emails.send({
    from: EMAIL_FROM,
    to: ap.customer.email,
    subject: `Lembrete: ${ap.code} amanhã`,
    html,
  });
  return { sent: true as const, id: res.data?.id };
}
