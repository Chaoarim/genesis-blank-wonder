import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BookOpen, Search, X, ChevronDown, Sparkles, Plus, Filter, Link } from 'lucide-react';
import { Part } from '@/hooks/usePartsDatabase';
import { smartFilterParts } from '@/lib/partsSearchEngine';
import { PartThumbnail } from './PartThumbnail';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CatalogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parts: Part[];
  onConsultAI?: (supplierName: string) => void;
  onAddToQuote?: (part: { codigo: string; fornecedor: string; produto: string; aplicacao: string }) => void;
}

const PAGE_SIZE = 50;

export function CatalogsDialog({ open, onOpenChange, parts, onAddToQuote }: CatalogsDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const suppliers = useMemo(() => {
    const set = new Set<string>();
    for (const p of parts) {
      if (p.fornecedor) set.add(p.fornecedor);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [parts]);

  const partsForSearch = useMemo(() => {
    if (selectedSupplier === 'all') return parts;
    return parts.filter(p => p.fornecedor === selectedSupplier);
  }, [parts, selectedSupplier]);

  const filtered = useMemo(() => {
    if (search.length < 2) return partsForSearch;
    return smartFilterParts(partsForSearch, search);
  }, [search, partsForSearch]);

  const visibleResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const handleClose = () => {
    onOpenChange(false);
    setSearch('');
    setSelectedSupplier('all');
    setVisibleCount(PAGE_SIZE);
  };

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleSupplierChange = useCallback((val: string) => {
    setSelectedSupplier(val);
    setVisibleCount(PAGE_SIZE);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="w-5 h-5 text-primary" />
            Buscar Peças
            <span className="text-xs font-normal text-muted-foreground">
              ({partsForSearch.length.toLocaleString()} peças{selectedSupplier !== 'all' ? ` · ${selectedSupplier}` : ` · ${suppliers.length} fornecedores`})
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={selectedSupplier} onValueChange={handleSupplierChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Todos os fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fornecedores</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              : `${partsForSearch.length} peças no catálogo`}
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          {part.fornecedor}
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
                      title="Pesquisa Web"
                      onClick={(e) => {
                        e.stopPropagation();
                        const query = [part.fabricante, part.produto, part.marca, part.modelo].filter(Boolean).join(' ');
                        window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank');
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    {onAddToQuote && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 mt-0.5 text-green-500 hover:text-green-400"
                        title="Adicionar ao orçamento"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToQuote({
                            codigo: part.fabricante || '',
                            fornecedor: part.fornecedor || '',
                            produto: part.produto || '',
                            aplicacao: [part.marca, part.modelo, part.ano].filter(Boolean).join(' '),
                          });
                          toast.success('Peça adicionada ao orçamento');
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    )}
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
