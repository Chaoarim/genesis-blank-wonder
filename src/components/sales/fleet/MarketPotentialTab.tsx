import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend, Area, AreaChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Target, TrendingUp, Package, Search, ShoppingCart, Zap, Clock, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';
import { getFleetModelKeywords, itemMatchesFleetModel, loadFleetAnalysisItems, normalizeFleetText, type FleetAnalysisItem } from './fleetAnalysisData';

interface FleetRanking {
  id: string;
  year: number;
  position: number;
  model: string;
  quantity: number;
  vehicle_type: string;
}

interface Props {
  rankings: FleetRanking[];
  selectedYear: string;
  selectedType: string;
  readOnly?: boolean;
  externalProductSearch?: string;
  adminUserId?: string | null;
}

type PartItem = FleetAnalysisItem;

interface ItemPotential {
  id: string;
  codigo: string;
  produto: string;
  aplicacao: string;
  fornecedor: string;
  matchedModels: string[];
  totalFleetCurrent: number;
  totalFleetAllYears: number;
  estimatedDemandCurrent: number;
  trendGrowth: number;
  potentialScore: number;
  investmentScore: number;
  classification: 'imediato' | 'investimento' | 'nicho' | 'sem_match';
}

interface TopChartItem {
  label: string;
  fullLabel: string;
  value: number;
  score: number;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];
const ANNUAL_REPLACEMENT_RATE = 0.15;

function formatCompactUnits(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return Math.round(value).toLocaleString('pt-BR');
}

