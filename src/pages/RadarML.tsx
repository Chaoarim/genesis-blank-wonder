import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Search, Star, ArrowLeft, Radio, Wifi, Car, Package,
  FileDown, RefreshCw, Loader2, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  radarSearchComplete, MONTADORAS, CATEGORIAS_PECA, TODOS_ESTADOS,
  getRadarFavoritos, addRadarFavorito, removeRadarFavorito,
  type RadarCompleteResult,
} from '@/services/radarMLService';
import { RadarKPICards } from '@/components/radar/RadarKPICards';
import { RadarTop30Table } from '@/components/radar/RadarTop30Table';
import { RadarSellersBlock } from '@/components/radar/RadarSellersBlock';
import { RadarRegionalBlock } from '@/components/radar/RadarRegionalBlock';
import { RadarPriceBlock } from '@/components/radar/RadarPriceBlock';
import { RadarInsightsBlock } from '@/components/radar/RadarInsightsBlock';
import { RadarEmpresarioBlock } from '@/components/radar/RadarEmpresarioBlock';
import { RadarExportButton } from '@/components/radar/RadarExportButton';
import { supabase } from '@/integrations/supabase/client';

export default function RadarML({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState<'codigo' | 'veiculo'>('codigo');
  const [searchTerm, setSearchTerm] = useState('');
  const [montadora, setMontadora] = useState('');
  const [modelo, setModelo] = useState('');
  const [categoriaPeca, setCategoriaPeca] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('BRASIL');
  const [freteGratis, setFreteGratis] = useState(false);
  const [reputacaoVerde, setReputacaoVerde] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<RadarCompleteResult | null>(null);
  const [favoritos, setFavoritos] = useState<any[]>([]);
  const [showFavoritos, setShowFavoritos] = useState(false);

  // Auth check
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
  }, []);

  // Load favorites
  useEffect(() => {
    if (isLoggedIn) getRadarFavoritos().then(setFavoritos);
  }, [isLoggedIn]);

  const handleSearch = useCallback(async () => {
    let query = '';
    if (searchMode === 'codigo') {
      query = searchTerm.trim();
    } else {
      const parts = [montadora, modelo, categoriaPeca].filter(Boolean);
      query = parts.join(' ');
    }
    if (!query) { toast.error('Digite algo para buscar'); return; }

    setLoading(true);
    setResult(null);
    try {
      const data = await radarSearchComplete(query, estadoFiltro, setLoadingStep);
      setResult(data);
      if (data.items.length === 0) {
        toast.info('Nenhum resultado encontrado. Tente variações do termo.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao buscar no ML');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [searchMode, searchTerm, montadora, modelo, categoriaPeca, estadoFiltro]);

  const handleAddFavorito = async () => {
    if (!result) return;
    await addRadarFavorito(result.searchTerm, searchMode, result.searchTerm);
    const favs = await getRadarFavoritos();
    setFavoritos(favs);
    toast.success('Busca salva nos favoritos!');
  };

  const handleRemoveFavorito = async (id: string) => {
    await removeRadarFavorito(id);
    setFavoritos(f => f.filter((x: any) => x.id !== id));
  };

  const handleRefavSearch = (termo: string) => {
    setSearchMode('codigo');
    setSearchTerm(termo);
    setTimeout(handleSearch, 100);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] bg-[#111111]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/vendas')} className="text-white/70 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Radio className="w-5 h-5 text-blue-500" />
                Radar de Mercado ML
              </h1>
              <p className="text-sm text-[#9ca3af]">Inteligência real do Mercado Livre para o setor automotivo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
              <Wifi className="w-3 h-3 mr-1" /> ML Conectado
            </Badge>
            <Sheet open={showFavoritos} onOpenChange={setShowFavoritos}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="border-[#2a2a2a] text-white/70 hover:text-white">
                  <Star className="w-4 h-4 mr-1" /> Favoritos
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-[#111111] border-[#2a2a2a] text-white">
                <SheetHeader>
                  <SheetTitle className="text-white">Minhas Buscas Salvas</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                  {favoritos.length === 0 && <p className="text-[#9ca3af] text-sm">Nenhuma busca salva ainda.</p>}
                  {favoritos.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                      <div>
                        <p className="text-sm font-medium">{f.label_personalizado || f.termo_busca}</p>
                        <p className="text-xs text-[#9ca3af]">{new Date(f.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { handleRefavSearch(f.termo_busca); setShowFavoritos(false); }}>
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleRemoveFavorito(f.id)}>✕</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-6">
          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={searchMode === 'codigo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('codigo')}
              className={searchMode === 'codigo' ? 'bg-blue-600 hover:bg-blue-700' : 'border-[#2a2a2a] text-white/70'}
            >
              <Package className="w-4 h-4 mr-1" /> Código / Peça
            </Button>
            <Button
              variant={searchMode === 'veiculo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchMode('veiculo')}
              className={searchMode === 'veiculo' ? 'bg-blue-600 hover:bg-blue-700' : 'border-[#2a2a2a] text-white/70'}
            >
              <Car className="w-4 h-4 mr-1" /> Montadora / Veículo
            </Button>
          </div>

          {/* Search inputs */}
          {searchMode === 'codigo' ? (
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Digite o código da peça, nome ou fabricante... Ex: 10129 Schadek, OC575 Mahle, pastilha freio Bosch"
              className="bg-[#0f0f0f] border-[#2a2a2a] text-white text-lg h-12 placeholder:text-[#9ca3af]/60"
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={montadora} onValueChange={v => { setMontadora(v); setModelo(''); }}>
                <SelectTrigger className="bg-[#0f0f0f] border-[#2a2a2a] text-white h-12">
                  <SelectValue placeholder="Montadora" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                  {Object.keys(MONTADORAS).map(m => (
                    <SelectItem key={m} value={m} className="text-white">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={modelo} onValueChange={setModelo}>
                <SelectTrigger className="bg-[#0f0f0f] border-[#2a2a2a] text-white h-12">
                  <SelectValue placeholder="Modelo" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                  {(MONTADORAS[montadora] || []).map(m => (
                    <SelectItem key={m} value={m} className="text-white">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoriaPeca} onValueChange={setCategoriaPeca}>
                <SelectTrigger className="bg-[#0f0f0f] border-[#2a2a2a] text-white h-12">
                  <SelectValue placeholder="Categoria de Peça" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a]">
                  {CATEGORIAS_PECA.map(c => (
                    <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="w-48 bg-[#0f0f0f] border-[#2a2a2a] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] max-h-60">
                <SelectItem value="BRASIL" className="text-white">🇧🇷 Todo Brasil</SelectItem>
                {TODOS_ESTADOS.map(e => (
                  <SelectItem key={e.code} value={e.code} className="text-white">{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
              <Switch checked={freteGratis} onCheckedChange={setFreteGratis} />
              Frete grátis
            </div>
            <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
              <Switch checked={reputacaoVerde} onCheckedChange={setReputacaoVerde} />
              Reputação verde
            </div>

            <Button
              onClick={handleSearch}
              disabled={loading}
              className="ml-auto bg-blue-600 hover:bg-blue-700 text-white h-10 px-6"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              BUSCAR NO MERCADO LIVRE
            </Button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-[#9ca3af] animate-pulse">{loadingStep || 'Processando...'}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="max-w-7xl mx-auto px-4 pb-12 space-y-6">
          {/* Banner */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a]">
            <div>
              <p className="text-lg font-semibold">
                Encontrados <span className="text-blue-400">{result.kpis.totalAnuncios}</span> anúncios para "{result.searchTerm}" — <span className="text-green-400">{result.kpis.totalVendido.toLocaleString('pt-BR')}</span> unidades vendidas
              </p>
              <p className="text-xs text-[#9ca3af] mt-1">
                Dados consultados em: {new Date(result.searchDate).toLocaleString('pt-BR')}
                {result.fromCache && ' (cache)'}
                {' | '}ⓘ Dados públicos do Mercado Livre. Quantidade vendida é aproximada.
              </p>
            </div>
            <div className="flex gap-2">
              {result.kpis.emTendencia && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  <TrendingUp className="w-3 h-3 mr-1" /> Em Tendência
                </Badge>
              )}
              <Button size="sm" variant="outline" className="border-[#2a2a2a] text-white/70" onClick={handleAddFavorito}>
                <Star className="w-3 h-3 mr-1" /> Salvar
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <RadarKPICards kpis={result.kpis} />

          {/* Tabs for blocks */}
          <Tabs defaultValue="top30" className="space-y-4">
            <TabsList className="bg-[#1a1a1a] border border-[#2a2a2a] flex-wrap h-auto p-1">
              <TabsTrigger value="top30" className="data-[state=active]:bg-blue-600">🏆 Top 30</TabsTrigger>
              <TabsTrigger value="vendedores" className="data-[state=active]:bg-blue-600">👑 Vendedores</TabsTrigger>
              <TabsTrigger value="regional" className="data-[state=active]:bg-blue-600">📍 Regional</TabsTrigger>
              <TabsTrigger value="precos" className="data-[state=active]:bg-blue-600">💰 Preços</TabsTrigger>
              <TabsTrigger value="insights" className="data-[state=active]:bg-blue-600">🧠 Insights</TabsTrigger>
              <TabsTrigger value="empresario" className="data-[state=active]:bg-blue-600">📋 Empresário</TabsTrigger>
            </TabsList>

            <TabsContent value="top30">
              <RadarTop30Table items={result.items} precoMedio={result.kpis.precoMedio} freteGratis={freteGratis} reputacaoVerde={reputacaoVerde} />
            </TabsContent>
            <TabsContent value="vendedores">
              <RadarSellersBlock sellers={result.sellers} />
            </TabsContent>
            <TabsContent value="regional">
              <RadarRegionalBlock regional={result.regional} />
            </TabsContent>
            <TabsContent value="precos">
              <RadarPriceBlock items={result.items} priceRanges={result.priceRanges} precoMedio={result.kpis.precoMedio} />
            </TabsContent>
            <TabsContent value="insights">
              <RadarInsightsBlock insights={result.insights} />
            </TabsContent>
            <TabsContent value="empresario">
              <RadarEmpresarioBlock kpis={result.kpis} sellers={result.sellers} regional={result.regional} items={result.items} />
            </TabsContent>
          </Tabs>

          {/* Export */}
          <RadarExportButton result={result} />
        </div>
      )}
    </div>
  );
}
