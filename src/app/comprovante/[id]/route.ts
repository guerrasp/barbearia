import { prisma } from "@/lib/prisma";
import { buildReceiptHtml } from "@/lib/receipt/template";
import { NextRequest, NextResponse } from "next/server";

// Retorna a página HTML do comprovante - usada para visualizar/imprimir/salvar PDF
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      seller: { select: { name: true } },
      store: true,
      items: { include: { product: true } },
    },
  });

  if (!sale) {
    return new NextResponse("Venda não encontrada", { status: 404 });
  }

  const html = buildReceiptHtml(sale, sale.store);

  // Adiciona barra de ações no topo (imprime / PDF / fecha) que some na impressão
  const htmlWithActions = html.replace(
    "<body",
    `<body data-receipt="1"`
  ).replace(
    "</body>",
    `
  <div style="position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:100" class="no-print">
    <button onclick="window.print()" style="padding:10px 16px;border-radius:8px;border:none;background:#1e3a8a;color:#fff;font-weight:500;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)">🖨️ Imprimir / Salvar PDF</button>
    <button onclick="window.close()" style="padding:10px 16px;border-radius:8px;border:1px solid #ddd;background:#fff;color:#333;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15)">✕ Fechar</button>
  </div>
  <style>@media print { .no-print { display: none !important; } body { background: #fff !important; padding: 0 !important; } }</style>
</body>`
  );

  return new NextResponse(htmlWithActions, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
