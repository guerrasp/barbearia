import { prisma } from "@/lib/prisma";
import { resend, EMAIL_FROM } from "@/lib/email";
import { buildReceiptHtml, buildReceiptText } from "@/lib/receipt/template";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!resend) {
    return NextResponse.json(
      { error: "Envio de email não configurado. Adicione RESEND_API_KEY às variáveis de ambiente." },
      { status: 500 }
    );
  }

  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        seller: { select: { name: true } },
        store: true,
        items: { include: { product: true } },
        payments: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
    }

    if (!sale.customer.email) {
      return NextResponse.json(
        { error: "Cliente não possui email cadastrado" },
        { status: 400 }
      );
    }

    const html = buildReceiptHtml(sale, sale.store);
    const text = buildReceiptText(sale, sale.store);

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: sale.customer.email,
      subject: `Comprovante ${sale.code} - ${sale.store.name}`,
      html,
      text,
    });

    if (error) {
      console.error("Erro Resend:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    const message = error instanceof Error ? error.message : "Erro ao enviar email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
