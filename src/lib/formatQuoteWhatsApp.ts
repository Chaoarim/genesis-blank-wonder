import type { QuoteItem } from '@/hooks/useQuoteCart';

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeApplicationKey(value: string): string {
  return cleanText(value).toLowerCase().replace(/^[^:]+:\s*/, '');
}

function splitApplications(aplicacao?: string): string[] {
  if (!aplicacao) return [];

  const seenEntries = new Set<string>();
  const seenNormalizedEntries = new Set<string>();

  return aplicacao
    .split(/\s*,\s*/)
    .map(cleanText)
    .filter(Boolean)
    .filter((entry) => {
      const entryKey = entry.toLowerCase();
      const normalizedKey = normalizeApplicationKey(entry);

      if (seenEntries.has(entryKey) || seenNormalizedEntries.has(normalizedKey)) {
        return false;
      }

      seenEntries.add(entryKey);
      seenNormalizedEntries.add(normalizedKey);
      return true;
    });
}

function formatItemBlock(index: number, item: QuoteItem): string {
  const applications = splitApplications(item.aplicacao);
  const lines = [
    `${index}) Código: ${cleanText(item.codigo)}`,
    `Produto: ${cleanText(item.produto)}`,
  ];

  if (applications.length === 1) {
    lines.push(`Aplicação: ${applications[0]}`);
  }

  if (applications.length > 1) {
    lines.push('Aplicações:');
    lines.push(...applications.map((entry) => `- ${entry}`));
  }

  lines.push(`Quantidade: ${item.quantidade}`);

  return lines.join('\n');
}

export function formatQuoteWhatsApp(title: string, items: QuoteItem[], date: string): string {
  const totalPieces = items.reduce((sum, item) => sum + item.quantidade, 0);
  const groupedBySupplier = new Map<string, QuoteItem[]>();

  for (const item of items) {
    const supplier = cleanText(item.fornecedor || 'Sem fornecedor');
    const supplierItems = groupedBySupplier.get(supplier) ?? [];
    supplierItems.push(item);
    groupedBySupplier.set(supplier, supplierItems);
  }

  let itemIndex = 1;
  const supplierSections = Array.from(groupedBySupplier.entries()).map(([supplier, supplierItems]) => {
    const blocks = supplierItems.map((item) => {
      const block = formatItemBlock(itemIndex, item);
      itemIndex += 1;
      return block;
    });

    return [
      `*Fornecedor: ${supplier}*`,
      blocks.join('\n\n'),
    ].join('\n');
  });

  return [
    '*Solicitação de Cotação*',
    `Ref.: ${cleanText(title)}`,
    `Data: ${date}`,
    '',
    'Olá! Segue a relação de peças para cotação:',
    '',
    supplierSections.join('\n\n'),
    '',
    `*Resumo:* ${items.length} itens / ${totalPieces} peças`,
    '',
    'Favor informar disponibilidade e valores.',
    'Obrigado!',
  ].join('\n');
}
