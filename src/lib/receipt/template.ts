// Template HTML do comprovante de venda - usado para email e PDF

interface ReceiptSaleItem {
  quantity: number;
  unitPrice: number;
  total: number;
  product: { name: string };
}

interface ReceiptSale {
  code: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  deliveryAddress: string | null;
  notes: string | null;
  installmentDueDate: Date | string | null;
  createdAt: Date | string;
  customer: { name: string; phone: string | null; email: string | null };
  seller: { name: string };
  items: ReceiptSaleItem[];
}

interface ReceiptStore {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

const paymentLabels: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito",
  INSTALLMENT: "Fiado",
};

const statusLabels: Record<string, string> = {
  PENDING: "Aguardando Pagamento",
  PAID: "Pago",
  PREPARING: "Preparando",
  DELIVERING: "Em Rota de Entrega",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildReceiptHtml(sale: ReceiptSale, store: ReceiptStore): string {
  const itemsRows = sale.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">
            <div style="font-weight:500;color:#111">${item.product.name}</div>
            <div style="color:#888;font-size:12px">${item.quantity} x ${formatCurrency(item.unitPrice)}</div>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:500">
            ${formatCurrency(item.total)}
          </td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Comprovante ${sale.code}</title>
</head>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f6f6;color:#111">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
    <!-- Cabeçalho -->
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#3730a3 100%);color:#fff;padding:24px;text-align:center">
      <h1 style="margin:0;font-size:22px;font-weight:700">${store.name}</h1>
      ${store.phone ? `<p style="margin:4px 0 0;font-size:13px;opacity:.85">${store.phone}</p>` : ""}
    </div>

    <!-- Info da venda -->
    <div style="padding:20px 24px;border-bottom:1px solid #eee">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="color:#666;font-size:13px">Comprovante</span>
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;font-size:14px;color:#111">${sale.code}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="color:#666;font-size:13px">Data</span>
        <span style="font-size:13px;color:#111">${formatDate(sale.createdAt)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:#666;font-size:13px">Status</span>
        <span style="font-size:13px;font-weight:500;color:#111">${statusLabels[sale.status] || sale.status}</span>
      </div>
    </div>

    <!-- Cliente -->
    <div style="padding:20px 24px;border-bottom:1px solid #eee">
      <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Cliente</div>
      <div style="font-weight:500;color:#111">${sale.customer.name}</div>
      ${sale.customer.phone ? `<div style="color:#666;font-size:13px;margin-top:2px">${sale.customer.phone}</div>` : ""}
    </div>

    <!-- Itens -->
    <div style="padding:20px 24px;border-bottom:1px solid #eee">
      <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Itens</div>
      <table style="width:100%;border-collapse:collapse">
        ${itemsRows}
      </table>
    </div>

    <!-- Totais -->
    <div style="padding:20px 24px;border-bottom:1px solid #eee">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;color:#666">
        <span>Subtotal</span>
        <span>${formatCurrency(sale.subtotal)}</span>
      </div>
      ${
        sale.discount > 0
          ? `<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;color:#666">
               <span>Desconto</span>
               <span>- ${formatCurrency(sale.discount)}</span>
             </div>`
          : ""
      }
      <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:2px solid #111">
        <span style="font-weight:700;color:#111">TOTAL</span>
        <span style="font-weight:700;color:#1e3a8a;font-size:18px">${formatCurrency(sale.total)}</span>
      </div>
    </div>

    <!-- Pagamento -->
    <div style="padding:20px 24px;background:#fafafa">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:#666;font-size:13px">Forma de pagamento</span>
        <span style="font-weight:500;color:#111">${paymentLabels[sale.paymentMethod] || sale.paymentMethod}</span>
      </div>
      ${
        sale.installmentDueDate
          ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
               <span style="color:#666;font-size:13px">Vencimento</span>
               <span style="font-weight:500;color:#111">${formatDate(sale.installmentDueDate)}</span>
             </div>`
          : ""
      }
      ${
        sale.deliveryAddress
          ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #eee">
               <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Entrega</div>
               <div style="font-size:13px;color:#111">${sale.deliveryAddress}</div>
             </div>`
          : ""
      }
    </div>

    <!-- Rodapé -->
    <div style="padding:20px 24px;text-align:center;background:#fff">
      <p style="margin:0;color:#888;font-size:12px">Obrigada pela preferência! 💙</p>
      <p style="margin:4px 0 0;color:#bbb;font-size:11px">Atendimento: ${sale.seller.name}</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildReceiptText(sale: ReceiptSale, store: ReceiptStore): string {
  const itemsStr = sale.items
    .map((i) => `  • ${i.product.name}\n    ${i.quantity} x ${formatCurrency(i.unitPrice)} = ${formatCurrency(i.total)}`)
    .join("\n");

  return `*${store.name}*
${store.phone || ""}

━━━━━━━━━━━━━━━━━━━━
*Comprovante:* ${sale.code}
*Data:* ${formatDate(sale.createdAt)}
*Status:* ${statusLabels[sale.status] || sale.status}
━━━━━━━━━━━━━━━━━━━━

*Cliente:* ${sale.customer.name}

*Itens:*
${itemsStr}

━━━━━━━━━━━━━━━━━━━━
Subtotal: ${formatCurrency(sale.subtotal)}${sale.discount > 0 ? `\nDesconto: -${formatCurrency(sale.discount)}` : ""}
*TOTAL: ${formatCurrency(sale.total)}*

*Pagamento:* ${paymentLabels[sale.paymentMethod] || sale.paymentMethod}${sale.installmentDueDate ? `\n*Vencimento:* ${formatDate(sale.installmentDueDate)}` : ""}${sale.deliveryAddress ? `\n\n*Entrega:* ${sale.deliveryAddress}` : ""}

━━━━━━━━━━━━━━━━━━━━
Obrigada pela preferência! 💙`;
}
