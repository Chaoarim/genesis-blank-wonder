import { Package, ShoppingCart, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PartCard {
  fornecedor: string;
  fabricante: string;
  produto: string;
  aplicacao: string;
}

interface PartsCardsProps {
  parts: PartCard[];
  onAddToQuote?: (part: { codigo: string; fornecedor: string; produto: string; aplicacao: string }) => void;
  quoteItems?: string[];
}

export function PartsCards({ parts, onAddToQuote, quoteItems = [] }: PartsCardsProps) {
  if (parts.length === 0) return null;

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        const key = `${part.fabricante}-${part.fornecedor}`;
        const inCart = quoteItems.includes(key);
        return (
          <div 
            key={index} 
            className="rounded-lg border border-border bg-card/80 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Package className="w-4 h-4" />
                <span className="text-base">{part.fabricante}</span>
              </div>
              {onAddToQuote && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 ${inCart ? 'text-green-500' : 'text-muted-foreground hover:text-primary'}`}
                  onClick={() => onAddToQuote({ codigo: part.fabricante, fornecedor: part.fornecedor, produto: part.produto, aplicacao: part.aplicacao })}
                  disabled={inCart}
                  title={inCart ? 'Já no orçamento' : 'Adicionar ao orçamento'}
                >
                  {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                </Button>
              )}
            </div>
            
            <div className="grid gap-1.5 text-sm">
              <div className="flex">
                <span className="text-muted-foreground min-w-[90px]">Fornecedor:</span>
                <span className="text-foreground font-medium">{part.fornecedor}</span>
              </div>
              <div className="flex">
                <span className="text-muted-foreground min-w-[90px]">Produto:</span>
                <span className="text-foreground">{part.produto}</span>
              </div>
              <div className="flex flex-col sm:flex-row">
                <span className="text-muted-foreground min-w-[90px]">Aplicação:</span>
                <span className="text-foreground leading-relaxed">{part.aplicacao}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Parse bullet list format to structured data
export function parseListToParts(content: string): { parts: PartCard[]; textBefore: string; textAfter: string } | null {
  const lines = content.split('\n');
  const parts: PartCard[] = [];
  let currentPart: Partial<PartCard> = {};
  let textBeforeLines: string[] = [];
  let textAfterLines: string[] = [];
  let foundFirstPart = false;
  let lastPartEndIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match various list formats: "- Fornecedor:", "• Fornecedor:", "* Fornecedor:"
    const fornecedorMatch = line.match(/^[-•*]?\s*Fornecedor:\s*(.+)/i);
    const fabricanteMatch = line.match(/^[-•*]?\s*Fabricante:\s*(.+)/i);
    const produtoMatch = line.match(/^[-•*]?\s*Produto:\s*(.+)/i);
    const aplicacaoMatch = line.match(/^[-•*]?\s*Aplicação:\s*(.+)/i) || line.match(/^[-•*]?\s*Aplicacao:\s*(.+)/i);

    if (fornecedorMatch) {
      // Save previous part if complete
      if (currentPart.fornecedor && currentPart.fabricante && currentPart.produto && currentPart.aplicacao) {
        parts.push(currentPart as PartCard);
      }
      currentPart = { fornecedor: fornecedorMatch[1].trim() };
      foundFirstPart = true;
      lastPartEndIndex = i;
    } else if (fabricanteMatch && foundFirstPart) {
      currentPart.fabricante = fabricanteMatch[1].trim();
      lastPartEndIndex = i;
    } else if (produtoMatch && foundFirstPart) {
      currentPart.produto = produtoMatch[1].trim();
      lastPartEndIndex = i;
    } else if (aplicacaoMatch && foundFirstPart) {
      currentPart.aplicacao = aplicacaoMatch[1].trim();
      lastPartEndIndex = i;
    } else if (!foundFirstPart && line) {
      textBeforeLines.push(line);
    }
  }

  // Add last part if complete
  if (currentPart.fornecedor && currentPart.fabricante && currentPart.produto && currentPart.aplicacao) {
    parts.push(currentPart as PartCard);
  }

  if (parts.length === 0) return null;

  // Get text after the last part
  if (lastPartEndIndex >= 0 && lastPartEndIndex < lines.length - 1) {
    for (let i = lastPartEndIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip empty bullets
      if (line && line !== '-' && line !== '•' && line !== '*') {
        textAfterLines.push(line);
      }
    }
  }

  return {
    parts,
    textBefore: textBeforeLines.join(' ').trim(),
    textAfter: textAfterLines.join(' ').trim(),
  };
}
