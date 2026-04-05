import type { QuoteItem } from '@/hooks/useQuoteCart';

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function formatApplications(aplicacao?: string): string[] {
  if (!aplicacao) return [];

  const uniqueApplications = Array.from(
    new Set(
      aplicacao
        .split(/\s*,\s*/)
        .map(cleanText)
        .filter(Boolean),
    ),
  );

  if (uniqueApplications.length === 0) return [];
  if (uniqueApplications.length === 1) return [`Aplicação: ${uniqueApplications[0]}`];

  return [
    'Aplicações:',
    ...uniqueApplications.map((entry) => `- ${entry}`),
  ];
}

export function formatQuoteWhatsApp(title: string, items: QuoteItem[], date: string): string {
  const totalPieces = items.reduce((sum, item) => sum + item.quantidade, 0);

  const itemBlocks = items.map((item, index) => {
    const lines = [
      `*ITEM ${String(index + 1).padStart(2, '0')}*`,
      `Código: ${cleanText(item.codigo)}`,
      `Produto: ${cleanText(item.produto)}`,
    ];

    if (item.fornecedor?.trim()) {
      lines.push(`Fornecedor: ${cleanText(item.fornecedor)}`);
    }

    lines.push(...formatApplications(item.aplicacao));
    lines.push(`Quantidade: ${item.quantidade}`);

    return lines.join('\n');
  });

  return [
    '*SOLICITAÇÃO DE COTAÇÃO*',
    `Referência: ${cleanText(title)}`,
    `Data: ${date}`,
    '',
    'Olá! Segue abaixo a relação de peças para cotação:',
    '',
    itemBlocks.join('\n\n------------------------------\n\n'),
    '',
    '------------------------------',
    `Total de itens: ${items.length}`,
    `Total de peças: ${totalPieces}`,
    '',
    'Por favor, enviar disponibilidade e valores.',
    'Obrigado!',
  ].join('\n');
}
