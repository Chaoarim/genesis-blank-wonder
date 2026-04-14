import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/exportExcel';
import { downloadHtmlAsPdf } from '@/lib/htmlToPdf';
import {
  Search, ArrowLeft, LogOut, TrendingUp, TrendingDown, Minus,
  ExternalLink, Truck, Star, Award, DollarSign, Package,
  ShoppingBag, MapPin, Users, Download, Bot, BarChart3, Clock,
  Loader2, ArrowUpDown, ChevronUp, ChevronDown, Zap
} from 'lucide-react';

const ESTADOS = [
  'BRASIL', 'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Paraná',
  'Santa Catarina', 'Rio Grande do Sul', 'Bahia', 'Goiás', 'Pernambuco',
  'Ceará', 'Amazonas', 'Pará', 'Distrito Federal', 'Mato Grosso',
  'Mato Grosso do Sul', 'Espírito Santo'
];

interface ShoppingResult {
  position: number;
  title: string;
  price: number;
  original_price: number | null;
  thumbnail: string;
  link: string;
  source: string;
  rating: number | null;
  reviews: number;
  delivery: string;
  free_shipping: boolean;
  badge: string | null;
  extensions?: string[];
}

interface Metrics {
  total: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  best_rated_seller: string;
  best_rated_reviews: number;
  free_shipping_count: number;
}

interface RegionalData {
  region: string;
  city: string;
  offers: number;
  min_price: number;
  free_shipping: boolean;
  status: string;
}

interface TrendData {
  trend: string;
  values: number[];
  timeline: { date: string; value: number }[];
}

interface HistoricoEntry {
  termo_busca: string;
  menor_preco: number;
  preco_medio: number;
  total_ofertas: number;
  created_at: string;
}

const formatBRL = (v: number) =>
  v > 0 ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

