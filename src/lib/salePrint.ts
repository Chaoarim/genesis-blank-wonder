import type { Sale, SaleItem } from '@/hooks/useSalesData';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function buildHtml(sale: Sale, items: SaleItem[]): string {
  const rows = items.map((item, idx) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${idx + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-weight:600">${item.codigo}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${item.produto}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee">${item.fornecedor || '-'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${item.quantidade}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(Number(item.preco_unitario))}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${fmt(item.quantidade * Number(item.preco_unitario))}</td>
    </tr>
  `).join('');

  const subtotal = items.reduce((s, i) => s + i.quantidade * Number(i.preco_unitario), 0);
  const discount = Number(sale.discount) || 0;
  const total = Number(sale.total);

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Pedido #${sale.id.slice(0, 8)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; padding: 32px; max-width: 800px; margin: auto; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { text-align: left; padding: 8px; border-bottom: 2px solid #333; font-size: 12px; text-transform: uppercase; color: #555; }
        .summary { text-align: right; margin-top: 8px; }
        .summary p { font-size: 14px; margin: 4px 0; }
        .summary .total { font-size: 20px; font-weight: 700; }
        .notes { margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 6px; font-size: 13px; }
        .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #999; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>
      <h1>Pedido #${sale.id.slice(0, 8).toUpperCase()}</h1>
      <div class="meta">
        <p><strong>Cliente:</strong> ${sale.customer_name || 'Balcão'}</p>
        <p><strong>Canal:</strong> ${sale.channel === 'whatsapp' ? 'WhatsApp' : 'Balcão'}</p>
        <p><strong>Data:</strong> ${new Date(sale.created_at).toLocaleString('pt-BR')}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Código</th>
            <th>Produto</th>
            <th>Fornecedor</th>
            <th style="text-align:center">Qtde</th>
            <th style="text-align:right">Unit.</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="summary">
        <p>Subtotal: ${fmt(subtotal)}</p>
        ${discount > 0 ? `<p>Desconto: -${fmt(discount)}</p>` : ''}
        <p class="total">Total: ${fmt(total)}</p>
      </div>

      ${sale.notes ? `<div class="notes"><strong>Obs:</strong> ${sale.notes}</div>` : ''}

      <div class="footer">Documento gerado em ${new Date().toLocaleString('pt-BR')}</div>
    </body>
    </html>
  `;
}

export function printSale(sale: Sale, items: SaleItem[]) {
  const html = buildHtml(sale, items);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export function downloadPdf(sale: Sale, items: SaleItem[]) {
  const html = buildHtml(sale, items);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.document.title = `Pedido_${sale.id.slice(0, 8)}`;
  win.focus();
  // Use print dialog with "Save as PDF" — most reliable cross-browser approach
  setTimeout(() => win.print(), 400);
}
