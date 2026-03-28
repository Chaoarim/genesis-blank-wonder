import type { Sale, SaleItem } from '@/hooks/useSalesData';
import { downloadHtmlAsPdf, printHtml } from './htmlToPdf';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface QuoteOptions {
  companyName?: string;
  companyPhone?: string;
  validityDays?: number;
  showSupplier?: boolean;
}

function buildQuoteHtml(sale: Sale, items: SaleItem[], opts: QuoteOptions = {}): string {
  const {
    companyName = 'Minha Autopeças',
    companyPhone = '',
    validityDays = 7,
    showSupplier = false,
  } = opts;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  const rows = items.map((item, idx) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">${idx + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">
        <span style="font-weight:600;font-size:13px">${item.codigo}</span>
        <br><span style="color:#6b7280;font-size:12px">${item.produto}</span>
        ${showSupplier && item.fornecedor ? `<br><span style="color:#9ca3af;font-size:11px">${item.fornecedor}</span>` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px">${item.quantidade}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px">${fmt(Number(item.preco_unitario))}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;font-size:13px">${fmt(item.quantidade * Number(item.preco_unitario))}</td>
    </tr>
  `).join('');

  const subtotal = items.reduce((s, i) => s + i.quantidade * Number(i.preco_unitario), 0);
  const discount = Number(sale.discount) || 0;
  const total = Number(sale.total);
  const quoteId = sale.id.slice(0, 8).toUpperCase();

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Orçamento #${quoteId}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', -apple-system, Arial, sans-serif; color: #1f2937; background: #fff; }
        .page { max-width: 780px; margin: 0 auto; padding: 32px; }

        /* Header */
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid #f59e0b; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; font-weight: 800; }
        .brand-name { font-size: 20px; font-weight: 800; color: #1f2937; }
        .brand-sub { font-size: 12px; color: #6b7280; }
        .quote-badge { background: #fef3c7; color: #92400e; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

        /* Info grid */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .info-box { background: #f9fafb; border-radius: 10px; padding: 16px; }
        .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; font-weight: 600; margin-bottom: 6px; }
        .info-value { font-size: 14px; font-weight: 600; color: #1f2937; }
        .info-value small { font-weight: 400; color: #6b7280; }

        /* Table */
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead tr { background: #1f2937; }
        th { padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: #fff; text-align: left; }
        th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: center; }
        th:last-child { text-align: right; }
        tbody tr:nth-child(even) { background: #f9fafb; }

        /* Totals */
        .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
        .totals-box { background: #f9fafb; border-radius: 10px; padding: 16px 24px; min-width: 260px; }
        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .totals-row.total { border-top: 2px solid #d1d5db; margin-top: 8px; padding-top: 10px; }
        .totals-row.total span:last-child { font-size: 20px; font-weight: 800; color: #059669; }

        /* Notes */
        .notes { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px; font-size: 13px; color: #92400e; }

        /* Validity */
        .validity { text-align: center; padding: 12px; background: #ecfdf5; border-radius: 8px; margin-bottom: 20px; }
        .validity span { font-weight: 700; color: #059669; font-size: 13px; }

        /* Footer */
        .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .footer p { font-size: 11px; color: #9ca3af; margin: 2px 0; }
        .footer .contact { font-size: 12px; color: #6b7280; font-weight: 600; }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { padding: 16px; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div class="brand">
            <div class="brand-icon">⚡</div>
            <div>
              <div class="brand-name">${companyName}</div>
              <div class="brand-sub">Autopeças & Acessórios</div>
            </div>
          </div>
          <div class="quote-badge">Orçamento #${quoteId}</div>
        </div>

        <!-- Info -->
        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Cliente</div>
            <div class="info-value">${sale.customer_name || 'Cliente Balcão'}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Data de Emissão</div>
            <div class="info-value">${new Date(sale.created_at).toLocaleDateString('pt-BR')}<br><small>${new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></div>
          </div>
          <div class="info-box">
            <div class="info-label">Forma de Pagamento</div>
            <div class="info-value">${{ dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', faturado: 'Faturado', a_combinar: 'A Combinar' }[sale.payment_method] || sale.payment_method}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Entrega</div>
            <div class="info-value">${{ retirada: 'Retirada', moto: 'Moto Entrega', frota: 'Frota Própria', transportadora: 'Transportadora' }[sale.delivery_type] || sale.delivery_type}</div>
          </div>
        </div>

        ${sale.seller_name ? `
        <div style="margin-bottom:16px;font-size:13px;color:#6b7280">
          <strong>Vendedor:</strong> ${sale.seller_name}
        </div>
        ` : ''}

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th>Item</th>
              <th style="text-align:center;width:60px">Qtde</th>
              <th style="text-align:right;width:100px">Unitário</th>
              <th style="text-align:right;width:100px">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <!-- Totals -->
        <div class="totals">
          <div class="totals-box">
            <div class="totals-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
            ${discount > 0 ? `<div class="totals-row" style="color:#dc2626"><span>Desconto</span><span>-${fmt(discount)}</span></div>` : ''}
            <div class="totals-row total"><span>Total</span><span>${fmt(total)}</span></div>
          </div>
        </div>

        ${sale.notes ? `<div class="notes"><strong>Observações:</strong> ${sale.notes}</div>` : ''}

        <!-- Validity -->
        <div class="validity">
          <span>⏰ Orçamento válido até ${validUntil.toLocaleDateString('pt-BR')}</span>
        </div>

        <!-- Footer -->
        <div class="footer">
          ${companyPhone ? `<p class="contact">📱 ${companyPhone}</p>` : ''}
          <p>Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
          <p>Consulte disponibilidade no momento da compra</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Original sale print (kept for backward compatibility)
function buildSaleHtml(sale: Sale, items: SaleItem[]): string {
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
        <thead><tr><th>#</th><th>Código</th><th>Produto</th><th>Fornecedor</th><th style="text-align:center">Qtde</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead>
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
  printHtml(buildSaleHtml(sale, items));
}

export function downloadPdf(sale: Sale, items: SaleItem[]) {
  downloadHtmlAsPdf(buildSaleHtml(sale, items), `Pedido_${sale.id.slice(0, 8)}`);
}

export function downloadQuotePdf(sale: Sale, items: SaleItem[], opts?: QuoteOptions) {
  downloadHtmlAsPdf(buildQuoteHtml(sale, items, opts), `Orcamento_${sale.id.slice(0, 8)}`);
}

export function printQuote(sale: Sale, items: SaleItem[], opts?: QuoteOptions) {
  printHtml(buildQuoteHtml(sale, items, opts));
}
