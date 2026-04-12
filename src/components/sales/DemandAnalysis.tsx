import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Loader2, TrendingUp, Package, Search, ShoppingCart, Car, Target, Zap, ExternalLink, MapPin, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import {
  buscarPecaML,
  calcularMetricasML,
  getIndicadorCompra,
  ML_STATES,
  type MLMetricas,
} from '@/services/mercadolivreService';
import {
  getFleetModelKeywords, itemMatchesFleetModel, loadFleetAnalysisItems, normalizeFleetText,
  type FleetAnalysisItem,
} from './fleet/fleetAnalysisData';
import { toast } from 'sonner';

interface DemandAnalysisProps {
  adminUserId: string | null;
}

interface FleetRanking {
  id: string; year: number; position: number; model: string; quantity: number; vehicle_type: string;
}

interface CrossedDemand {
  modelo: string;
  frotaAtual: number;
  pecasCompativeis: FleetAnalysisItem[];
  totalPecas: number;
  classificacao: 'alta' | 'media' | 'baixa';
}

interface MLEnrichedItem {
  item: FleetAnalysisItem;
  matchedModels: string[];
  totalFleet: number;
  mlPrecoMedio: number;
  mlMenorPreco: number;
  mlTotalVendido: number;
  mlFornecedorLider: string;
  indicador: { label: string; color: string; emoji: string };
  mlLink: string;
  investimento5anos: 'alto' | 'medio' | 'baixo';
}