export function MarketPotentialTab({ rankings, selectedYear, selectedType, externalProductSearch = '', adminUserId = null }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFabricante, setSelectedFabricante] = useState<string>('__all__');
  const [sourceLabel, setSourceLabel] = useState('Lista de peças');
  const [hasOwnerContext, setHasOwnerContext] = useState(true);

  const reloadItems = useCallback(async () => {
    setLoading(true);
    try {
      const { items: loadedItems, sourceLabel: resolvedSourceLabel, ownerId } = await loadFleetAnalysisItems(adminUserId);
      setItems(loadedItems);
      setSourceLabel(resolvedSourceLabel);
      setHasOwnerContext(Boolean(ownerId));
    } catch (error) {
      console.error('Erro ao carregar lista para análise de potencial:', error);
      toast.error('Erro ao carregar a lista de peças da análise');
      setItems([]);
      setSourceLabel('Erro ao carregar lista de peças');
      setHasOwnerContext(Boolean(adminUserId));
    } finally {
      setLoading(false);
    }
  }, [adminUserId]);

  // Unique fabricante list for selection
  const fabricantes = useMemo(() => {
    const unique = [...new Set(items.map(i => i.fornecedor).filter(Boolean))].sort();
    return unique;
  }, [items]);

  // Items filtered by selected fabricante
  const activeItems = useMemo(() => {
    if (selectedFabricante === '__all__') return items;
    const fabricanteNormalizado = normalizeFleetText(selectedFabricante);
    return items.filter(i => normalizeFleetText(i.fornecedor) === fabricanteNormalizado);
  }, [items, selectedFabricante]);

  useEffect(() => {
    reloadItems();
  }, [reloadItems]);

  useEffect(() => {
    if (
      selectedFabricante !== '__all__' &&
      !fabricantes.some(fabricante => normalizeFleetText(fabricante) === normalizeFleetText(selectedFabricante))
    ) {
      setSelectedFabricante('__all__');
    }
  }, [fabricantes, selectedFabricante]);

  // Get all years available in rankings for trend analysis
  const allYearRankings = useMemo(() => {
    return rankings.filter(r => r.vehicle_type === selectedType);
  }, [rankings, selectedType]);

  const availableYears = useMemo(() => {
    return [...new Set(allYearRankings.map(r => r.year))].sort();
  }, [allYearRankings]);

  const filteredRankings = useMemo(() => {
    return rankings
      .filter(r => r.year === Number(selectedYear) && r.vehicle_type === selectedType)
      .sort((a, b) => a.position - b.position);
  }, [rankings, selectedYear, selectedType]);

  // Cross parts × fleet (current + multi-year trend)
  const itemPotentials: ItemPotential[] = useMemo(() => {
    if (!activeItems.length || !filteredRankings.length) return [];

    const fleetModels = filteredRankings.map(r => ({
      ...r,
      ...getFleetModelKeywords(r.model),
    }));

    const fleetByYear = new Map<number, typeof fleetModels>();
    for (const year of availableYears) {
      const yearRankings = allYearRankings
        .filter(r => r.year === year)
        .map(r => ({
          ...r,
            ...getFleetModelKeywords(r.model),
        }));
      fleetByYear.set(year, yearRankings);
    }

    return activeItems.map(item => {
      const itemText = normalizeFleetText(`${item.aplicacao} ${item.produto} ${item.searchText}`);

      const matchedModels: string[] = [];
      let totalFleetCurrent = 0;
      for (const fm of fleetModels) {
        const strongMatch = itemMatchesFleetModel(itemText, fm.normalized, fm.keywords);
        if (strongMatch) {
          matchedModels.push(fm.model);
          totalFleetCurrent += fm.quantity;
        }
      }

      let totalFleetAllYears = 0;
      const yearlyFleet: number[] = [];
      for (const year of availableYears) {
        const yearModels = fleetByYear.get(year) || [];
        let yearTotal = 0;
        for (const fm of yearModels) {
          const strongMatch = itemMatchesFleetModel(itemText, fm.normalized, fm.keywords);
          if (strongMatch) yearTotal += fm.quantity;
        }
        totalFleetAllYears += yearTotal;
        yearlyFleet.push(yearTotal);
      }

      let trendGrowth = 0;
      if (yearlyFleet.length >= 2) {
        const first = yearlyFleet[0] || 1;
        const last = yearlyFleet[yearlyFleet.length - 1];
        trendGrowth = ((last - first) / Math.max(first, 1)) * 100;
      }

      const estimatedDemandCurrent = Math.round(totalFleetCurrent * ANNUAL_REPLACEMENT_RATE);

      const potentialScore = totalFleetCurrent > 0
        ? Math.min(100, Math.round(
            (Math.log10(totalFleetCurrent + 1) * 25) +
            (matchedModels.length * 8) +
            (estimatedDemandCurrent > 100 ? 20 : estimatedDemandCurrent > 10 ? 10 : 0)
          ))
        : 0;

      // Investment score: consider fleet presence even without multi-year trend
      const investmentScore = totalFleetCurrent > 0
        ? Math.min(100, Math.round(
            (trendGrowth > 0 ? Math.min(trendGrowth, 50) : 0) +
            (Math.log10(totalFleetAllYears + 1) * 15) +
            (matchedModels.length * 5) +
            (availableYears.length > 3 && trendGrowth > 20 ? 20 : 0) +
            (totalFleetCurrent > 0 && availableYears.length <= 1 ? 15 : 0)
          ))
        : 0;

      let classification: ItemPotential['classification'] = 'sem_match';
      if (totalFleetCurrent > 0 && trendGrowth > 15) {
        if (potentialScore >= 60) classification = 'imediato';
        else classification = 'investimento';
      } else if (totalFleetCurrent > 0 && trendGrowth > 0) {
        classification = 'investimento';
      } else if (totalFleetCurrent > 0 && availableYears.length <= 1) {
        // Only 1 year of data — still count as investment if fleet match exists
        classification = 'investimento';
      } else if (potentialScore >= 40) {
        classification = 'imediato';
      } else if (potentialScore > 0) {
        classification = 'nicho';
      }

      return {
        id: item.id,
        codigo: item.codigo,
        produto: item.produto,
        aplicacao: item.aplicacao,
        fornecedor: item.fornecedor,
        matchedModels,
        totalFleetCurrent,
        totalFleetAllYears,
        estimatedDemandCurrent,
        trendGrowth,
        potentialScore,
        investmentScore,
        classification,
      };
    }).sort((a, b) => b.potentialScore - a.potentialScore);
  }, [activeItems, filteredRankings, allYearRankings, availableYears]);

  const searchTerms = useMemo(() => {
    return [externalProductSearch, searchQuery]
      .map(term => term.trim())
      .filter(Boolean);
  }, [externalProductSearch, searchQuery]);

  const searchLabel = useMemo(() => searchTerms.join(' • '), [searchTerms]);

  const filtered = useMemo(() => {
    if (!searchTerms.length) return itemPotentials;

    return itemPotentials.filter(item => {
      const searchableText = normalizeFleetText(`${item.codigo} ${item.produto} ${item.fornecedor} ${item.aplicacao}`);
      return searchTerms.every(term => searchableText.includes(normalizeFleetText(term)));
    });
  }, [itemPotentials, searchTerms]);

  const displayItems = filtered;
  const itemsConsideredCount = displayItems.length;
  const withMatch = useMemo(() => displayItems.filter(p => p.potentialScore > 0), [displayItems]);
  const growthItems = useMemo(
    () => displayItems.filter(p => p.classification === 'investimento'),
    [displayItems],
  );
  const immediateCount = useMemo(() => displayItems.filter(p => p.classification === 'imediato').length, [displayItems]);
  const growthCount = useMemo(() => growthItems.length, [growthItems]);
  const totalDemand = useMemo(() => withMatch.reduce((s, p) => s + p.estimatedDemandCurrent, 0), [withMatch]);

  // Top 10 chart — by demand
  const topImmediate = useMemo((): TopChartItem[] => {
    return [...withMatch]
      .sort((a, b) => b.estimatedDemandCurrent - a.estimatedDemandCurrent)
      .slice(0, 10)
      .map(p => ({
        label: p.codigo.length > 14 ? `${p.codigo.substring(0, 14)}…` : p.codigo,
        fullLabel: `${p.codigo} - ${p.produto}`,
        value: p.estimatedDemandCurrent,
        score: p.potentialScore,
      }));
  }, [withMatch]);

  // Top 10 investment
  const topInvestment = useMemo((): TopChartItem[] => {
    return [...growthItems]
      .filter(p => p.investmentScore > 0)
      .sort((a, b) => {
        if (b.investmentScore !== a.investmentScore) return b.investmentScore - a.investmentScore;
        return b.trendGrowth - a.trendGrowth;
      })
      .slice(0, 10)
      .map(p => ({
        label: p.codigo.length > 14 ? `${p.codigo.substring(0, 14)}…` : p.codigo,
        fullLabel: `${p.codigo} - ${p.produto}`,
        value: p.investmentScore,
        score: p.trendGrowth,
      }));
  }, [growthItems]);

  const activeItemsById = useMemo(() => {
    return new Map(activeItems.map(item => [item.id, item]));
  }, [activeItems]);

  const itemsForTrend = useMemo(() => {
    return displayItems
      .map(item => activeItemsById.get(item.id))
      .filter((item): item is PartItem => Boolean(item));
  }, [displayItems, activeItemsById]);

  // Demand forecast by year
  const demandTrend = useMemo(() => {
    if (availableYears.length < 2 || !withMatch.length || !itemsForTrend.length) return [];
    return availableYears.map(year => {
      const yearModels = allYearRankings.filter(r => r.year === year);
      const fleetKws = yearModels.map(r => ({
        ...getFleetModelKeywords(r.model),
        quantity: r.quantity,
      }));
      let totalDemandYear = 0;
      for (const item of itemsForTrend) {
        const itemText = normalizeFleetText(`${item.aplicacao} ${item.produto} ${item.searchText}`);
        for (const fm of fleetKws) {
          const strongMatch = itemMatchesFleetModel(itemText, fm.normalized, fm.keywords);
          if (strongMatch) totalDemandYear += fm.quantity;
        }
      }
      return {
        ano: String(year),
        demanda: Math.round(totalDemandYear * ANNUAL_REPLACEMENT_RATE),
        frota: totalDemandYear,
      };
    });
  }, [availableYears, allYearRankings, itemsForTrend, withMatch]);

  // Classification distribution
  const classDistribution = useMemo(() => {
    const counts = {
      imediato: displayItems.filter(p => p.classification === 'imediato').length,
      investimento: displayItems.filter(p => p.classification === 'investimento').length,
      nicho: displayItems.filter(p => p.classification === 'nicho').length,
      sem_match: displayItems.filter(p => p.classification === 'sem_match').length,
    };
    const total = displayItems.length;
    const pct = (v: number) => total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '0%';
    return [
      { name: '🔥 Venda Imediata', value: counts.imediato, fill: '#ef4444', detail: `${pct(counts.imediato)} — Alta demanda atual + tendência` },
      { name: '📈 Investimento', value: counts.investimento, fill: '#3b82f6', detail: `${pct(counts.investimento)} — Crescimento futuro` },
      { name: '🔹 Nicho', value: counts.nicho, fill: '#10b981', detail: `${pct(counts.nicho)} — Demanda menor` },
      { name: '⚪ Sem match', value: counts.sem_match, fill: '#94a3b8', detail: `${pct(counts.sem_match)} — Sem correspondência na frota` },
    ].filter(d => d.value > 0);
  }, [displayItems]);

  const handleExport = () => {
    if (!filtered.length) { toast.error('Nenhum dado para exportar'); return; }
    const data = filtered.map(p => ({
      Código: p.codigo,
      Produto: p.produto,
      Fabricante: p.fornecedor,
      Aplicação: p.aplicacao,
      'Score Potencial': p.potentialScore,
      'Score Investimento': p.investmentScore,
      'Demanda Estimada': p.estimatedDemandCurrent,
      'Frota Match (Atual)': p.totalFleetCurrent,
      'Tendência (%)': `${p.trendGrowth.toFixed(1)}%`,
      Classificação: p.classification === 'imediato' ? 'Venda Imediata'
        : p.classification === 'investimento' ? 'Investimento'
        : p.classification === 'nicho' ? 'Nicho' : 'Sem Match',
      'Modelos Compatíveis': p.matchedModels.join(', '),
    }));
    exportToExcel(data, `potencial_pecas_${selectedYear}`, 'Potencial');
    toast.success('Dados exportados!');
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!items.length) {
    return (
      <Card className="p-8 text-center space-y-4">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold">Potencial de Mercado — Lista de Peças</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {hasOwnerContext
            ? 'Nenhuma peça encontrada no estoque ou na lista de fornecedores. Importe sua lista para cruzar com a frota circulante e prever demanda real.'
            : 'Faça login para carregar sua lista de peças e cruzar os itens com a frota circulante da FENABRAVE.'}
        </p>
        <Badge variant="outline" className="mx-auto">
          Fonte da análise: {sourceLabel}
        </Badge>
      </Card>
    );
  }

  if (!filteredRankings.length) {
    return (
      <Card className="p-8 text-center">
        <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum dado de frota disponível para o ano/tipo selecionado.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Fonte da análise: {sourceLabel}</Badge>
        {selectedFabricante !== '__all__' && <Badge variant="secondary">Fabricante: {selectedFabricante}</Badge>}
        {searchTerms.length > 0 && (
          <Badge variant="secondary" className="gap-1.5">
            <Search className="w-3 h-3" />
            Filtro produto: "{searchLabel}" — {filtered.length} resultados
          </Badge>
        )}
      </div>
      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Itens Considerados</p>
          <p className="text-xl font-bold">{itemsConsideredCount.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-muted-foreground">de {activeItems.length.toLocaleString('pt-BR')} na fonte atual</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Com Potencial</p>
          <p className="text-xl font-bold text-primary">{withMatch.length.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-muted-foreground">{itemsConsideredCount > 0 ? Math.round((withMatch.length / itemsConsideredCount) * 100) : 0}% do recorte</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Demanda Total Est.</p>
          <p className="text-xl font-bold text-emerald-600">{formatCompactUnits(totalDemand)}</p>
          <p className="text-[10px] text-muted-foreground">unidades/ano</p>
        </Card>
        <Card className="p-3 text-center border-red-500/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
            <Zap className="w-3 h-3" /> Venda Imediata
          </p>
          <p className="text-xl font-bold text-red-600">{immediateCount}</p>
          <p className="text-[10px] text-muted-foreground">peças p/ comprar agora</p>
        </Card>
        <Card className="p-3 text-center border-blue-500/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Investimento
          </p>
          <p className="text-xl font-bold text-blue-600">{growthCount}</p>
          <p className="text-[10px] text-muted-foreground">peças c/ crescimento</p>
        </Card>
      </div>

      {/* Fabricante Selection */}
      <div className="flex flex-wrap items-center gap-2">
        {fabricantes.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Fabricante:</span>
            <Select value={selectedFabricante} onValueChange={setSelectedFabricante}>
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Selecionar fabricante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os fabricantes ({items.length})</SelectItem>
                {fabricantes.map(f => (
                  <SelectItem key={f} value={f}>
                    {f} ({items.filter(i => i.fornecedor === f).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
          <Download className="w-4 h-4 mr-1.5" />
          Exportar Análise
        </Button>
      </div>

      {/* Charts Row 1: Immediate Potential + Classification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-red-500" />
            Top 10 — Maior Potencial de Venda Imediata
          </h3>
          {topImmediate.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topImmediate} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1) || 10]}
                  tickFormatter={formatCompactUnits}
                />
                <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString('pt-BR')} un. demanda estimada`, 'Demanda']}
                  labelFormatter={(label) => topImmediate.find(o => o.label === label)?.fullLabel || label}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} minPointSize={6}>
                  {topImmediate.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum match com a frota</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Classificação Estratégica
          </h3>
          {classDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={classDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {classDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const item = classDistribution.find(d => d.name === name);
                    return [`${value.toLocaleString('pt-BR')} peças — ${item?.detail || ''}`, name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Sem dados</p>
          )}
        </Card>
      </div>

      {/* Charts Row 2: Investment + Demand Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Top 10 — Melhor Investimento a Longo Prazo
          </h3>
          {topInvestment.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topInvestment} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}`} />
                <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number, _: string, props: any) => [
                    `Score: ${v} | Tendência: ${props.payload.score.toFixed(1)}%`,
                    'Investimento'
                  ]}
                  labelFormatter={(label) => topInvestment.find(o => o.label === label)?.fullLabel || label}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18} minPointSize={6}>
                  {topInvestment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhuma peça com crescimento positivo no período histórico</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Previsão de Demanda — Evolução por Ano
          </h3>
          {demandTrend.length >= 2 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={demandTrend} margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatCompactUnits} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    `${v.toLocaleString('pt-BR')} ${name === 'demanda' ? 'un. (reposição estimada)' : 'veículos na frota'}`,
                    name === 'demanda' ? 'Demanda' : 'Frota'
                  ]}
                />
                <Area type="monotone" dataKey="frota" stroke="#3b82f6" fill="#3b82f680" name="Frota" />
                <Area type="monotone" dataKey="demanda" stroke="#ef4444" fill="#ef444440" name="Demanda" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">
              Necessário pelo menos 2 anos de dados para previsão
            </p>
          )}
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, produto, fabricante ou aplicação..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Data Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b bg-accent/30">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Análise de Potencial — {sourceLabel} ({selectedYear})
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Cruzamento: {sourceLabel.toLowerCase()} × frota FENABRAVE ({filteredRankings.length} modelos)
          </p>
        </div>
        <div className="overflow-auto max-h-[50vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Fabricante</TableHead>
                <TableHead>Aplicação</TableHead>
                <TableHead className="text-center">Score Potencial</TableHead>
                <TableHead className="text-center">Score Invest.</TableHead>
                <TableHead className="text-right">Demanda Est.</TableHead>
                <TableHead className="text-right">Frota Match</TableHead>
                <TableHead className="text-right">Tendência</TableHead>
                <TableHead>Classificação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-medium">{p.codigo}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={p.produto}>{p.produto}</TableCell>
                  <TableCell className="text-xs">{p.fornecedor || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate" title={p.aplicacao}>{p.aplicacao || '—'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <Progress value={p.potentialScore} className="h-1.5 w-10" />
                      <span className="text-xs font-mono">{p.potentialScore}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <Progress value={p.investmentScore} className="h-1.5 w-10" />
                      <span className="text-xs font-mono">{p.investmentScore}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {p.estimatedDemandCurrent > 0 ? p.estimatedDemandCurrent.toLocaleString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {p.totalFleetCurrent > 0 ? p.totalFleetCurrent.toLocaleString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {p.trendGrowth !== 0 ? (
                      <span className={p.trendGrowth > 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {p.trendGrowth > 0 ? '+' : ''}{p.trendGrowth.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.classification === 'imediato' ? 'default' : p.classification === 'investimento' ? 'secondary' : 'outline'}
                      className={
                        p.classification === 'imediato' ? 'bg-red-500 text-white border-0' :
                        p.classification === 'investimento' ? 'bg-blue-500 text-white border-0' : ''
                      }
                    >
                      {p.classification === 'imediato' ? '🔥 Imediato' :
                       p.classification === 'investimento' ? '📈 Investir' :
                       p.classification === 'nicho' ? '🔹 Nicho' : '⚪ Sem match'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 100 && (
          <div className="p-2 text-center text-xs text-muted-foreground border-t">
            Mostrando 100 de {filtered.length} itens. Use a busca para filtrar.
          </div>
        )}
      </Card>

      {/* Insights */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          💡 Insights Estratégicos
        </h3>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li>📦 A fonte atual (<strong>{sourceLabel}</strong>) contém <strong>{activeItems.length}</strong> itens; no recorte exibido, <strong>{withMatch.length}</strong> ({itemsConsideredCount > 0 ? Math.round((withMatch.length / itemsConsideredCount) * 100) : 0}%) têm match com a frota circulante</li>
          <li>🔥 <strong>{immediateCount} peças</strong> classificadas como "Venda Imediata" — alta demanda atual, ideal para compra imediata</li>
          <li>📈 <strong>{growthCount} peças</strong> com tendência positiva de crescimento na frota — oportunidades de investimento no médio/longo prazo</li>
          {demandTrend.length >= 2 && (
            <li>📊 Demanda estimada: de <strong>{formatCompactUnits(demandTrend[0]?.demanda || 0)}</strong> ({demandTrend[0]?.ano}) para <strong>{formatCompactUnits(demandTrend[demandTrend.length - 1]?.demanda || 0)}</strong> ({demandTrend[demandTrend.length - 1]?.ano})</li>
          )}
          <li>🎯 Peças "Sem match" podem precisar de dados de aplicação mais detalhados para correspondência correta com a frota</li>
        </ul>
      </Card>
    </div>
  );
}
