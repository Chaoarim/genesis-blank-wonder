import { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, X } from 'lucide-react';
import { smartFilterParts } from '@/lib/partsSearchEngine';
import type { Part } from '@/hooks/usePartsDatabase';

interface PartSearchInlineProps {
  parts: Part[];
  onAddPart: (part: Part) => void;
}

export function PartSearchInline({ parts, onAddPart }: PartSearchInlineProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Part[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      const found = smartFilterParts(parts, value).slice(0, 20);
      setResults(found);
    }, 250);
  }, [parts]);

  const handleAdd = (part: Part) => {
    onAddPart(part);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar peça por código, nome ou veículo..."
            value={query}
            onChange={e => { handleSearch(e.target.value); setOpen(true); }}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="pl-9"
          />
        </div>
        {query && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setQuery(''); setResults([]); }}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="border border-border rounded-lg max-h-60 overflow-y-auto bg-card shadow-lg">
          {results.map((part, idx) => (
            <div
              key={`${part.fabricante}-${idx}`}
              className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 border-b border-border last:border-b-0 cursor-pointer group"
              onClick={() => handleAdd(part)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-primary">{part.fabricante}</span>
                  <span className="text-xs text-muted-foreground truncate">{part.fornecedor}</span>
                </div>
                <p className="text-sm truncate">{part.produto}</p>
                {part.marca && (
                  <p className="text-xs text-muted-foreground truncate">{part.marca} {part.modelo} {part.ano}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-green-600">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhuma peça encontrada</p>
      )}
    </div>
  );
}
