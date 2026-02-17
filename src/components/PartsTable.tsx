import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PartRow {
  codigo: string;
  fornecedor: string;
  produto: string;
  aplicacao: string;
}

interface PartsTableProps {
  rows: PartRow[];
  onAddToQuote?: (part: PartRow) => void;
  quoteItems?: string[]; // list of "codigo-fornecedor" keys in cart
}

export function PartsTable({ rows, onAddToQuote, quoteItems = [] }: PartsTableProps) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card/50">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-foreground font-semibold py-3 px-4">Código</TableHead>
            <TableHead className="text-foreground font-semibold py-3 px-4">Fornecedor</TableHead>
            <TableHead className="text-foreground font-semibold py-3 px-4">Produto</TableHead>
            <TableHead className="text-foreground font-semibold py-3 px-4">Aplicação</TableHead>
            {onAddToQuote && <TableHead className="text-foreground font-semibold py-3 px-4 w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const key = `${row.codigo}-${row.fornecedor}`;
            const inCart = quoteItems.includes(key);
            return (
              <TableRow 
                key={index} 
                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <TableCell className="py-3 px-4 font-medium text-primary">{row.codigo}</TableCell>
                <TableCell className="py-3 px-4 text-muted-foreground">{row.fornecedor}</TableCell>
                <TableCell className="py-3 px-4 text-muted-foreground">{row.produto}</TableCell>
                <TableCell className="py-3 px-4 text-muted-foreground">{row.aplicacao}</TableCell>
                {onAddToQuote && (
                  <TableCell className="py-3 px-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${inCart ? 'text-green-500' : 'text-muted-foreground hover:text-primary'}`}
                      onClick={() => onAddToQuote(row)}
                      disabled={inCart}
                      title={inCart ? 'Já no orçamento' : 'Adicionar ao orçamento'}
                    >
                      {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Parse markdown table to structured data
export function parseMarkdownTable(content: string): { rows: PartRow[]; textBefore: string; textAfter: string } | null {
  // Find table in content
  const lines = content.split('\n');
  let tableStartIndex = -1;
  let tableEndIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Aceita tabelas com ou sem pipe final (alguns modelos retornam sem o último "|")
    const pipeCount = (line.match(/\|/g) ?? []).length;
    if (line.startsWith('|') && pipeCount >= 2) {
      if (tableStartIndex === -1) tableStartIndex = i;
      tableEndIndex = i;
    } else if (tableStartIndex !== -1 && tableEndIndex !== -1) {
      // Table ended (allow empty lines within)
      if (line !== '' && !line.startsWith('|')) {
        break;
      }
    }
  }

  if (tableStartIndex === -1) return null;

  const tableLines = lines.slice(tableStartIndex, tableEndIndex + 1).filter(l => l.trim().startsWith('|'));
  
  // Need at least header + separator + 1 data row
  if (tableLines.length < 3) return null;

  // Check if it's a parts table (has Código, Fornecedor or similar headers)
  const headerLine = tableLines[0].toLowerCase();
  if (!headerLine.includes('código') && !headerLine.includes('codigo') && !headerLine.includes('fornecedor') && !headerLine.includes('produto')) {
    return null;
  }

  // Parse header to get column indices
  const headerNormalized = tableLines[0].endsWith('|') ? tableLines[0] : `${tableLines[0]}|`;
  const headers = headerNormalized
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(h => h.trim().toLowerCase())
    .filter(h => h);

  const codigoIdx = headers.findIndex(h => h.includes('código') || h.includes('codigo'));
  const fornecedorIdx = headers.findIndex(h => h.includes('fornecedor'));
  const produtoIdx = headers.findIndex(h => h.includes('produto'));
  const aplicacaoIdx = headers.findIndex(h => h.includes('aplicação') || h.includes('aplicacao'));

  // Skip separator line (index 1) and parse data rows
  const rows: PartRow[] = [];
  for (let i = 2; i < tableLines.length; i++) {
    const line = tableLines[i].trim();
    // Skip separator lines
    if (line.match(/^\|[\s\-:]+\|$/)) continue;
    
    // Re-parse to get actual cells
    const normalizedLine = line.endsWith('|') ? line : `${line}|`;
    const actualCells = normalizedLine
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(c => c.trim());

    if (actualCells.length >= 3) {
      rows.push({
        codigo: codigoIdx >= 0 ? actualCells[codigoIdx] || '' : actualCells[0] || '',
        fornecedor: fornecedorIdx >= 0 ? actualCells[fornecedorIdx] || '' : actualCells[1] || '',
        produto: produtoIdx >= 0 ? actualCells[produtoIdx] || '' : actualCells[2] || '',
        aplicacao: aplicacaoIdx >= 0 ? actualCells[aplicacaoIdx] || '' : actualCells[3] || '',
      });
    }
  }

  if (rows.length === 0) return null;

  const textBefore = lines.slice(0, tableStartIndex).join('\n').trim();
  const textAfter = lines.slice(tableEndIndex + 1).join('\n').trim();

  return { rows, textBefore, textAfter };
}
