import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronDown, Sparkles, ArrowLeft, BookOpen, Compass, Car, Link } from 'lucide-react';
import { usePartsDatabase, Part } from '@/hooks/usePartsDatabase';
import { smartFilterParts } from '@/lib/partsSearchEngine';
import { PartThumbnail } from '@/components/PartThumbnail';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const PAGE_SIZE = 50;

const PartsSearch = () => {
  const navigate = useNavigate();
  const { parts, isLoading: partsLoading } = usePartsDatabase();
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
    });
  }, [navigate]);

  // Catalog stats (by vehicle)
  const catalogStats = useMemo(() => {
    const map = new Map<string, { count: number; suppliers: Set<string>; samples: string[] }>();
    for (const p of parts) {
      const cat = p.catalogo || 'Sem catálogo';
      const entry = map.get(cat);
      if (entry) {
        entry.count++;
        if (p.fornecedor) entry.suppliers.add(p.fornecedor);
        if (entry.samples.length < 5) entry.samples.push(p.produto);
      } else {
        const suppliers = new Set<string>();
        if (p.fornecedor) suppliers.add(p.fornecedor);
        map.set(cat, { count: 1, suppliers, samples: [p.produto] });
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, count: data.count, supplierCount: data.suppliers.size, samples: data.samples }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [parts]);

  const filteredCatalogs = useMemo(() => {
    if (!catalogSearch) return catalogStats;
    const q = catalogSearch.toLowerCase();
    return catalogStats.filter(c => c.name.toLowerCase().includes(q));
  }, [catalogStats, catalogSearch]);

  // Parts filtering when a catalog is selected
  const catalogParts = useMemo(() => {
    if (!selectedCatalog) return [];
    return parts.filter(p => (p.catalogo || 'Sem catálogo') === selectedCatalog);
  }, [parts, selectedCatalog]);

  const filtered = useMemo(() => {
    if (!selectedCatalog) return [];
    if (search.length < 2) return catalogParts;
    return smartFilterParts(catalogParts, search);
  }, [search, catalogParts, selectedCatalog]);

  const visibleResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const getInitials = (name: string) => {
    const words = name.split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // Vehicle catalog cards view
  if (!selectedCatalog) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Car className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <h1 className="text-lg font-bold leading-tight">
                Catálogos por Veículo
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({catalogStats.length} veículos)
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
                placeholder="Pesquisar veículo..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pl-10 pr-9"
              />
              {catalogSearch && (
                <button
                  onClick={() => setCatalogSearch('')}
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
                {filteredCatalogs.map((catalog) => (
                  <Card
                    key={catalog.name}
                    className="p-4 flex flex-col gap-2 cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all"
                    onClick={() => {
                      setSelectedCatalog(catalog.name);
                      setSearch('');
                      setVisibleCount(PAGE_SIZE);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        <Car className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm leading-tight truncate">{catalog.name}</h3>
                        <p className="text-xs text-muted-foreground">{catalog.count.toLocaleString()} peças</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {catalog.supplierCount} fornecedor{catalog.supplierCount !== 1 ? 'es' : ''}
                    </p>
                    <Button variant="secondary" size="sm" className="w-full mt-auto gap-1.5 text-xs">
                      <Compass className="w-3.5 h-3.5" />
                      Consultar peças
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {!partsLoading && filteredCatalogs.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Nenhum catálogo encontrado{catalogSearch ? ` para "${catalogSearch}"` : ''}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Parts list view (selected catalog)
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCatalog(null)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-9 h-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">{selectedCatalog}</h1>
            <p className="text-xs text-muted-foreground">
              {catalogParts.length.toLocaleString()} peças
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
              placeholder="Buscar código, peça, fornecedor ou aplicação..."
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
              : `${catalogParts.length} peças no catálogo`}
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
                      {part.contextoIA && (
                        <p className="text-xs text-muted-foreground mt-0.5">{part.contextoIA}</p>
                      )}
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
                        const query = [part.fabricante, part.produto, part.fornecedor].filter(Boolean).join(' ');
                        window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank');
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    
                    {part.codigosSimilares && part.codigosSimilares.trim() !== '' && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 mt-0.5"
                            title="Códigos Similares"
                          >
                            <Link className="w-4 h-4 text-blue-500" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 shadow-md" side="top">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Códigos Similares (Conversão)</h4>
                            <p className="text-sm text-muted-foreground">{part.codigosSimilares}</p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
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
