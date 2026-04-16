import { prisma } from "@/lib/prisma";
import { resend, EMAIL_FROM } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

// Roda diariamente via Vercel Cron — envia email de lembrete
// 3 dias antes e 1 dia antes do vencimento de parcelas de crediário
export async function GET(req: NextRequest) {
  // Proteção simples: só aceita chamadas da Vercel Cron
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!resend) {
    return NextResponse.json({ error: "Resend não configurado" }, { status: 500 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in1Day = new Date(today);
  in1Day.setDate(in1Day.getDate() + 1);

  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);

  // Busca parcelas pendentes com vencimento em 3 dias
  const due3 = await prisma.installment.findMany({
    where: {
      status: "PENDING",
      notified3Days: false,
      dueDate: {
        gte: in3Days,
        lt: new Date(in3Days.getTime() + 86400000),
      },
    },
    include: {
      sale: {
        include: {
          customer: true,
          store: true,
        },
      },
    },
  });

  // Busca parcelas pendentes com vencimento em 1 dia
  const due1 = await prisma.installment.findMany({
    where: {
      status: "PENDING",
      notified1Day: false,
      dueDate: {
        gte: in1Day,
        lt: new Date(in1Day.getTime() + 86400000),
      },
    },
    include: {
      sale: {
        include: {
          customer: true,
          store: true,
        },
      },
    },
  });

  let sent = 0;

  // Envia notificações de 3 dias
  for (const inst of due3) {
    const email = inst.sale.customer.email;
    if (!email) continue;

    const dueStr = inst.dueDate.toLocaleDateString("pt-BR");
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: `Lembrete: parcela ${inst.number} vence em 3 dias - ${inst.sale.store.name}`,
        html: buildReminderEmail(inst.sale.store.name, inst.sale.customer.name, inst.sale.code, inst.number, inst.amount, dueStr, 3),
        text: `Olá ${inst.sale.customer.name}, sua parcela ${inst.number} da venda ${inst.sale.code} no valor de R$ ${inst.amount.toFixed(2)} vence em ${dueStr} (daqui 3 dias). - ${inst.sale.store.name}`,
      });
      await prisma.installment.update({ where: { id: inst.id }, data: { notified3Days: true } });
      sent++;
    } catch (err) {
      console.error("Erro notif 3d:", err);
    }
  }

  // Envia notificações de 1 dia
  for (const inst of due1) {
    const email = inst.sale.customer.email;
    if (!email) continue;

    const dueStr = inst.dueDate.toLocaleDateString("pt-BR");
    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: `⚠️ Parcela ${inst.number} vence AMANHÃ - ${inst.sale.store.name}`,
        html: buildReminderEmail(inst.sale.store.name, inst.sale.customer.name, inst.sale.code, inst.number, inst.amount, dueStr, 1),
        text: `Olá ${inst.sale.customer.name}, sua parcela ${inst.number} da venda ${inst.sale.code} no valor de R$ ${inst.amount.toFixed(2)} vence AMANHÃ (${dueStr}). - ${inst.sale.store.name}`,
      });
      await prisma.installment.update({ where: { id: inst.id }, data: { notified1Day: true } });
      sent++;
    } catch (err) {
      console.error("Erro notif 1d:", err);
    }
  }

  // Marca parcelas vencidas como OVERDUE
  await prisma.installment.updateMany({
    where: {
      status: "PENDING",
      dueDate: { lt: today },
    },
    data: { status: "OVERDUE" },
  });

  return NextResponse.json({
    message: `${sent} notificações enviadas`,
    due3: due3.length,
    due1: due1.length,
    sent,
  });
}

function buildReminderEmail(
  storeName: string,
  customerName: string,
  saleCode: string,
  parcelNumber: number,
  amount: number,
  dueStr: string,
  daysLeft: number
) {
  const urgency = daysLeft === 1 ? "AMANHÃ" : `em ${daysLeft} dias`;
  const urgencyColor = daysLeft === 1 ? "#ef4444" : "#f59e0b";

  return `<!doctype html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f6f6;color:#111">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#3730a3 100%);color:#fff;padding:24px;text-align:center">
      <h1 style="margin:0;font-size:20px">${storeName}</h1>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px">Olá, <strong>${customerName}</strong>!</p>
      <div style="background:${urgencyColor}10;border:1px solid ${urgencyColor}33;border-radius:8px;padding:16px;margin-bottom:16px">
        <p style="margin:0 0 4px;font-size:14px;color:${urgencyColor}">Vencimento ${urgency}</p>
        <p style="margin:0;font-size:22px;font-weight:700;color:${urgencyColor}">R$ ${amount.toFixed(2)}</p>
      </div>
      <table style="width:100%;font-size:14px;color:#333;margin-bottom:16px">
        <tr><td style="padding:4px 0;color:#666">Venda</td><td style="text-align:right;font-weight:500">${saleCode}</td></tr>
        <tr><td style="padding:4px 0;color:#666">Parcela</td><td style="text-align:right;font-weight:500">${parcelNumber}ª</td></tr>
        <tr><td style="padding:4px 0;color:#666">Vencimento</td><td style="text-align:right;font-weight:500">${dueStr}</td></tr>
      </table>
      <p style="font-size:13px;color:#888;margin:0">Se já efetuou o pagamento, desconsidere este email.</p>
    </div>
    <div style="padding:16px 24px;text-align:center;background:#fafafa;border-top:1px solid #eee">
      <p style="margin:0;font-size:12px;color:#bbb">${storeName}</p>
    </div>
  </div>
</body></html>`;
}
