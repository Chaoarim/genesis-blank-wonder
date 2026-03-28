import { printHtml } from '@/lib/htmlToPdf';

interface LabelItem {
  codigo: string;
  produto: string;
  preco: number;
  fornecedor?: string;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function printPriceLabels(items: LabelItem[], markup: number, cols = 3) {
  const sellPrice = (preco: number) => markup > 0 ? preco * (1 + markup / 100) : preco;

  const labels = items.map(item => `
    <div style="
      border: 1.5px dashed #999;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100px;
      break-inside: avoid;
    ">
      <div style="font-size:11px;color:#888;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px">
        ${item.fornecedor || ''}
      </div>
      <div style="font-size:13px;font-weight:700;color:#222;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
        ${item.produto}
      </div>
      <div style="font-size:11px;color:#555;font-family:monospace;margin:4px 0">
        ${item.codigo}
      </div>
      <div style="font-size:22px;font-weight:900;color:#059669;text-align:right;margin-top:auto">
        ${fmt(sellPrice(item.preco))}
      </div>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Etiquetas de Preço</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 16px; }
        .grid {
          display: grid;
          grid-template-columns: repeat(${cols}, 1fr);
          gap: 8px;
        }
        @media print {
          body { padding: 8px; }
          @page { margin: 10mm; }
        }
      </style>
    </head>
    <body>
      <div class="grid">${labels}</div>
    </body>
    </html>
  `;

  printHtml(html);
}
