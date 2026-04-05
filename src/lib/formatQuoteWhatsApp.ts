import type { QuoteItem } from '@/hooks/useQuoteCart';

export function formatQuoteWhatsApp(title: string, items: QuoteItem[], date: string): string {
  const header = [
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 *${title.toUpperCase()}*`,
    `📅 Data: ${date}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Prezado(a), segue abaixo a solicitação de cotação:`,
    ``,
  ].join('\n');

  const groupedBySupplier = new Map<string, QuoteItem[]>();
  for (const item of items) {
    const key = item.fornecedor || 'Sem fornecedor';
    const group = groupedBySupplier.get(key) || [];
    group.push(item);
    groupedBySupplier.set(key, group);
  }

  const sections: string[] = [];
  let globalIdx = 1;

  for (const [supplier, supplierItems] of groupedBySupplier) {
    const lines = [`🏭 *Fornecedor: ${supplier}*`, `──────────────────`];
    for (const item of supplierItems) {
      lines.push(
        `*${globalIdx}.* ${item.codigo}`,
        `    📦 ${item.produto}`,
        item.aplicacao ? `    🚗 ${item.aplicacao}` : '',
        `    🔢 Qtde: *${item.quantidade}*`,
        ``,
      );
      globalIdx++;
    }
    sections.push(lines.filter(Boolean).join('\n'));
  }

  const footer = [
    `━━━━━━━━━━━━━━━━━━━━`,
    `📊 *Resumo:*`,
    `• Total de itens: *${items.length}*`,
    `• Total de peças: *${items.reduce((sum, i) => sum + i.quantidade, 0)}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Aguardo retorno com os melhores valores.`,
    `Obrigado! 🤝`,
  ].join('\n');

  return [header, ...sections, footer].join('\n');
}