const COLORS_CHART = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function DemandAnalysis({ adminUserId }: DemandAnalysisProps) {
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<FleetRanking[]>([]);
  const [parts, setParts] = useState<FleetAnalysisItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedType, setSelectedType] = useState('automovel');
  const [activeTab, setActiveTab] = useState('cruzamento');
  const [mlCache, setMlCache] = useState<Map<string, MLMarketSummary>>(new Map());
  const [enriching, setEnriching] = useState(false);
  const [enrichedItems, setEnrichedItems] = useState<MLEnrichedItem[]>([]);
  const [selectedState, setSelectedState] = useState('BR-SP');
  const [fornecedorFilter, setFornecedorFilter] = useState('');
  const [pecaFilter, setPecaFilter] = useState('');

  // Load fleet rankings
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const PAGE_SIZE = 1000;
      let allRows: FleetRanking[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const from = page * PAGE_SIZE;
        const { data } = await supabase
          .from('fleet_rankings')
          .select('*')
          .order('year', { ascending: false })
          .order('position', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (!data || data.length === 0) { hasMore = false; }
        else {
          allRows = allRows.concat(data as FleetRanking[]);
          if (data.length < PAGE_SIZE) hasMore = false;
          else page++;
        }
      }
      setRankings(allRows);

      const uniqueYears = [...new Set(allRows.map(r => r.year))].sort((a, b) => b - a);
      if (uniqueYears.length > 0) setSelectedYear(String(uniqueYears[0]));

      // Load supplier/inventory parts
      const loaded = await loadFleetAnalysisItems(adminUserId);
      setParts(loaded.items);

      setLoading(false);
    };
    fetchAll();
  }, [adminUserId]);

  const years = useMemo(() => [...new Set(rankings.map(r => r.year))].sort((a, b) => b - a), [rankings]);

  const filteredRankings = useMemo(() => {
    if (!selectedYear) return [];
    return rankings.filter(r => r.year === Number(selectedYear) && r.vehicle_type === selectedType);
  }, [rankings, selectedYear, selectedType]);

  // Cross fleet models with supplier parts
  const crossedData = useMemo<CrossedDemand[]>(() => {
    if (!filteredRankings.length || !parts.length) return [];

    return filteredRankings.slice(0, 50).map(rank => {
      const { normalized, keywords } = getFleetModelKeywords(rank.model);
      const matched = parts.filter(p => itemMatchesFleetModel(p.searchText, normalized, keywords));
      const total = matched.length;
      const classificacao = total > 20 ? 'alta' : total > 5 ? 'media' : 'baixa';
      return {
        modelo: rank.model,
        frotaAtual: rank.quantity,
        pecasCompativeis: matched,
        totalPecas: total,
        classificacao,
      };
    });
  }, [filteredRankings, parts]);

  // Filter by search, fornecedor, and peça
  const filteredCrossed = useMemo(() => {
    let data = crossedData;
    const q = normalizeFleetText(searchQuery);
    const fq = normalizeFleetText(fornecedorFilter);
    const pq = normalizeFleetText(pecaFilter);

    if (q) {
      data = data.filter(d =>
        normalizeFleetText(d.modelo).includes(q) ||
        d.pecasCompativeis.some(p => p.searchText.includes(q))
      );
    }
    if (fq) {
      data = data.map(d => {
        const filtered = d.pecasCompativeis.filter(p => normalizeFleetText(p.fornecedor).includes(fq));
        if (filtered.length === 0) return null;
        return { ...d, pecasCompativeis: filtered, totalPecas: filtered.length, classificacao: filtered.length > 20 ? 'alta' as const : filtered.length > 5 ? 'media' as const : 'baixa' as const };
      }).filter(Boolean) as CrossedDemand[];
    }
    if (pq) {
      data = data.map(d => {
        const filtered = d.pecasCompativeis.filter(p =>
          normalizeFleetText(p.produto).includes(pq) || normalizeFleetText(p.codigo).includes(pq)
        );
        if (filtered.length === 0) return null;
        return { ...d, pecasCompativeis: filtered, totalPecas: filtered.length, classificacao: filtered.length > 20 ? 'alta' as const : filtered.length > 5 ? 'media' as const : 'baixa' as const };
      }).filter(Boolean) as CrossedDemand[];
    }
    return data;
  }, [crossedData, searchQuery, fornecedorFilter, pecaFilter]);

  // Enrich top items with ML data
  const enrichWithML = useCallback(async () => {
    if (!crossedData.length) return;
    setEnriching(true);
    const results: MLEnrichedItem[] = [];

    // Get unique parts across all models (top 30)
    const allParts = new Map<string, { item: FleetAnalysisItem; models: string[]; fleet: number }>();
    for (const cd of crossedData) {
      for (const p of cd.pecasCompativeis) {
        const key = `${p.codigo}-${p.fornecedor}`;
        if (!allParts.has(key)) {
          allParts.set(key, { item: p, models: [cd.modelo], fleet: cd.frotaAtual });
        } else {
          const ex = allParts.get(key)!;
          if (!ex.models.includes(cd.modelo)) ex.models.push(cd.modelo);
          ex.fleet += cd.frotaAtual;
        }
      }
    }

    const topParts = [...allParts.values()]
      .sort((a, b) => b.fleet - a.fleet)
      .slice(0, 30);

    for (const entry of topParts) {
      try {
        const searchTerm = `${entry.item.produto} ${entry.item.fornecedor}`.trim();
        let summary: MLMarketSummary;
        if (mlCache.has(searchTerm)) {
          summary = mlCache.get(searchTerm)!;
        } else {
          const data = await searchML(searchTerm, { limit: 10 });
          summary = summarizeMLResults(data.results || []);
          mlCache.set(searchTerm, summary);
        }

        // Calculate 5-year investment score based on fleet growth
        const yearNums = years.map(Number).sort((a, b) => a - b);
        const lastIdx = yearNums.length - 1;
        let investimento5anos: 'alto' | 'medio' | 'baixo' = 'baixo';
        if (yearNums.length >= 5) {
          const recent = rankings.filter(r =>
            entry.models.some(m => r.model === m) && r.year >= yearNums[lastIdx] - 4
          );
          const old = rankings.filter(r =>
            entry.models.some(m => r.model === m) && r.year >= yearNums[lastIdx] - 9 && r.year < yearNums[lastIdx] - 4
          );
          const recentAvg = recent.length ? recent.reduce((s, r) => s + r.quantity, 0) / recent.length : 0;
          const oldAvg = old.length ? old.reduce((s, r) => s + r.quantity, 0) / old.length : 0;
          if (oldAvg > 0) {
            const growth = ((recentAvg - oldAvg) / oldAvg) * 100;
            if (growth > 20) investimento5anos = 'alto';
            else if (growth > 0) investimento5anos = 'medio';
          } else if (recentAvg > 0) investimento5anos = 'alto';
        }

        const indicador = getIndicadorCompra(
          summary.resultados.length > 0,
          summary.totalVendido,
          summary.resultados[0]?.available_quantity
        );

        results.push({
          item: entry.item,
          matchedModels: entry.models,
          totalFleet: entry.fleet,
          mlPrecoMedio: summary.precoMedio,
          mlMenorPreco: summary.menorPreco,
          mlTotalVendido: summary.totalVendido,
          mlFornecedorLider: summary.fornecedorLider,
          indicador,
          mlLink: summary.linkMaisVendido,
          investimento5anos,
        });
      } catch {
        // skip failed ML lookups
      }
    }

    setEnrichedItems(results);
    setEnriching(false);
    toast.success(`${results.length} peças enriquecidas com dados do Mercado Livre`);
  }, [crossedData, mlCache, rankings, years]);

  // Summary stats
  const stats = useMemo(() => {
    const totalModelos = filteredCrossed.length;
    const totalPecas = filteredCrossed.reduce((s, d) => s + d.totalPecas, 0);
    const alta = filteredCrossed.filter(d => d.classificacao === 'alta').length;
    const media = filteredCrossed.filter(d => d.classificacao === 'media').length;
    return { totalModelos, totalPecas, alta, media };
  }, [filteredCrossed]);

  // Chart data: top 10 models by matched parts
  const chartData = useMemo(() =>
    filteredCrossed
      .sort((a, b) => b.totalPecas - a.totalPecas)
      .slice(0, 10)
      .map(d => ({
        modelo: d.modelo.length > 16 ? d.modelo.slice(0, 16) + '…' : d.modelo,
        pecas: d.totalPecas,
        frota: d.frotaAtual,
      })),
    [filteredCrossed]
  );

  // Classification pie
  const classChart = useMemo(() => [
    { name: 'Alta demanda', value: stats.alta, fill: 'hsl(142 60% 50%)' },
    { name: 'Média demanda', value: stats.media, fill: 'hsl(45 90% 55%)' },
    { name: 'Baixa demanda', value: filteredCrossed.length - stats.alta - stats.media, fill: 'hsl(var(--muted-foreground))' },
  ], [stats, filteredCrossed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando dados de frota e fornecedores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Análise Cruzada de Demanda
          </h2>
          <p className="text-sm text-muted-foreground">
            Frota FENABRAVE × Fornecedores × Mercado Livre — Compra atual e investimento 5 anos
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="automovel">Automóvel</SelectItem>
              <SelectItem value="comercial_leve">Comercial Leve</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar modelo/peça..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative flex-1 min-w-[150px]">
          <Package className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Filtrar por fabricante/fornecedor..."
            value={fornecedorFilter}
            onChange={e => setFornecedorFilter(e.target.value)}
          />
        </div>
        <div className="relative flex-1 min-w-[150px]">
          <Zap className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Filtrar por peça/código..."
            value={pecaFilter}
            onChange={e => setPecaFilter(e.target.value)}
          />
        </div>
        {(searchQuery || fornecedorFilter || pecaFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setFornecedorFilter(''); setPecaFilter(''); }}>
            Limpar
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Car className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Modelos Analisados</span>
          </div>
          <p className="text-lg font-bold">{stats.totalModelos}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Peças Cruzadas</span>
          </div>
          <p className="text-lg font-bold">{stats.totalPecas}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Alta Demanda</span>
          </div>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.alta}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Fornecedores Cobertos</span>
          </div>
          <p className="text-lg font-bold">
            {new Set(filteredCrossed.flatMap(d => d.pecasCompativeis.map(p => p.fornecedor)).filter(Boolean)).size}
          </p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="cruzamento">Cruzamento</TabsTrigger>
          <TabsTrigger value="mercado">Mercado Livre</TabsTrigger>
          <TabsTrigger value="investimento">Investimento 5 Anos</TabsTrigger>
        </TabsList>

        {/* TAB 1: Cruzamento Frota × Fornecedores */}
        <TabsContent value="cruzamento" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Top 10 — Peças por Modelo</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="modelo" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip />
                    <Bar dataKey="pecas" name="Peças" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS_CHART[i % COLORS_CHART.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Classificação de Demanda</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={classChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {classChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Detalhamento por Modelo de Veículo</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos.</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead className="text-right">Frota</TableHead>
                    <TableHead className="text-center">Peças Compatíveis</TableHead>
                    <TableHead className="text-center">Demanda</TableHead>
                    <TableHead>Fornecedores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCrossed.map((d, i) => {
                    const fornecedores = [...new Set(d.pecasCompativeis.map(p => p.fornecedor).filter(Boolean))];
                    return (
                      <TableRow key={d.modelo}>
                        <TableCell className="text-xs font-mono">{i + 1}</TableCell>
                        <TableCell className="font-medium text-xs">{d.modelo}</TableCell>
                        <TableCell className="text-right text-xs">{d.frotaAtual.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={d.classificacao === 'alta' ? 'default' : 'secondary'}>
                            {d.totalPecas}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className="text-[10px]"
                            variant={d.classificacao === 'alta' ? 'default' : d.classificacao === 'media' ? 'secondary' : 'outline'}
                          >
                            {d.classificacao === 'alta' ? '🟢 Alta' : d.classificacao === 'media' ? '🟡 Média' : '🔴 Baixa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {fornecedores.slice(0, 3).join(', ') || '—'}
                          {fornecedores.length > 3 && ` +${fornecedores.length - 3}`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredCrossed.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {parts.length === 0
                          ? 'Importe peças ou listas de fornecedores para gerar o cruzamento'
                          : 'Nenhum resultado encontrado'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: Enriquecimento Mercado Livre */}
        <TabsContent value="mercado" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold">Enriquecer com Mercado Livre</h3>
                <p className="text-xs text-muted-foreground">
                  Cruza as peças dos fornecedores com preços e vendas reais do ML (top 30 peças)
                </p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-40">
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ML_STATES.map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={enrichWithML} disabled={enriching || !crossedData.length} size="sm">
                  {enriching ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  {enriching ? 'Consultando...' : 'Consultar ML'}
                </Button>
              </div>
            </div>

            {enrichedItems.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peça</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Modelos</TableHead>
                      <TableHead className="text-right">Frota Total</TableHead>
                      <TableHead className="text-right">Preço Médio ML</TableHead>
                      <TableHead className="text-right">Menor Preço</TableHead>
                      <TableHead className="text-center">Vendas ML</TableHead>
                      <TableHead className="text-center">Indicador</TableHead>
                      <TableHead>Líder ML</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedItems.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-xs truncate max-w-[160px]">{e.item.produto}</p>
                            <p className="text-[10px] text-muted-foreground">{e.item.codigo}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{e.item.fornecedor || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {e.matchedModels.slice(0, 2).join(', ')}
                          {e.matchedModels.length > 2 && ` +${e.matchedModels.length - 2}`}
                        </TableCell>
                        <TableCell className="text-right text-xs">{e.totalFleet.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{fmt(e.mlPrecoMedio)}</TableCell>
                        <TableCell className="text-right text-xs">{fmt(e.mlMenorPreco)}</TableCell>
                        <TableCell className="text-center text-xs">{e.mlTotalVendido.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={e.indicador.label === 'COMPRAR AGORA' ? 'default' : 'secondary'} className="text-[10px]">
                            {e.indicador.emoji} {e.indicador.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[100px]">{e.mlFornecedorLider || '—'}</TableCell>
                        <TableCell>
                          {e.mlLink && (
                            <a href={e.mlLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5 text-primary" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {enrichedItems.length === 0 && !enriching && (
              <div className="text-center text-muted-foreground py-8 text-sm">
                Clique em "Consultar ML" para cruzar as peças com dados reais do Mercado Livre
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 3: Investimento 5 Anos */}
        <TabsContent value="investimento" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-1">Previsão de Investimento — Longo Prazo (5 Anos)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Baseado no crescimento da frota FENABRAVE × disponibilidade no Mercado Livre
            </p>

            {enrichedItems.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <Card className="p-3 border-green-500/30 bg-green-500/5">
                    <p className="text-xs text-muted-foreground">🟢 Compra Imediata</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {enrichedItems.filter(e => e.indicador.label === 'COMPRAR AGORA').length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Disponível + preço estável</p>
                  </Card>
                  <Card className="p-3 border-amber-500/30 bg-amber-500/5">
                    <p className="text-xs text-muted-foreground">🟡 Atenção</p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {enrichedItems.filter(e => e.indicador.label === 'ATENÇÃO').length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Estoque baixo ou preço em alta</p>
                  </Card>
                  <Card className="p-3 border-red-500/30 bg-red-500/5">
                    <p className="text-xs text-muted-foreground">🔴 Investimento Longo Prazo</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {enrichedItems.filter(e => e.indicador.label === 'LONGO PRAZO').length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Baixa disponibilidade regional</p>
                  </Card>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Peça</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead className="text-center">Indicador Atual</TableHead>
                        <TableHead className="text-center">Investimento 5 Anos</TableHead>
                        <TableHead className="text-right">Frota</TableHead>
                        <TableHead className="text-right">Preço ML</TableHead>
                        <TableHead>Modelos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrichedItems
                        .sort((a, b) => {
                          const order = { alto: 0, medio: 1, baixo: 2 };
                          return order[a.investimento5anos] - order[b.investimento5anos];
                        })
                        .map((e, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <p className="font-medium text-xs truncate max-w-[160px]">{e.item.produto}</p>
                              <p className="text-[10px] text-muted-foreground">{e.item.codigo}</p>
                            </TableCell>
                            <TableCell className="text-xs">{e.item.fornecedor || '—'}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-[10px]">
                                {e.indicador.emoji} {e.indicador.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={e.investimento5anos === 'alto' ? 'default' : 'secondary'}
                                className="text-[10px]"
                              >
                                {e.investimento5anos === 'alto' ? '🚀 Alto Potencial'
                                  : e.investimento5anos === 'medio' ? '📈 Crescimento'
                                  : '📊 Estável'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs">{e.totalFleet.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-right text-xs font-semibold">{fmt(e.mlPrecoMedio)}</TableCell>
                            <TableCell className="text-xs">
                              {e.matchedModels.slice(0, 2).join(', ')}
                              {e.matchedModels.length > 2 && ` +${e.matchedModels.length - 2}`}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8 text-sm">
                Primeiro consulte os dados no Mercado Livre (aba "Mercado Livre") para gerar a análise de investimento
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
