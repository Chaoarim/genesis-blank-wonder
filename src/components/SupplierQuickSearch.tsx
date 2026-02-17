import { useState, useMemo, useCallback } from 'react';
import { Search, X, Package, ChevronDown, ArrowLeft, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Part } from '@/hooks/usePartsDatabase';

interface SupplierQuickSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierName: string;
  parts: Part[];
}

const PAGE_SIZE = 50;

const normalizeForSearch = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function SupplierQuickSearch({ open, onOpenChange, supplierName, parts }: SupplierQuickSearchProps) {
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const supplierParts = useMemo(() => {
    const name = supplierName.trim().toUpperCase();
    return parts.filter(p => p.fornecedor.trim().toUpperCase() === name);
  }, [parts, supplierName]);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(search);
    if (q.length < 2) return supplierParts;

    const terms = q.split(' ').filter(t => t.length >= 2);
    if (terms.length === 0) return supplierParts;

    // Laterality terms - MANDATORY filters when present
    const LATERALITY_TERMS = new Set([
      'dianteiro', 'dianteira', 'traseiro', 'traseira',
      'esquerdo', 'esquerda', 'direito', 'direita',
    ]);

    const VEHICLE_TERMS = new Set([
      'gol', 'parati', 'saveiro', 'voyage', 'fox', 'polo', 'golf', 'up',
      'corsa', 'celta', 'onix', 'prisma', 'cobalt', 'montana', 'agile', 'spin', 'cruze', 'tracker',
      'uno', 'palio', 'siena', 'strada', 'mobi', 'argo', 'cronos', 'toro', 'fiorino', 'doblo',
      'fiesta', 'ka', 'focus', 'ecosport', 'ranger', 'fusion',
      'civic', 'fit', 'city', 'hrv', 'crv', 'accord',
      'corolla', 'etios', 'yaris', 'hilux', 'camry', 'rav4', 'sw4',
      'hb20', 'tucson', 'creta', 'ix35', 'santa', 'veloster',
      'logan', 'sandero', 'duster', 'kwid', 'captur',
      'kicks', 'versa', 'march', 'sentra', 'frontier', 'livina',
      'amarok', 'tiguan', 'jetta', 'passat', 'tcross', 'taos', 'nivus', 'virtus',
      'astra', 'vectra', 'meriva', 'zafira', 's10', 'blazer', 'trailblazer',
      'pampa', 'escort', 'versailles', 'del', 'rey', 'belina',
      'kombi', 'fusca', 'brasilia', 'variant',
      'punto', 'linea', 'bravo', 'idea', 'weekend',
      'clio', 'megane', 'scenic', 'symbol', 'fluence',
      'picanto', 'cerato', 'sportage', 'sorento', 'soul',
    ]);

    const productTerms: string[] = [];
    const vehicleTerms: string[] = [];
    const lateralityTerms: string[] = [];

    for (const term of terms) {
      if (LATERALITY_TERMS.has(term)) {
        lateralityTerms.push(term);
      } else if (VEHICLE_TERMS.has(term)) {
        vehicleTerms.push(term);
      } else {
        productTerms.push(term);
      }
    }

    const scored: { part: Part; score: number }[] = [];

    for (const part of supplierParts) {
      const code = normalizeForSearch(part.fabricante);
      const produto = normalizeForSearch(part.produto);
      const chave = normalizeForSearch(part.chaveDeBusca);
      const marca = normalizeForSearch(part.marca || '');
      const modelo = normalizeForSearch(part.modelo || '');
      const ano = normalizeForSearch(part.ano || '');
      const fullText = `${produto} ${chave} ${marca} ${modelo} ${ano}`;

      // MANDATORY: ALL laterality terms must match
      if (lateralityTerms.length > 0) {
        if (!lateralityTerms.every(lt => fullText.includes(lt))) continue;
      }

      // MANDATORY: ALL vehicle terms must match
      if (vehicleTerms.length > 0) {
        if (!vehicleTerms.every(vt => fullText.includes(vt))) continue;
      }

      // Strict product matching: if searching "amortecedor", exclude "coxim do amortecedor", "kit de amortecedor", etc.
      // The main product term must appear as THE product, not as a qualifier of another product
      const PRODUCT_PREFIXES_TO_EXCLUDE = ['coxim', 'kit', 'batente', 'coifa', 'suporte', 'prato', 'base', 'reparo'];
      
      if (productTerms.length > 0) {
        let excluded = false;
        for (const term of productTerms) {
          // Check if this part's description has a prefix that changes the product meaning
          const produtoWords = produto.split(' ').filter(w => w.length >= 2);
          const termIndex = produtoWords.indexOf(term);
          
          if (termIndex > 0) {
            // The term appears but is NOT the first meaningful word - check if preceded by an exclusion prefix
            const precedingWords = produtoWords.slice(0, termIndex);
            if (precedingWords.some(pw => PRODUCT_PREFIXES_TO_EXCLUDE.includes(pw))) {
              excluded = true;
              break;
            }
          }
          
          // Also check if the product starts with an exclusion prefix AND contains our term
          if (produto.includes(term)) {
            for (const prefix of PRODUCT_PREFIXES_TO_EXCLUDE) {
              if (produto.startsWith(prefix) && !productTerms.includes(prefix)) {
                excluded = true;
                break;
              }
            }
          }
          if (excluded) break;
        }
        if (excluded) continue;
      }

      let score = 0;
      let matchedProduct = 0;

      score += lateralityTerms.length * 5;
      score += vehicleTerms.length * 4;

      for (const term of productTerms) {
        let termScore = 0;
        if (code === term) termScore += 10;
        else if (code.includes(term)) termScore += 5;
        if (produto.includes(term)) termScore += 3;
        if (chave.includes(term)) termScore += 1;

        if (termScore > 0) {
          matchedProduct++;
          score += termScore;
        }
      }

      if (productTerms.length > 0 && matchedProduct / productTerms.length < 0.5) continue;
      if (score <= 0) continue;

      scored.push({ part, score });
    }

    return scored.sort((a, b) => b.score - a.score).map(s => s.part);
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
                    <Package className="w-4 h-4 text-primary mt-0.5 shrink-0" />
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
                      title="Pesquisa Web"
                      onClick={(e) => {
                        e.stopPropagation();
                        const query = [part.fabricante, part.produto, part.marca, part.modelo].filter(Boolean).join(' ');
                        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, '_blank');
                      }}
                    >
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
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
