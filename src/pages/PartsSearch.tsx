import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronDown, Sparkles, ArrowLeft, Car, Link as LinkIcon, Loader2 } from 'lucide-react';
import { usePartsDatabase, Part } from '@/hooks/usePartsDatabase';
import { smartFilterParts } from '@/lib/partsSearchEngine';
import { PartThumbnail } from '@/components/PartThumbnail';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

const PartsSearch = () => {
  const navigate = useNavigate();
  const { parts, isLoading: partsLoading } = usePartsDatabase();
  const [activeTab, setActiveTab] = useState('placa');
  
  // Placa Search State
  const [placa, setPlaca] = useState('');
  const [searchingPlaca, setSearchingPlaca] = useState(false);
  const [vehicleData, setVehicleData] = useState<any>(null);
  const [placaPartsSearch, setPlacaPartsSearch] = useState('');
  
  // Catalogs State
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  
  // General Search State
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
    });
  }, [navigate]);

  // Catalog stats
  const catalogStats = useMemo(() => {
    const map = new Map<string, { count: number; suppliers: Set<string>; samples: string[] }>();
    for (const p of parts) {
      const cat = p.catalogo || 'Sem catálogo';
      const entry = map.get(cat);
      if (entry) {
        entry.count++;
        if (p.fornecedor) entry.suppliers.add(p.fornecedor);
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

  const catalogParts = useMemo(() => {
    if (!selectedCatalog) return [];
    return parts.filter(p => (p.catalogo || 'Sem catálogo') === selectedCatalog);
  }, [parts, selectedCatalog]);

  const filtered = useMemo(() => {
    if (activeTab === 'veiculo' && selectedCatalog) {
      if (search.length < 2) return catalogParts;
      return smartFilterParts(catalogParts, search);
    }
    if (activeTab === 'placa' && vehicleData) {
      const modelFirstWord = (vehicleData.MODELO || '').split(' ')[0];
      const modelQuery = modelFirstWord ? modelFirstWord : (vehicleData.MARCA || '');
      const query = placaPartsSearch.trim() ? `${modelQuery} ${placaPartsSearch}` : modelQuery;
      return smartFilterParts(parts, query);
    }
    if (search.length < 2) return [];
    
    if (activeTab === 'codigo') {
      return smartFilterParts(parts, search);
    }
    
    return smartFilterParts(parts, search);
  }, [search, catalogParts, selectedCatalog, activeTab, vehicleData, parts, placaPartsSearch]);

  const visibleResults = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handlePlacaSearch = async () => {
    if (placa.length < 7) {
      toast.error('Informe uma placa válida');
      return;
    }
    setSearchingPlaca(true);
    setVehicleData(null);
    try {
      const token = 'c66feee885a811865464d834187e9fa9';
      const cleanPlaca = placa.replace(/[^a-zA-Z0-9]/g, '');
      const response = await fetch(`https://wdapi2.com.br/consulta/${cleanPlaca}/${token}`);
      if (!response.ok) throw new Error('Falha na consulta');
      const data = await response.json();
      console.log('API Placa response:', JSON.stringify(data, null, 2));
      
      if (data && data.MARCA) {
        setVehicleData(data);
        toast.success(`Veículo encontrado: ${data.MARCA} ${data.MODELO}`);
      } else {
        toast.error('Veículo não encontrado ou placa inválida');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao consultar placa. Verifique a disponibilidade da API.');
    } finally {
      setSearchingPlaca(false);
    }
  };

  const renderPartList = () => (
    <div className="container mx-auto max-w-4xl py-4">
      <div className="mb-4">
        <span className="text-xs text-muted-foreground font-medium">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} encontrados
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 mt-0.5"
                  title="Consulta Web (Google Imagens)"
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
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold leading-tight flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Consulta de Peças
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-muted/20">
        <div className="container mx-auto py-6 px-4 max-w-4xl">
          <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v);
            setSearch('');
            setVisibleCount(PAGE_SIZE);
            if (v !== 'veiculo') setSelectedCatalog(null);
          }}>
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="placa" className="text-xs sm:text-sm">PLACA</TabsTrigger>
              <TabsTrigger value="veiculo" className="text-xs sm:text-sm">VEÍCULO</TabsTrigger>
              <TabsTrigger value="codigo" className="text-xs sm:text-sm">CÓDIGO</TabsTrigger>
              <TabsTrigger value="geral" className="text-xs sm:text-sm">GERAL</TabsTrigger>
            </TabsList>

            {/* TAB: PLACA */}
            <TabsContent value="placa">
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
                  onClick={handlePlacaSearch} 
                  disabled={placa.length < 7 || searchingPlaca}
                  className="w-64 h-12 text-md font-bold transition-all shadow-md hover:shadow-lg"
                >
                  {searchingPlaca ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
                  {searchingPlaca ? 'Consultando Detran...' : 'Buscar Peças'}
                </Button>
              </Card>

              {vehicleData && (
                <div className="mt-8">
                  <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg flex items-center justify-between mb-4 border border-primary/20">
                    <div>
                      <span className="text-xs font-bold uppercase opacity-80">Veículo Identificado:</span>
                      <h3 className="text-lg font-bold">
                        {vehicleData.MARCA} {vehicleData.MODELO}
                      </h3>
                      <p className="text-xs mt-0.5 opacity-80 flex flex-wrap gap-x-3">
                        {(vehicleData.ano || vehicleData.anoModelo) && <span>Ano: {vehicleData.ano || vehicleData.anoModelo}</span>}
                        {(vehicleData.cilindrada || vehicleData.cilindradas || vehicleData.potencia || vehicleData.motor) && (
                          <span>Motor: {vehicleData.cilindrada || vehicleData.cilindradas || vehicleData.potencia || vehicleData.motor}</span>
                        )}
                        {(vehicleData.combustivel || vehicleData.COMBUSTIVEL) && <span>Combustível: {vehicleData.combustivel || vehicleData.COMBUSTIVEL}</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
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
            </TabsContent>

            {/* TAB: VEÍCULO */}
            <TabsContent value="veiculo">
              {!selectedCatalog ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
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
                    <Button variant="outline" size="sm" onClick={() => setSelectedCatalog(null)}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                    <h2 className="text-xl font-bold">{selectedCatalog}</h2>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Buscar neste catálogo..."
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 h-12"
                    />
                  </div>
                  {renderPartList()}
                </div>
              )}
            </TabsContent>

            {/* TAB: CÓDIGO DA PEÇA */}
            <TabsContent value="codigo">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Digite o código da peça ou código similar..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-12 border-2 text-lg"
                  />
                </div>
                {search.length >= 2 && renderPartList()}
              </div>
            </TabsContent>

            {/* TAB: BUSCA GERAL */}
            <TabsContent value="geral">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Busca avançada: nome, marca, descrição, aplicação..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-12 border-2 text-lg"
                  />
                </div>
                {search.length >= 2 && renderPartList()}
              </div>
            </TabsContent>




          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default PartsSearch;
