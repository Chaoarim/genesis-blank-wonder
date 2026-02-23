import { useState, useMemo, useCallback } from 'react';
import { Search, X, ChevronDown, ArrowLeft, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Part } from '@/hooks/usePartsDatabase';
import { smartFilterParts } from '@/lib/partsSearchEngine';
import { PartThumbnail } from './PartThumbnail';

interface SupplierQuickSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierName: string;
  parts: Part[];
}

const PAGE_SIZE = 50;

export function SupplierQuickSearch({ open, onOpenChange, supplierName, parts }: SupplierQuickSearchProps) {
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  

  const supplierParts = useMemo(() => {
    const name = supplierName.trim().toUpperCase();
    return parts.filter(p => p.fornecedor.trim().toUpperCase() === name);
  }, [parts, supplierName]);

  const filtered = useMemo(() => {
    if (search.length < 2) return supplierParts;
    return smartFilterParts(supplierParts, search);
  }, [search, supplierParts]);

  const visibleResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const handleClose = () => {
    onOpenChange(false);
    setSearch('');
    setVisibleCount(PAGE_SIZE);
  };

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <DialogTitle className="text-base font-semibold">
              {supplierName}
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({supplierParts.length.toLocaleString()} peças)
              </span>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar código, peça ou veículo..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-9"
            />
            {search && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-1.5 border-b border-border bg-muted/50">
          <span className="text-xs text-muted-foreground font-medium">
            {search.length >= 2
              ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
              : `${supplierParts.length} peças no catálogo`}
            {filtered.length > PAGE_SIZE && (
              <span className="ml-2">
                · mostrando {Math.min(visibleCount, filtered.length)} de {filtered.length}
              </span>
            )}
          </span>
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[60vh]" style={{ overflow: 'auto' }}>
          {visibleResults.length > 0 ? (
            <div className="divide-y divide-border">
              {visibleResults.map((part, idx) => (
                <div
                  key={`${part.fabricante}-${idx}`}
                  className="px-4 py-2.5 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <PartThumbnail imageUrl={part.imageUrl} alt={part.produto} className="w-9 h-9 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm text-primary">
                          {part.fabricante}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5 truncate">
                        {part.produto}
                      </p>
                      {(part.marca || part.modelo) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[part.marca, part.modelo, part.ano].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 mt-0.5"
                      title="Modo IA"
                      onClick={(e) => {
                        e.stopPropagation();
                        const query = [part.fabricante, part.produto, part.marca, part.modelo].filter(Boolean).join(' ');
                        window.open(`https://gemini.google.com/app?q=${encodeURIComponent(query)}`, '_blank');
                      }}
                    >
                      <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="px-4 py-3 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                    className="gap-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Carregar mais {Math.min(PAGE_SIZE, filtered.length - visibleCount)} resultados
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma peça encontrada{search ? ` para "${search}"` : ''}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
