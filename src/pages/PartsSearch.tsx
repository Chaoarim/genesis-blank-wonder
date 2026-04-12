import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronDown, Sparkles, LogOut, Car, Link as LinkIcon, Loader2, CreditCard, Tag, ArrowLeft, BarChart3, ShoppingCart, Check, BookOpen } from 'lucide-react';

const FleetRankingsManager = lazy(() => import('@/components/sales/FleetRankingsManager').then(m => ({ default: m.FleetRankingsManager })));
const RadarML = lazy(() => import('@/pages/RadarML'));
import { usePartsDatabase, Part } from '@/hooks/usePartsDatabase';
import { smartFilterParts } from '@/lib/partsSearchEngine';
import { PartThumbnail } from '@/components/PartThumbnail';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuoteCart } from '@/hooks/useQuoteCart';
import { QuotePanel } from '@/components/QuotePanel';

const PAGE_SIZE = 50;

type SearchMode = 'unified' | 'placa' | 'veiculo' | 'frota';

function detectSearchType(query: string): 'placa' | 'code' | 'general' {
  const clean = query.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  // Mercosul plate: 3 letters + 1 digit + 1 letter + 2 digits (ABC1D23)
  // Old format: 3 letters + 4 digits (ABC1234)
  if (clean.length === 7 && (/^[A-Z]{3}\d{4}$/.test(clean) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(clean))) {
    return 'placa';
  }
  // Likely part code: contains digits and letters mixed, 4+ chars
  if (/^(?=.*\d)[a-zA-Z0-9\s-]{4,}$/.test(query.trim()) && !/\s/.test(query.trim())) {
    return 'code';
  }
  return 'general';
}

