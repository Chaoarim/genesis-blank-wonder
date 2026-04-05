import type { QuoteItem } from '@/hooks/useQuoteCart';

export function formatQuoteWhatsApp(title: string, items: QuoteItem[], date: string): string {
  const header = [
    `*${title.toUpperCase()}*`,
    `Data: ${date}`,
    ``,
  ].join('\n');

  const lines = items.map((item, idx) => {
    const parts = [
      `*${idx + 1}. ${item.codigo}*`,
      `Produto: ${item.produto}`,
    ];
    if (item.fornecedor) parts.push(`Fornecedor: ${item.fornecedor}`);
    if (item.aplicacao) parts.push(`Aplicacao: ${item.aplicacao}`);
    parts.push(`Qtde: ${item.quantidade}`);
    return parts.join('\n');
  });

  const footer = [
    ``,
    `*Total: ${items.length} itens / ${items.reduce((s, i) => s + i.quantidade, 0)} pecas*`,
    ``,
    `Aguardo retorno com valores. Obrigado!`,
  ].join('\n');

  return [header, lines.join('\n\n'), footer].join('\n');
}
