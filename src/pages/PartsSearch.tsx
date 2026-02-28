import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Filter, ChevronDown, Sparkles, Plus, ArrowLeft, Zap } from 'lucide-react';
import { usePartsDatabase, Part } from '@/hooks/usePartsDatabase';
import { smartFilterParts } from '@/lib/partsSearchEngine';
import { PartThumbnail } from '@/components/PartThumbnail';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 50;

const PartsSearch = () => {
  const navigate = useNavigate();
  const { parts } = usePartsDatabase();
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
    });
  }, [navigate]);

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

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleSupplierChange = useCallback((val: string) => {
    setSelectedSupplier(val);
    setVisibleCount(PAGE_SIZE);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
              <Search className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Buscar Peças</h1>
              <p className="text-xs text-muted-foreground">
                {partsForSearch.length.toLocaleString()} peças
                {selectedSupplier !== 'all' ? ` · ${selectedSupplier}` : ` · ${suppliers.length} fornecedores`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-3 space-y-2 max-w-4xl">
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
      </div>

      {/* Results count */}
      <div className="border-b border-border bg-muted/50">
        <div className="container mx-auto px-4 py-1.5 max-w-4xl">
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
      </div>

      {/* Results */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-4xl">
          {visibleResults.length > 0 ? (
            <div className="divide-y divide-border">
              {visibleResults.map((part, idx) => (
                <div
                  key={`${part.fabricante}-${idx}`}
                  className="px-4 py-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <PartThumbnail imageUrl={part.imageUrl} alt={part.produto} className="w-10 h-10 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm text-primary">
                          {part.fabricante}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          {part.fornecedor}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">
                        {part.produto}
                      </p>
                      {(part.marca || part.modelo) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[part.marca, part.modelo, part.ano].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 mt-0.5"
                      title="Pesquisa Web"
                      onClick={() => {
                        const query = [part.fabricante, part.produto, part.marca, part.modelo].filter(Boolean).join(' ');
                        window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank');
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="px-4 py-4 flex justify-center">
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
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhuma peça encontrada{search ? ` para "${search}"` : ''}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PartsSearch;
