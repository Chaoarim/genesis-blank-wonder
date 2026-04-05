import type { QuoteItem } from '@/hooks/useQuoteCart';

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitApplications(aplicacao?: string): string[] {
  if (!aplicacao) return [];

  return Array.from(
    new Set(
      aplicacao
        .split(/\s*,\s*/)
        .map(cleanText)
        .filter(Boolean),
    ),
  );
}

function formatItemBlock(index: number, item: QuoteItem): string {
  const applications = splitApplications(item.aplicacao);
  const lines = [
    `${index}. ${cleanText(item.codigo)} - ${cleanText(item.produto)}`,
  ];

  if (applications.length === 1) {
    lines.push(`Aplicação: ${applications[0]}`);
  }

  if (applications.length > 1) {
    lines.push('Aplicações:');
    lines.push(...applications.map((entry) => `- ${entry}`));
  }

  lines.push(`Qtd: ${item.quantidade}`);

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
      `FORNECEDOR: ${supplier}`,
      '',
      blocks.join('\n\n'),
    ].join('\n');
  });

  return [
    'SOLICITAÇÃO DE COTAÇÃO',
    `Referência: ${cleanText(title)}`,
    `Data: ${date}`,
    '',
    'Olá! Segue a relação de peças para cotação.',
    '',
    supplierSections.join('\n\n==============================\n\n'),
    '',
    'RESUMO',
    `Itens: ${items.length}`,
    `Peças: ${totalPieces}`,
    '',
    'Por favor, informar disponibilidade e valores.',
    'Obrigado!',
  ].join('\n');
}
