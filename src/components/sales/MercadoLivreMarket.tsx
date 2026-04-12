import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ExternalLink, Loader2, ShoppingCart, TrendingUp, MapPin, Star, RefreshCw } from 'lucide-react';
import {
  searchML, searchMLRegional, summarizeMLResults, getIndicadorCompra, getReputationColor,
  ML_STATES, type MLSearchResult, type MLMarketSummary,
} from '@/lib/mercadoLivreApi';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MercadoLivreMarketProps {
  adminUserId?: string | null;
}

export function MercadoLivreMarket({ adminUserId }: MercadoLivreMarketProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<MLMarketSummary | null>(null);
  const [selectedState, setSelectedState] = useState('BR-SP');
  const [regionalResults, setRegionalResults] = useState<MLSearchResult[]>([]);
  const [loadingRegional, setLoadingRegional] = useState(false);
  const [activeView, setActiveView] = useState<'search' | 'regional'>('search');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSummary(null);
    try {
      const data = await searchML(query, { limit: 50 });
      const s = summarizeMLResults(data.results || []);
      setSummary(s);

      // Cache top result
      if (s.mlItemId && adminUserId) {
        await supabase.from('ml_market_data').upsert({
          user_id: adminUserId,
          peca_codigo: query.trim(),
          peca_produto: query.trim(),
          ml_item_id: s.mlItemId,
          titulo_ml: s.resultados[0]?.title || '',
          preco_atual: s.precoMedio,
          menor_preco: s.menorPreco,
          total_vendido: s.totalVendido,
          fornecedor_lider: s.fornecedorLider,
          regiao: '',
          reputacao_vendedor: s.reputacaoLider,
          link_anuncio: s.linkMaisVendido,
          thumbnail_url: s.thumbnailMaisVendido,
          data_consulta: new Date().toISOString(),
        } as any, { onConflict: 'id' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar no Mercado Livre');
    } finally {
      setLoading(false);
    }
  }, [query, adminUserId]);

  const handleRegionalSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoadingRegional(true);
    setRegionalResults([]);
    try {
      const data = await searchMLRegional(query, selectedState, { limit: 50 });
      setRegionalResults(data.results || []);
    } catch (err: any) {
      toast.error(err.message || 'Erro na busca regional');
    } finally {
      setLoadingRegional(false);
    }
  }, [query, selectedState]);

  const indicador = summary
    ? getIndicadorCompra(summary.disponibilidadeRegional, summary.totalVendido)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Mercado Livre - Dados de Mercado</h2>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar peça no Mercado Livre (ex: pastilha freio gol)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Buscar
        </Button>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeView === 'search' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('search')}
        >
          <TrendingUp className="w-4 h-4 mr-1" /> Mais Vendidos
        </Button>
        <Button
          variant={activeView === 'regional' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('regional')}
        >
          <MapPin className="w-4 h-4 mr-1" /> Regional
        </Button>
      </div>

      {/* Summary cards */}
      {summary && activeView === 'search' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Preço Médio</p>
              <p className="text-lg font-bold text-primary">
                R$ {summary.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Menor Preço</p>
              <p className="text-lg font-bold text-green-600">
                R$ {summary.menorPreco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Total Vendido</p>
              <p className="text-lg font-bold">{summary.totalVendido.toLocaleString('pt-BR')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">Indicador</p>
              {indicador && (
                <p className={`text-sm font-bold ${indicador.color}`}>
                  {indicador.emoji} {indicador.label}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fornecedor líder */}
      {summary && summary.fornecedorLider && activeView === 'search' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3 px-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Fornecedor Líder de Vendas</p>
              <p className="text-sm font-bold">{summary.fornecedorLider}</p>
              <p className="text-xs text-muted-foreground">
                {summary.fornecedorLiderVendas.toLocaleString('pt-BR')} vendidos
              </p>
            </div>
            {summary.linkMaisVendido && (
              <a href={summary.linkMaisVendido} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1">
                  <ExternalLink className="w-3 h-3" /> Ver no ML
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results list */}
      {summary && activeView === 'search' && summary.resultados.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Top {Math.min(summary.resultados.length, 10)} Anúncios Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {summary.resultados.slice(0, 10).map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                  <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}</span>
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-12 h-12 rounded object-cover bg-muted shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-primary">
                        R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.sold_quantity || 0} vendidos
                      </Badge>
                      {item.shipping?.free_shipping && (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                          Frete Grátis
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vendedor: {item.seller?.nickname || 'N/A'}
                    </p>
                  </div>
                  <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regional view */}
      {activeView === 'regional' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ML_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleRegionalSearch} disabled={loadingRegional || !query.trim()} size="sm">
              {loadingRegional ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Buscar na Região
            </Button>
          </div>

          {regionalResults.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Resultados em {ML_STATES.find((s) => s.code === selectedState)?.name}
                  <Badge variant="secondary">{regionalResults.length} anúncios</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {regionalResults.slice(0, 10).map((item, idx) => {
                    const sellerRanking = regionalResults
                      .filter((r) => r.seller?.nickname === item.seller?.nickname)
                      .reduce((s, r) => s + (r.sold_quantity || 0), 0);

                    return (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                        <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}</span>
                        {item.thumbnail && (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-10 h-10 rounded object-cover bg-muted shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-primary">
                              R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {item.sold_quantity || 0} vendidos
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {item.seller?.nickname} · {sellerRanking} vendas total
                          </p>
                        </div>
                        <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {!loadingRegional && regionalResults.length === 0 && query.trim() && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Busque uma peça para ver resultados regionais
            </p>
          )}
        </div>
      )}

      {!summary && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Busque uma peça para ver dados de mercado do Mercado Livre</p>
          <p className="text-xs mt-1">Preços, vendas, fornecedores líderes e disponibilidade regional</p>
        </div>
      )}
    </div>
  );
}