const PartsSearch = () => {
  const navigate = useNavigate();
  const [termo, setTermo] = useState('');
  const [estado, setEstado] = useState('BRASIL');
  const [filterFreeShipping, setFilterFreeShipping] = useState(false);
  const [filterBestRated, setFilterBestRated] = useState(false);

  // Data states
  const [results, setResults] = useState<ShoppingResult[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [regionalData, setRegionalData] = useState<RegionalData[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [historico, setHistorico] = useState<HistoricoEntry | null>(null);

  // Loading states
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loadingRegional, setLoadingRegional] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [searched, setSearched] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState<'price' | 'reviews'>('price');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate('/login');
    });
  }, [navigate]);

  const callProxy = async (body: any) => {
    const { data, error } = await supabase.functions.invoke('ml-proxy', { body });
    if (error) throw error;
    return data;
  };

  const loadHistorico = async (searchTermo: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('consultas_historico')
      .select('*')
      .eq('user_id', user.id)
      .eq('termo_busca', searchTermo.toLowerCase().trim())
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setHistorico(data[0] as unknown as HistoricoEntry);
    } else {
      setHistorico(null);
    }
  };

  const saveHistorico = async (searchTermo: string, m: Metrics) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('consultas_historico').insert({
      user_id: user.id,
      termo_busca: searchTermo.toLowerCase().trim(),
      menor_preco: m.min_price,
      preco_medio: m.avg_price,
      total_ofertas: m.total,
    });
  };

  const handleSearch = async () => {
    if (!termo.trim()) {
      toast.error('Digite um termo de busca');
      return;
    }

    setSearched(true);
    setResults([]);
    setMetrics(null);
    setTrendData(null);
    setRegionalData([]);
    setRelatedProducts([]);

    // Load history first
    await loadHistorico(termo);

    // Main search
    setLoadingMain(true);
    try {
      const data = await callProxy({
        action: 'shopping_search',
        termo: termo.trim(),
        estado: estado !== 'BRASIL' ? estado : undefined,
      });
      setResults(data.results || []);
      setMetrics(data.metrics || null);

      if (data.metrics && data.metrics.total > 0) {
        await saveHistorico(termo, data.metrics);
      }

      if (data.serpapi_error) {
        toast.error('Erro na SerpAPI: ' + data.serpapi_error);
      }
    } catch (e: any) {
      console.error('Search error:', e);
      toast.error('Erro na busca: ' + (e.message || 'desconhecido'));
    } finally {
      setLoadingMain(false);
    }

    // Parallel: trends, regional, related
    setLoadingTrends(true);
    callProxy({ action: 'trends', termo: termo.trim() })
      .then(d => setTrendData(d))
      .catch(e => console.error('Trends error:', e))
      .finally(() => setLoadingTrends(false));

    setLoadingRegional(true);
    callProxy({ action: 'regional', termo: termo.trim() })
      .then(d => setRegionalData(d.regions || []))
      .catch(e => console.error('Regional error:', e))
      .finally(() => setLoadingRegional(false));

    setLoadingRelated(true);
    callProxy({ action: 'related', termo: termo.trim() })
      .then(d => setRelatedProducts(d.related || []))
      .catch(e => console.error('Related error:', e))
      .finally(() => setLoadingRelated(false));
  };

  // Filtered & sorted results
  const displayResults = useMemo(() => {
    let r = [...results];
    if (filterFreeShipping) r = r.filter(i => i.free_shipping);
    if (filterBestRated) r = r.filter(i => (i.reviews || 0) > 0);
    r.sort((a, b) => {
      const valA = sortBy === 'price' ? a.price : (a.reviews || 0);
      const valB = sortBy === 'price' ? b.price : (b.reviews || 0);
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
    return r;
  }, [results, filterFreeShipping, filterBestRated, sortBy, sortDir]);

  // Seller rankings
  const sellerRanking = useMemo(() => {
    const map = new Map<string, { count: number; minPrice: number; totalReviews: number; reviewCount: number }>();
    results.forEach(r => {
      const s = r.source || 'Desconhecido';
      const entry = map.get(s) || { count: 0, minPrice: Infinity, totalReviews: 0, reviewCount: 0 };
      entry.count++;
      if (r.price > 0) entry.minPrice = Math.min(entry.minPrice, r.price);
      entry.totalReviews += r.reviews || 0;
      if (r.reviews) entry.reviewCount++;
      map.set(s, entry);
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({
        name,
        count: d.count,
        minPrice: d.minPrice === Infinity ? 0 : d.minPrice,
        avgReviews: d.reviewCount > 0 ? d.totalReviews / d.reviewCount : 0,
        share: results.length > 0 ? (d.count / results.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [results]);

  // Badges
  const getBadges = useCallback((item: ShoppingResult) => {
    const badges: { label: string; icon: string; color: string }[] = [];
    if (metrics && item.price === metrics.min_price && item.price > 0) {
      badges.push({ label: 'MELHOR PREÇO', icon: '🏆', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' });
    }
    const maxReviews = Math.max(...results.map(r => r.reviews || 0));
    if (item.reviews > 0 && item.reviews === maxReviews) {
      badges.push({ label: 'MAIS AVALIADO', icon: '⭐', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' });
    }
    if (item.free_shipping) {
      badges.push({ label: 'FRETE GRÁTIS', icon: '🚚', color: 'bg-green-500/20 text-green-400 border-green-500/30' });
    }
    if (item.free_shipping && metrics && item.price === metrics.min_price && item.reviews > 0) {
      badges.push({ label: 'CUSTO-BENEFÍCIO', icon: '💰', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' });
    }
    return badges;
  }, [metrics, results]);

  // AI Consultant text
  const aiConsultText = useMemo(() => {
    if (!metrics || metrics.total === 0) return null;
    const lines: string[] = [];
    const variation = metrics.max_price > 0 && metrics.min_price > 0
      ? ((metrics.max_price - metrics.min_price) / metrics.min_price) * 100
      : 0;

    if (variation > 50) {
      lines.push('💡 Grande variação de preço detectada (>' + Math.round(variation) + '%). Oportunidade para negociar com fornecedor.');
    }
    if (metrics.total < 5) {
      lines.push('⚠️ Pouca oferta no mercado (' + metrics.total + ' resultados). Peça pode estar em falta. Considere estocar agora.');
    }
    if (metrics.total >= 10) {
      lines.push('✅ Mercado bem abastecido com ' + metrics.total + ' ofertas. Boa concorrência — negocie o melhor preço.');
    }
    if (metrics.free_shipping_count > 0) {
      lines.push('🚚 ' + metrics.free_shipping_count + ' ofertas com frete grátis disponíveis.');
    }
    return lines;
  }, [metrics]);

  // Empresário insights
  const empresarioInsights = useMemo(() => {
    if (!metrics || metrics.total === 0) return null;
    const bestRegion = regionalData.length > 0
      ? regionalData.sort((a, b) => b.offers - a.offers)[0]
      : null;
    const worstRegion = regionalData.length > 0
      ? regionalData.sort((a, b) => a.offers - b.offers)[0]
      : null;

    return {
      comprador: {
        topSeller: sellerRanking[0]?.name || 'N/A',
        priceRange: `${formatBRL(metrics.min_price)} ~ ${formatBRL(metrics.max_price)}`,
        bestRegion: bestRegion?.region || 'N/A',
        recommendation: metrics.avg_price < 100 ? 'COMPRAR AGORA' : 'AGUARDAR / NEGOCIAR',
      },
      dono: {
        buyPrice: formatBRL(metrics.min_price),
        sellPrice: formatBRL(metrics.avg_price * 1.3),
        margin: metrics.avg_price > 0 ? Math.round(((metrics.avg_price * 1.3 - metrics.min_price) / metrics.min_price) * 100) : 0,
        competitors: sellerRanking.length,
        shouldStock: metrics.total < 10 ? 'SIM — Pouca oferta' : 'AVALIAR — Mercado competitivo',
      },
      vendedor: {
        entryPrice: formatBRL(metrics.min_price * 0.95),
        differential: metrics.free_shipping_count > metrics.total / 2 ? 'Ofereça frete grátis + atendimento rápido' : 'Frete grátis é diferencial — poucos oferecem',
        weakRegion: worstRegion?.region || 'N/A',
        strategy: metrics.total > 15 ? 'Focar em nicho e atendimento' : 'Entrar agressivo — pouca concorrência',
      },
    };
  }, [metrics, regionalData, sellerRanking]);

  const handleExportExcel = () => {
    if (!displayResults.length) return;
    const data = displayResults.map(r => ({
      Posição: r.position,
      Produto: r.title,
      Preço: r.price,
      Vendedor: r.source,
      Avaliações: r.reviews || 0,
      'Frete Grátis': r.free_shipping ? 'Sim' : 'Não',
      Link: r.link,
    }));
    exportToExcel(data, `consulta_${termo.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`);
    toast.success('Excel exportado!');
  };

  const handleExportPDF = () => {
    if (!displayResults.length || !metrics) return;
    const rows = displayResults.map(r =>
      `<tr><td style="padding:6px;border:1px solid #444">${r.title}</td><td style="padding:6px;border:1px solid #444;text-align:right">${formatBRL(r.price)}</td><td style="padding:6px;border:1px solid #444">${r.source}</td><td style="padding:6px;border:1px solid #444;text-align:center">${r.reviews || '—'}</td><td style="padding:6px;border:1px solid #444;text-align:center">${r.free_shipping ? '✅' : '—'}</td></tr>`
    ).join('');

    const html = `
      <div style="font-family:Arial;color:#222;padding:20px">
        <h1 style="font-size:20px;margin-bottom:4px">Consultor de Peças IA — Cotação</h1>
        <p style="color:#666;font-size:12px">Gerado em ${new Date().toLocaleDateString('pt-BR')} | Válido por 24 horas</p>
        <hr style="margin:16px 0"/>
        <h2 style="font-size:16px">Resumo: "${termo}"</h2>
        <p>${metrics.total} ofertas | Menor: ${formatBRL(metrics.min_price)} | Média: ${formatBRL(metrics.avg_price)} | Maior: ${formatBRL(metrics.max_price)}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:12px">
          <thead><tr style="background:#f0f0f0"><th style="padding:6px;border:1px solid #444;text-align:left">Produto</th><th style="padding:6px;border:1px solid #444">Preço</th><th style="padding:6px;border:1px solid #444">Vendedor</th><th style="padding:6px;border:1px solid #444">Avaliações</th><th style="padding:6px;border:1px solid #444">Frete</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#999;font-size:10px;margin-top:24px">Dados via Google Shopping. Preços podem variar. Consulte o vendedor.</p>
      </div>
    `;
    downloadHtmlAsPdf(html, `cotacao_${termo.replace(/\s+/g, '_')}`);
    toast.success('PDF gerado!');
  };

  const LoadingBlock = ({ h = 'h-40' }: { h?: string }) => (
    <Card className={`p-6 ${h} animate-pulse bg-muted/30`}>
      <Skeleton className="h-4 w-1/3 mb-3" />
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </Card>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/vendas')} title="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Consultor de Peças IA
              </h1>
              <p className="text-xs text-muted-foreground">Inteligência de mercado em tempo real</p>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs gap-1">
            🟢 Google Shopping Conectado
          </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 px-4 max-w-5xl space-y-6">

          {/* SEARCH BAR */}
          <Card className="p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Código, nome da peça ou fabricante... Ex: 32208 cofap, filtro mahle"
                value={termo}
                onChange={e => setTermo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-12 h-14 border-2 text-base rounded-xl"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS.map(e => <SelectItem key={e} value={e}>{e === 'BRASIL' ? '🇧🇷 Todo Brasil' : e}</SelectItem>)}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={filterFreeShipping} onCheckedChange={setFilterFreeShipping} />
                <Truck className="w-4 h-4" /> Frete Grátis
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={filterBestRated} onCheckedChange={setFilterBestRated} />
                <Star className="w-4 h-4" /> Melhor Avaliado
              </label>
              <Button onClick={handleSearch} disabled={loadingMain} className="gap-2 ml-auto">
                {loadingMain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                CONSULTAR MERCADO
              </Button>
            </div>
          </Card>

          {/* HISTORICO */}
          {historico && metrics && metrics.total > 0 && (
            <Card className="p-4 border-blue-500/30 bg-blue-500/5">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-muted-foreground">
                  Última consulta: {new Date(historico.created_at).toLocaleDateString('pt-BR')} —
                  Mín era {formatBRL(historico.menor_preco)} | Hoje: {formatBRL(metrics.min_price)}
                  {metrics.min_price < historico.menor_preco
                    ? <span className="text-green-400 ml-1">↓ Baixou {formatBRL(historico.menor_preco - metrics.min_price)}</span>
                    : metrics.min_price > historico.menor_preco
                    ? <span className="text-red-400 ml-1">↑ Subiu {formatBRL(metrics.min_price - historico.menor_preco)}</span>
                    : <span className="text-muted-foreground ml-1">= Mesmo preço</span>
                  }
                </span>
              </div>
            </Card>
          )}

          {!searched && (
            <div className="py-20 text-center text-muted-foreground space-y-2">
              <Bot className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-lg font-medium">Busque uma peça para começar</p>
              <p className="text-sm">Exemplos: 32208 cofap, filtro oleo mahle, pastilha bosch</p>
            </div>
          )}

          {/* BLOCO 1 — RESUMO EXECUTIVO */}
          {searched && loadingMain && <LoadingBlock h="h-24" />}
          {metrics && metrics.total > 0 && (
            <Card className="p-5 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <p className="text-base font-semibold">
                ✅ {metrics.total} ofertas encontradas para "{termo}"
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Preços de {formatBRL(metrics.min_price)} até {formatBRL(metrics.max_price)} | Média {formatBRL(metrics.avg_price)}
                {' '} | 🚚 {metrics.free_shipping_count} com frete grátis
                {metrics.best_rated_seller && ` | ⭐ Melhor avaliado: ${metrics.best_rated_seller}`}
              </p>
            </Card>
          )}
          {metrics && metrics.total === 0 && !loadingMain && (
            <Card className="p-5 bg-destructive/10 border-destructive/20 text-center">
              <p className="font-medium">Nenhuma oferta encontrada para "{termo}"</p>
              <p className="text-sm text-muted-foreground mt-1">Tente outro termo ou região diferente.</p>
            </Card>
          )}

          {/* BLOCO 2 — KPIs */}
          {metrics && metrics.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Ofertas', value: String(metrics.total), icon: Package, color: 'text-primary' },
                { label: 'Menor Preço', value: formatBRL(metrics.min_price), icon: DollarSign, color: 'text-green-400' },
                { label: 'Preço Médio', value: formatBRL(metrics.avg_price), icon: BarChart3, color: 'text-blue-400' },
                { label: 'Frete Grátis', value: String(metrics.free_shipping_count), icon: Truck, color: 'text-emerald-400' },
                { label: 'Mais Avaliado', value: metrics.best_rated_seller || '—', icon: Star, color: 'text-yellow-400' },
              ].map((kpi, i) => (
                <Card key={i} className="p-4 text-center space-y-1">
                  <kpi.icon className={`w-5 h-5 mx-auto ${kpi.color}`} />
                  <p className="text-lg font-bold truncate">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </Card>
              ))}
            </div>
          )}

          {/* BLOCO 3 — CONSULTOR IA */}
          {aiConsultText && aiConsultText.length > 0 && (
            <Card className="p-5 border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-sm">Consultor IA</h3>
              </div>
              <div className="space-y-2">
                {aiConsultText.map((line, i) => (
                  <p key={i} className="text-sm">{line}</p>
                ))}
              </div>
            </Card>
          )}

          {/* BLOCO 4 — COMPARADOR */}
          {displayResults.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Comparador ao Vivo ({displayResults.length})
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => { setSortBy('price'); setSortDir(sortBy === 'price' && sortDir === 'asc' ? 'desc' : 'asc'); }}
                    className="text-xs gap-1"
                  >
                    <DollarSign className="w-3 h-3" /> Preço
                    {sortBy === 'price' && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => { setSortBy('reviews'); setSortDir(sortBy === 'reviews' && sortDir === 'desc' ? 'asc' : 'desc'); }}
                    className="text-xs gap-1"
                  >
                    <Star className="w-3 h-3" /> Avaliações
                    {sortBy === 'reviews' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                  </Button>
                </div>
              </div>
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {displayResults.map((item, idx) => (
                  <div key={idx} className="p-4 hover:bg-accent/30 transition-colors">
                    <div className="flex items-start gap-3">
                      {item.thumbnail && (
                        <img src={item.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 bg-muted" loading="lazy" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-lg font-bold text-primary">{formatBRL(item.price)}</span>
                          {item.original_price && item.original_price > item.price && (
                            <span className="text-xs line-through text-muted-foreground">{formatBRL(item.original_price)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                          <span>{item.source}</span>
                          {item.reviews > 0 && <span>⭐ {item.rating || '?'} ({item.reviews})</span>}
                          {item.delivery && <span>{item.delivery}</span>}
                        </div>
                        {getBadges(item).length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {getBadges(item).map((b, bi) => (
                              <Badge key={bi} variant="outline" className={`text-[10px] ${b.color}`}>
                                {b.icon} {b.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm" asChild className="shrink-0">
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="gap-1">
                          Ver <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* BLOCO 5 — TENDÊNCIA */}
          {searched && (loadingTrends ? <LoadingBlock /> : trendData && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm">📈 Índice de Demanda</h3>
                <Badge variant="outline" className={
                  trendData.trend === 'ALTA' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  trendData.trend === 'BAIXA' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                }>
                  {trendData.trend === 'ALTA' && <TrendingUp className="w-3 h-3 mr-1" />}
                  {trendData.trend === 'BAIXA' && <TrendingDown className="w-3 h-3 mr-1" />}
                  {trendData.trend === 'ESTÁVEL' && <Minus className="w-3 h-3 mr-1" />}
                  {trendData.trend}
                </Badge>
              </div>
              {trendData.values.length > 0 && (
                <div className="flex items-end gap-0.5 h-16">
                  {trendData.values.slice(-30).map((v, i) => {
                    const max = Math.max(...trendData.values.slice(-30), 1);
                    return (
                      <div key={i} className="flex-1 bg-primary/40 rounded-t" style={{ height: `${(v / max) * 100}%`, minHeight: '2px' }} />
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Tendência de busca nos últimos 30 dias no Brasil
              </p>
            </Card>
          ))}

          {/* BLOCO 6 — REGIONAL */}
          {searched && (loadingRegional ? <LoadingBlock /> : regionalData.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm">Disponibilidade Regional</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left py-2">Região</th>
                      <th className="text-center py-2">Ofertas</th>
                      <th className="text-right py-2">Menor Preço</th>
                      <th className="text-center py-2">Frete</th>
                      <th className="text-center py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionalData.map((r, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 font-medium">{r.region}</td>
                        <td className="text-center py-2">{r.offers}</td>
                        <td className="text-right py-2">{formatBRL(r.min_price)}</td>
                        <td className="text-center py-2">{r.free_shipping ? '🚚' : '—'}</td>
                        <td className="text-center py-2">
                          {r.status === 'bem_abastecido' && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">🟢 Bem abastecido</Badge>}
                          {r.status === 'limitado' && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">🟡 Limitado</Badge>}
                          {r.status === 'escasso' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">🔴 Escasso</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          {/* BLOCO 7 — RANKING VENDEDORES */}
          {sellerRanking.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm">Ranking de Vendedores</h3>
              </div>
              <div className="space-y-3">
                {sellerRanking.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count} produtos | Mín: {formatBRL(s.minPrice)}</p>
                    </div>
                    <div className="w-24">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${s.share}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right mt-0.5">{Math.round(s.share)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* BLOCO 8 — RELACIONADOS */}
          {searched && (loadingRelated ? <LoadingBlock /> : relatedProducts.length > 0 && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Peças Relacionadas
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {relatedProducts.map((r, i) => (
                  <a key={i} href={r.link} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 w-36 rounded-lg border border-border p-3 hover:border-primary/50 transition-colors">
                    {r.thumbnail && <img src={r.thumbnail} alt="" className="w-full h-20 object-cover rounded mb-2 bg-muted" loading="lazy" />}
                    <p className="text-xs line-clamp-2 font-medium">{r.title}</p>
                    <p className="text-xs text-primary font-bold mt-1">{formatBRL(r.price)}</p>
                  </a>
                ))}
              </div>
            </Card>
          ))}

          {/* BLOCO 9 — PAINEL DO EMPRESÁRIO */}
          {empresarioInsights && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm">Painel do Empresário</h3>
              </div>
              <Tabs defaultValue="comprador">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="comprador" className="text-xs">Comprador</TabsTrigger>
                  <TabsTrigger value="dono" className="text-xs">Dono de Loja</TabsTrigger>
                  <TabsTrigger value="vendedor" className="text-xs">Vendedor</TabsTrigger>
                </TabsList>
                <TabsContent value="comprador" className="mt-4 space-y-2 text-sm">
                  <p>✅ <b>Fornecedor com mais ofertas:</b> {empresarioInsights.comprador.topSeller}</p>
                  <p>✅ <b>Faixa de preço:</b> {empresarioInsights.comprador.priceRange}</p>
                  <p>✅ <b>Melhor região:</b> {empresarioInsights.comprador.bestRegion}</p>
                  <Badge className={empresarioInsights.comprador.recommendation === 'COMPRAR AGORA'
                    ? 'bg-green-500/20 text-green-400 border-green-500/30 mt-3'
                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 mt-3'
                  }>
                    {empresarioInsights.comprador.recommendation}
                  </Badge>
                </TabsContent>
                <TabsContent value="dono" className="mt-4 space-y-2 text-sm">
                  <p>✅ <b>Preço mín de compra:</b> {empresarioInsights.dono.buyPrice}</p>
                  <p>✅ <b>Preço médio de revenda:</b> {empresarioInsights.dono.sellPrice}</p>
                  <p>✅ <b>Margem estimada:</b> {empresarioInsights.dono.margin}%</p>
                  <p>✅ <b>Concorrentes online:</b> {empresarioInsights.dono.competitors}</p>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mt-3">
                    {empresarioInsights.dono.shouldStock}
                  </Badge>
                </TabsContent>
                <TabsContent value="vendedor" className="mt-4 space-y-2 text-sm">
                  <p>✅ <b>Preço competitivo:</b> {empresarioInsights.vendedor.entryPrice}</p>
                  <p>✅ <b>Diferencial:</b> {empresarioInsights.vendedor.differential}</p>
                  <p>✅ <b>Região com menos concorrência:</b> {empresarioInsights.vendedor.weakRegion}</p>
                  <p>✅ <b>Estratégia:</b> {empresarioInsights.vendedor.strategy}</p>
                </TabsContent>
              </Tabs>
            </Card>
          )}

          {/* BLOCO 10 — EXPORTAR */}
          {displayResults.length > 0 && (
            <Card className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-sm">Exportar Cotação</h3>
                <p className="text-xs text-muted-foreground">Baixe o relatório completo com todas as ofertas</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                  <Download className="w-4 h-4" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                  <Download className="w-4 h-4" /> Excel
                </Button>
              </div>
            </Card>
          )}

          {/* DISCLAIMER */}
          {searched && (
            <p className="text-[10px] text-muted-foreground text-center pb-4">
              Dados via Google Shopping. Preços podem variar. Consulte o vendedor antes de comprar.
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default PartsSearch;