const PartsSearch = () => {
  const navigate = useNavigate();
  const { parts, isLoading: partsLoading } = usePartsDatabase();
  const { items: cartItems, addItem, removeItem, updateItem, clearCart, sendToWhatsApp, quoteName, setQuoteName, saveQuote, savedQuotes, loadQuote, deleteSavedQuote } = useQuoteCart();
  const cartKeys = useMemo(() => cartItems.map(i => `${i.codigo}-${i.fornecedor}`), [cartItems]);
  const [mode, setMode] = useState<SearchMode>('unified');

  // Unified search with debounce
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce: update `search` 200ms after user stops typing
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // Placa
  const [placa, setPlaca] = useState('');
  const [searchingPlaca, setSearchingPlaca] = useState(false);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [placaPartsSearch, setPlacaPartsSearch] = useState('');

  // Catalogs
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
    });
  }, [navigate]);

  // Detect plate pattern — use instant input, not debounced
  const detectedType = useMemo(() => detectSearchType(searchInput), [searchInput]);
  const showPlacaSuggestion = mode === 'unified' && detectedType === 'placa' && searchInput.length >= 7;

  // Catalog stats
  const catalogStats = useMemo(() => {
    const map = new Map<string, { count: number; suppliers: Set<string> }>();
    for (const p of parts) {
      const cat = p.catalogo || 'Sem catálogo';
      const entry = map.get(cat);
      if (entry) {
        entry.count++;
        if (p.fornecedor) entry.suppliers.add(p.fornecedor);
      } else {
        const suppliers = new Set<string>();
        if (p.fornecedor) suppliers.add(p.fornecedor);
        map.set(cat, { count: 1, suppliers });
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, count: data.count, supplierCount: data.suppliers.size }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [parts]);

  const filteredCatalogs = useMemo(() => {
    if (!catalogSearch) return catalogStats;
    const q = catalogSearch.toLowerCase();
    return catalogStats.filter(c => c.name.toLowerCase().includes(q));
  }, [catalogStats, catalogSearch]);

  const catalogParts = useMemo(() => {
    if (!selectedCatalog) return [];
    return parts.filter(p => (p.catalogo || 'Sem catálogo') === selectedCatalog);
  }, [parts, selectedCatalog]);

  // Search results
  const filtered = useMemo(() => {
    if (mode === 'veiculo' && selectedCatalog) {
      if (search.length < 2) return catalogParts;
      return smartFilterParts(catalogParts, search);
    }
    if (mode === 'placa' && vehicleData) {
      const modelFirstWord = (vehicleData.MODELO || '').split(' ')[0];
      const modelQuery = modelFirstWord || (vehicleData.MARCA || '');
      const query = placaPartsSearch.trim() ? `${modelQuery} ${placaPartsSearch}` : modelQuery;
      return smartFilterParts(parts, query);
    }
    if (mode === 'unified') {
      if (search.length < 2) return [];
      return smartFilterParts(parts, search);
    }
    return [];
  }, [search, catalogParts, selectedCatalog, mode, vehicleData, parts, placaPartsSearch]);

  const visibleResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const handleSearchChange = useCallback((val: string) => {
    setSearchInput(val);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handlePlacaSearch = async (placaValue?: string) => {
    const targetPlaca = placaValue || placa;
    if (targetPlaca.length < 7) {
      toast.error('Informe uma placa válida');
      return;
    }
    setSearchingPlaca(true);
    setVehicleData(null);
    try {
      const token = 'c66feee885a811865464d834187e9fa9';
      const cleanPlaca = targetPlaca.replace(/[^a-zA-Z0-9]/g, '');
      const response = await fetch(`https://wdapi2.com.br/consulta/${cleanPlaca}/${token}`);
      if (!response.ok) throw new Error('Falha na consulta');
      const data = await response.json();
      if (data && data.MARCA) {
        setVehicleData(data);
        setMode('placa');
        setPlaca(targetPlaca.toUpperCase());
        toast.success(`Veículo encontrado: ${data.MARCA} ${data.MODELO}`);
      } else {
        toast.error('Veículo não encontrado ou placa inválida');
      }
    } catch {
      toast.error('Erro ao consultar placa');
    } finally {
      setSearchingPlaca(false);
    }
  };

  const switchToUnified = () => {
    setMode('unified');
    setSelectedCatalog(null);
    setVehicleData(null);
    setPlaca('');
    setPlacaPartsSearch('');
    setSearchInput('');
    setSearch('');
  };

  const renderPartList = () => (
    <div className="mt-4">
      <div className="mb-3">
        <span className="text-xs text-muted-foreground font-medium">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {visibleResults.length > 0 ? (
        <div className="divide-y divide-border bg-card rounded-lg border">
          {visibleResults.map((part, idx) => (
            <div key={`${part.fabricante}-${idx}`} className="px-4 py-3 hover:bg-accent/50 transition-colors">
              <div className="flex items-start gap-3">
                <PartThumbnail imageUrl={part.imageUrl} alt={part.produto} className="w-10 h-10 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-sm text-primary">{part.fabricante}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{part.fornecedor}</span>
                  </div>
                  <p className="text-sm text-foreground mt-0.5">{part.produto}</p>
                  {(part.aplicacao || part.marca || part.modelo) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {part.aplicacao || [part.marca, part.modelo, part.ano].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {(() => {
                  const key = `${part.fabricante}-${part.fornecedor}`;
                  const inCart = cartKeys.includes(key);
                  return (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 shrink-0 mt-0.5 ${inCart ? 'text-green-600' : 'text-muted-foreground hover:text-green-600'}`}
                      title={inCart ? 'Já no carrinho' : 'Adicionar à cotação'}
                      disabled={inCart}
                      onClick={(e) => {
                        e.stopPropagation();
                        addItem({
                          codigo: part.fabricante,
                          fornecedor: part.fornecedor,
                          produto: part.produto,
                          aplicacao: part.aplicacao || [part.marca, part.modelo, part.ano].filter(Boolean).join(' '),
                        });
                        toast.success('Peça adicionada à cotação');
                      }}
                    >
                      {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                    </Button>
                  );
                })()}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 mt-0.5"
                  title="Consulta Web"
                  onClick={(e) => {
                    e.stopPropagation();
                    const query = [part.fabricante, part.produto, part.marca, part.modelo].filter(Boolean).join(' ');
                    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank');
                  }}
                >
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                </Button>
                {part.codigosSimilares && part.codigosSimilares.trim() !== '' && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5" title="Códigos Similares">
                        <LinkIcon className="w-4 h-4 text-blue-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 shadow-md" side="top">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Códigos Similares</h4>
                        <p className="text-sm text-muted-foreground">{part.codigosSimilares}</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="px-4 py-4 flex justify-center border-t">
              <Button variant="outline" size="sm" onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)} className="gap-2">
                <ChevronDown className="w-4 h-4" />
                Carregar mais {Math.min(PAGE_SIZE, filtered.length - visibleCount)} resultados
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Nenhuma peça encontrada.
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={async () => {
              if (mode !== 'unified') {
                switchToUnified();
              } else {
                await supabase.auth.signOut();
                navigate('/login');
              }
            }} className="shrink-0" title={mode !== 'unified' ? 'Voltar' : 'Sair'}>
              {mode !== 'unified' ? <ArrowLeft className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
            </Button>
            <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
              <div className="relative">
                <Search className="w-5 h-5 text-primary" />
                <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
              </div>
              Consulta de Peças
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {mode !== 'unified' && (
              <Badge variant="outline" className="text-xs gap-1 cursor-pointer" onClick={switchToUnified}>
                {mode === 'placa' ? '🚗 Placa' : mode === 'frota' ? '📊 Frota' : '📋 Veículo'}
                <X className="w-3 h-3" />
              </Badge>
            )}
            <QuotePanel
              items={cartItems}
              quoteName={quoteName}
              onSetQuoteName={setQuoteName}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
              onSendWhatsApp={sendToWhatsApp}
              onSaveQuote={saveQuote}
              savedQuotes={savedQuotes}
              onLoadQuote={loadQuote}
              onDeleteSavedQuote={deleteSavedQuote}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="container mx-auto py-6 px-4 max-w-4xl">

          {/* === UNIFIED MODE === */}
          {mode === 'unified' && (
            <div className="space-y-6">
              {/* Big unified search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Código, peça, veículo, marca, fornecedor..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-12 pr-10 h-14 border-2 text-lg rounded-xl"
                />
                {searchInput && (
                  <button
                    onClick={() => { handleSearchChange(''); setSearch(''); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Plate detection hint */}
              {showPlacaSuggestion && (
                <Card className="p-4 border-primary/30 bg-primary/5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Parece uma placa de veículo!</p>
                      <p className="text-xs text-muted-foreground">Quer consultar o Detran para identificar o veículo?</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handlePlacaSearch(searchInput)}
                      disabled={searchingPlaca}
                      className="shrink-0 gap-1"
                    >
                      {searchingPlaca ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Consultar
                    </Button>
                  </div>
                </Card>
              )}

              {/* Quick access buttons */}
              {searchInput.length < 2 && (
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className="p-4 cursor-pointer hover:border-primary transition-colors flex items-center gap-3"
                    onClick={() => setMode('placa')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Buscar por Placa</h3>
                      <p className="text-xs text-muted-foreground">Identifica o veículo via Detran</p>
                    </div>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover:border-primary transition-colors flex items-center gap-3"
                    onClick={() => setMode('veiculo')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Consulta por Veículos</h3>
                      <p className="text-xs text-muted-foreground">Navegue pelos catálogos</p>
                    </div>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover:border-primary transition-colors flex items-center gap-3"
                    onClick={() => {
                      setMode('veiculo');
                      setSelectedCatalog('CATÁLOGO MASTER');
                      setSearch('');
                      setSearchInput('');
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Catálogo Master</h3>
                      <p className="text-xs text-muted-foreground">Base completa de peças</p>
                    </div>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover:border-primary transition-colors flex items-center gap-3"
                    onClick={() => setMode('frota')}
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Inteligência Automotiva</h3>
                      <p className="text-xs text-muted-foreground">Previsão de demanda de peças</p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Auto-detected type indicator */}
              {searchInput.length >= 2 && !showPlacaSuggestion && (
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {detectedType === 'code' ? 'Detectado: busca por código' : 'Busca geral'}
                  </span>
                </div>
              )}

              {search.length >= 2 && renderPartList()}
            </div>
          )}

          {/* === PLACA MODE === */}
          {mode === 'placa' && !vehicleData && (
            <Card className="p-8 flex flex-col items-center justify-center min-h-[300px] border-2 border-primary/10 shadow-lg">
              <span className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-widest">Digite a Placa</span>
              <div className="relative mb-6">
                <Input
                  autoFocus
                  value={placa}
                  onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                  placeholder="ABC1234"
                  maxLength={7}
                  onKeyDown={(e) => e.key === 'Enter' && handlePlacaSearch()}
                  className="text-center text-4xl sm:text-5xl h-24 sm:h-28 w-64 sm:w-80 font-bold uppercase tracking-widest bg-muted/50 border-2 focus-visible:ring-primary shadow-inner"
                />
                <div className="absolute top-0 right-3 h-full flex items-center">
                  <div className="w-6 h-4 bg-blue-700 rounded-sm flex items-center justify-center shadow-sm">
                    <span className="text-[8px] font-bold text-white">BR</span>
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => handlePlacaSearch()}
                disabled={placa.length < 7 || searchingPlaca}
                className="w-64 h-12 text-md font-bold transition-all shadow-md hover:shadow-lg"
              >
                {searchingPlaca ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
                {searchingPlaca ? 'Consultando Detran...' : 'Buscar Peças'}
              </Button>
            </Card>
          )}

          {mode === 'placa' && vehicleData && (
            <div>
              <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg flex items-center justify-between mb-4 border border-primary/20">
                <div>
                  <span className="text-xs font-bold uppercase opacity-80">Veículo Identificado:</span>
                  <h3 className="text-lg font-bold">{vehicleData.MARCA} {vehicleData.MODELO}</h3>
                  <p className="text-xs mt-0.5 opacity-80 flex flex-wrap gap-x-3">
                    {(vehicleData.ano || vehicleData.anoModelo) && <span>Ano: {vehicleData.ano || vehicleData.anoModelo}</span>}
                    {(vehicleData.cilindrada || vehicleData.cilindradas || vehicleData.potencia || vehicleData.motor) && (
                      <span>Motor: {vehicleData.cilindrada || vehicleData.cilindradas || vehicleData.potencia || vehicleData.motor}</span>
                    )}
                    {(vehicleData.combustivel || vehicleData.COMBUSTIVEL) && <span>Combustível: {vehicleData.combustivel || vehicleData.COMBUSTIVEL}</span>}
                  </p>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder={`Buscar peças para ${vehicleData.MODELO?.split(' ')[0] || 'este veículo'} (ex: Pastilha, Filtro)...`}
                  value={placaPartsSearch}
                  onChange={(e) => { setPlacaPartsSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                  className="pl-10 pr-9 h-12 bg-card border-2"
                />
                {placaPartsSearch && (
                  <button
                    onClick={() => setPlacaPartsSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {renderPartList()}
            </div>
          )}

          {/* === VEÍCULO MODE === */}
          {mode === 'veiculo' && (
            <>
              {!selectedCatalog ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Pesquisar catálogo / veículo..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="pl-10 pr-9 h-12 bg-card border-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {filteredCatalogs.map((catalog) => (
                      <Card
                        key={catalog.name}
                        onClick={() => { setSelectedCatalog(catalog.name); setSearch(''); }}
                        className="p-4 cursor-pointer hover:border-primary transition-colors flex flex-col items-center text-center gap-2"
                      >
                        <Car className="w-8 h-8 text-primary/60" />
                        <div>
                          <h3 className="font-bold text-sm leading-tight">{catalog.name}</h3>
                          <p className="text-xs text-muted-foreground">{catalog.count} peças</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
              <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedCatalog(null); handleSearchChange(''); setSearch(''); }}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold truncate">{selectedCatalog}</h2>
                      <p className="text-xs text-muted-foreground">{catalogParts.length} peças neste catálogo</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Filtrar peças (código, nome, fornecedor)..."
                      value={searchInput}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 pr-9 h-12 bg-card border-2"
                    />
                    {searchInput && (
                      <button
                        onClick={() => { handleSearchChange(''); setSearch(''); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {renderPartList()}
                </div>
              )}
            </>
          )}

          {/* === FROTA MODE === */}
          {mode === 'frota' && (
            <Suspense fallback={<div className="py-16 text-center text-sm text-muted-foreground">Carregando...</div>}>
              <RadarML embedded />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
};

export default PartsSearch;
