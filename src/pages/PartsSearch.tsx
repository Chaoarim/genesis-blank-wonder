import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronDown, Sparkles, ArrowLeft, BookOpen, Compass, Plus } from 'lucide-react';
import { usePartsDatabase, Part } from '@/hooks/usePartsDatabase';
import { smartFilterParts } from '@/lib/partsSearchEngine';
import { PartThumbnail } from '@/components/PartThumbnail';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

const PartsSearch = () => {
  const navigate = useNavigate();
  const { parts, isLoading: partsLoading } = usePartsDatabase();
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
    });
  }, [navigate]);

  

  // Supplier stats
  const supplierStats = useMemo(() => {
    const map = new Map<string, { count: number; products: string[] }>();
    for (const p of parts) {
      if (!p.fornecedor) continue;
      const entry = map.get(p.fornecedor);
      if (entry) {
        entry.count++;
        if (entry.products.length < 8) entry.products.push(p.produto);
      } else {
        map.set(p.fornecedor, { count: 1, products: [p.produto] });
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [parts]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return supplierStats;
    const q = supplierSearch.toLowerCase();
    return supplierStats.filter(s => s.name.toLowerCase().includes(q));
  }, [supplierStats, supplierSearch]);

  // Parts filtering when a supplier is selected
  const supplierParts = useMemo(() => {
    if (!selectedSupplier) return [];
    return parts.filter(p => p.fornecedor === selectedSupplier);
  }, [parts, selectedSupplier]);

  const filtered = useMemo(() => {
    if (!selectedSupplier) return [];
    if (search.length < 2) return supplierParts;
    return smartFilterParts(supplierParts, search);
  }, [search, supplierParts, selectedSupplier]);

  const visibleResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  // Supplier cards view
  if (!selectedSupplier) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <BookOpen className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <h1 className="text-lg font-bold leading-tight">
                Catálogos por Fornecedor
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({supplierStats.length} fornecedores)
                </span>
              </h1>
            </div>
            {partsLoading ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
                <span className="w-3 h-3 border-2 border-muted-foreground/40 border-t-primary rounded-full animate-spin" />
                Carregando
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium shrink-0">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Online
              </span>
            )}
          </div>
        </header>

        <div className="border-b border-border bg-card/50">
          <div className="container mx-auto px-4 py-3 max-w-6xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Pesquisar fornecedor..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="pl-10 pr-9"
              />
              {supplierSearch && (
                <button
                  onClick={() => setSupplierSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-4 max-w-6xl">
            {partsLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
                Carregando catálogos...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredSuppliers.map((supplier) => (
                  <Card
                    key={supplier.name}
                    className="p-4 flex flex-col gap-2 cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all"
                    onClick={() => {
                      setSelectedSupplier(supplier.name);
                      setSearch('');
                      setVisibleCount(PAGE_SIZE);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(supplier.name)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm leading-tight truncate">{supplier.name}</h3>
                        <p className="text-xs text-muted-foreground">{supplier.count.toLocaleString()} peças</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {supplier.products.slice(0, 3).join(', ')}...
                    </p>
                    <Button variant="secondary" size="sm" className="w-full mt-auto gap-1.5 text-xs">
                      <Compass className="w-3.5 h-3.5" />
                      Consulta rápida
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {!partsLoading && filteredSuppliers.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Nenhum fornecedor encontrado{supplierSearch ? ` para "${supplierSearch}"` : ''}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Parts list view (selected supplier)
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedSupplier(null)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {getInitials(selectedSupplier)}
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">{selectedSupplier}</h1>
            <p className="text-xs text-muted-foreground">
              {supplierParts.length.toLocaleString()} peças
            </p>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-3 max-w-4xl">
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

      <div className="border-b border-border bg-muted/50">
        <div className="container mx-auto px-4 py-1.5 max-w-4xl">
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
      </div>

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
                      <p className="text-sm text-foreground mt-0.5">{part.produto}</p>
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
