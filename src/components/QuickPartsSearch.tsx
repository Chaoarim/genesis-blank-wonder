import { useState, useMemo, useCallback } from 'react';
import { Search, X, ChevronDown, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Part } from '@/hooks/usePartsDatabase';
import { smartFilterParts } from '@/lib/partsSearchEngine';
import { PartThumbnail } from './PartThumbnail';

interface QuickPartsSearchProps {
  parts: Part[];
  disabled?: boolean;
}

const PAGE_SIZE = 50;

export function QuickPartsSearch({ parts, disabled }: QuickPartsSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const allResults = useMemo(() => {
    if (search.length < 2) return [];
    return smartFilterParts(parts, search);
  }, [search, parts]);

  const visibleResults = useMemo(() => allResults.slice(0, visibleCount), [allResults, visibleCount]);

  const grouped = useMemo(() => {
    const map = new Map<string, Part[]>();
    for (const part of visibleResults) {
      const key = part.fornecedor || 'Outros';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(part);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleResults]);

  const hasMore = visibleCount < allResults.length;

  const handleClose = () => {
    setOpen(false);
    setSearch('');
    setVisibleCount(PAGE_SIZE);
  };

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Busca Rápida</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
            <DialogTitle className="text-base font-semibold">Busca Rápida de Peças</DialogTitle>
          </DialogHeader>

          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Código, peça, fornecedor ou veículo..."
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

          <div className="flex-1 min-h-0">
            {search.length >= 2 && (
              <div className="px-4 py-1.5 border-b border-border bg-muted/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  {allResults.length > 0
                    ? `${allResults.length} resultado${allResults.length > 1 ? 's' : ''}`
                    : 'Nenhum resultado'}
                </span>
                {allResults.length > PAGE_SIZE && (
                  <span className="text-xs text-muted-foreground">
                    mostrando {Math.min(visibleCount, allResults.length)} de {allResults.length}
                  </span>
                )}
              </div>
            )}

            <ScrollArea className="max-h-[50vh]">
              {search.length < 2 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Digite pelo menos 2 caracteres para buscar
                </div>
              ) : grouped.length > 0 ? (
                <div>
                  {grouped.map(([fornecedor, groupParts]) => (
                    <div key={fornecedor}>
                      <div className="sticky top-0 z-10 px-4 py-2 bg-muted border-b border-border">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {fornecedor}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({groupParts.length})
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {groupParts.map((part, idx) => (
                          <div
                            key={`${part.fabricante}-${fornecedor}-${idx}`}
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
                      </div>
                    </div>
                  ))}

                  {hasMore && (
                    <div className="px-4 py-3 flex justify-center border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                        className="gap-2"
                      >
                        <ChevronDown className="w-4 h-4" />
                        Carregar mais {Math.min(PAGE_SIZE, allResults.length - visibleCount)} resultados
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Nenhuma peça encontrada para "{search}"
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
