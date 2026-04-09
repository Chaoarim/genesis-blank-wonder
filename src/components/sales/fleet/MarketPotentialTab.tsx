import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { Loader2, Target, TrendingUp, Package, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface FleetRanking {
  id: string;
  year: number;
  position: number;
  model: string;
  quantity: number;
  vehicle_type: string;
}

interface RegionalData {
  region: string;
  percentage: number;
  quantity: number;
}

interface Props {
  rankings: FleetRanking[];
  selectedYear: string;
  selectedType: string;
}

interface ModelPotential {
  model: string;
  position: number;
  fleetSize: number;
  partsInCatalog: number;
  inventoryItems: number;
  estimatedDemand: number;
  coveragePercent: number;
  opportunity: 'alta' | 'media' | 'baixa';
  revenueEstimate: number;
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Average maintenance cost per vehicle per year (estimated in BRL)
const AVG_PARTS_SPEND_PER_VEHICLE = 350;
// Average replacement cycle - fraction of fleet needing parts per year
const ANNUAL_REPLACEMENT_RATE = 0.15;

export function MarketPotentialTab({ rankings, selectedYear, selectedType }: Props) {
  const [loading, setLoading] = useState(true);
  const [partsMatchMap, setPartsMatchMap] = useState<Record<string, number>>({});
  const [inventoryMatchMap, setInventoryMatchMap] = useState<Record<string, number>>({});
  const [regionalData, setRegionalData] = useState<RegionalData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalInventoryItems, setTotalInventoryItems] = useState(0);

  const filteredRankings = useMemo(() => {
    let data = rankings.filter(r => r.year === Number(selectedYear) && r.vehicle_type === selectedType);
    return data.sort((a, b) => a.position - b.position);
  }, [rankings, selectedYear, selectedType]);

  // Load parts and inventory matches
  useEffect(() => {
    if (!filteredRankings.length) { setLoading(false); return; }

    const loadData = async () => {
      setLoading(true);
      const models = filteredRankings.map(r => r.model);

      // Get total inventory count
      const { count: invCount } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true });
      setTotalInventoryItems(invCount || 0);

      // Match parts catalog
      const partsMap: Record<string, number> = {};
      const invMap: Record<string, number> = {};

      for (const model of models.slice(0, 30)) {
        const keywords = model.replace(/\//g, ' ').split(' ').filter(w => w.length > 2);
        if (!keywords.length) continue;

        // Search in parts catalog
        const searchTerm = `%${keywords[keywords.length - 1]}%`;
        const { count: pCount } = await supabase
          .from('parts')
          .select('*', { count: 'exact', head: true })
          .or(`chave_de_busca.ilike.${searchTerm},marca_veiculo.ilike.${searchTerm},modelo_veiculo.ilike.${searchTerm}`);
        partsMap[model] = pCount || 0;

        // Search in inventory
        const { count: iCount } = await supabase
          .from('inventory_items')
          .select('*', { count: 'exact', head: true })
          .or(`aplicacao.ilike.${searchTerm},produto.ilike.${searchTerm}`);
        invMap[model] = iCount || 0;
      }

      setPartsMatchMap(partsMap);
      setInventoryMatchMap(invMap);

      // Load regional data
      const { data: regData } = await supabase
        .from('fleet_regional_data')
        .select('region, quantity, percentage')
        .eq('year', Number(selectedYear))
        .eq('vehicle_type', selectedType);
      setRegionalData((regData || []) as RegionalData[]);

      setLoading(false);
    };

    loadData();
  }, [filteredRankings, selectedYear, selectedType]);

  // Calculate market potential for each model
  const modelPotentials: ModelPotential[] = useMemo(() => {
    const totalFleet = filteredRankings.reduce((s, r) => s + r.quantity, 0);

    return filteredRankings.map(r => {
      const partsInCatalog = partsMatchMap[r.model] || 0;
      const inventoryItems = inventoryMatchMap[r.model] || 0;
      const estimatedDemand = Math.round(r.quantity * ANNUAL_REPLACEMENT_RATE);
      const revenueEstimate = Math.round(estimatedDemand * AVG_PARTS_SPEND_PER_VEHICLE);

      // Coverage: ratio of inventory items matched vs parts in catalog
      const coveragePercent = partsInCatalog > 0
        ? Math.min(Math.round((inventoryItems / partsInCatalog) * 100), 100)
        : 0;

      let opportunity: 'alta' | 'media' | 'baixa' = 'baixa';
      if (r.position <= 5 && coveragePercent < 50) opportunity = 'alta';
      else if (r.position <= 10 && coveragePercent < 70) opportunity = 'media';
      else if (r.position <= 15 && coveragePercent < 30) opportunity = 'alta';

      return {
        model: r.model,
        position: r.position,
        fleetSize: r.quantity,
        partsInCatalog,
        inventoryItems,
        estimatedDemand,
        coveragePercent,
        opportunity,
        revenueEstimate,
      };
    });
  }, [filteredRankings, partsMatchMap, inventoryMatchMap]);

  const filtered = useMemo(() => {
    if (!searchQuery) return modelPotentials;
    const q = searchQuery.toLowerCase();
    return modelPotentials.filter(m => m.model.toLowerCase().includes(q));
  }, [modelPotentials, searchQuery]);

  // Summary metrics
  const totalFleet = useMemo(() => filteredRankings.reduce((s, r) => s + r.quantity, 0), [filteredRankings]);
  const totalEstimatedDemand = useMemo(() => modelPotentials.reduce((s, m) => s + m.estimatedDemand, 0), [modelPotentials]);
  const totalRevenuePotential = useMemo(() => modelPotentials.reduce((s, m) => s + m.revenueEstimate, 0), [modelPotentials]);
  const avgCoverage = useMemo(() => {
    const withParts = modelPotentials.filter(m => m.partsInCatalog > 0);
    return withParts.length > 0 ? Math.round(withParts.reduce((s, m) => s + m.coveragePercent, 0) / withParts.length) : 0;
  }, [modelPotentials]);
  const highOpportunities = useMemo(() => modelPotentials.filter(m => m.opportunity === 'alta').length, [modelPotentials]);

  // Regional demand estimation
  const regionalDemand = useMemo(() => {
    return regionalData.map(r => ({
      region: r.region,
      percentage: r.percentage,
      estimatedDemand: Math.round(totalEstimatedDemand * (r.percentage / 100)),
      estimatedRevenue: Math.round(totalRevenuePotential * (r.percentage / 100)),
    })).sort((a, b) => b.estimatedDemand - a.estimatedDemand);
  }, [regionalData, totalEstimatedDemand, totalRevenuePotential]);

  // Coverage distribution for pie chart
  const coverageDistribution = useMemo(() => {
    const high = modelPotentials.filter(m => m.coveragePercent >= 70).length;
    const medium = modelPotentials.filter(m => m.coveragePercent >= 30 && m.coveragePercent < 70).length;
    const low = modelPotentials.filter(m => m.coveragePercent > 0 && m.coveragePercent < 30).length;
    const none = modelPotentials.filter(m => m.coveragePercent === 0).length;
    return [
      { name: 'Alta (≥70%)', value: high, fill: '#10b981' },
      { name: 'Média (30-70%)', value: medium, fill: '#f59e0b' },
      { name: 'Baixa (<30%)', value: low, fill: '#ef4444' },
      { name: 'Sem cobertura', value: none, fill: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [modelPotentials]);

  // Top opportunities chart
  const topOpportunities = useMemo(() => {
    return [...modelPotentials]
      .sort((a, b) => b.revenueEstimate - a.revenueEstimate)
      .slice(0, 10)
      .map(m => ({
        model: m.model.length > 15 ? m.model.substring(0, 15) + '...' : m.model,
        fullModel: m.model,
        receita: m.revenueEstimate,
        cobertura: m.coveragePercent,
      }));
  }, [modelPotentials]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!filteredRankings.length) {
    return (
      <Card className="p-8 text-center">
        <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum dado de frota disponível para calcular o potencial de mercado.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Frota Total</p>
          <p className="text-xl font-bold">{totalFleet.toLocaleString('pt-BR')}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Demanda Estimada/Ano</p>
          <p className="text-xl font-bold text-primary">{totalEstimatedDemand.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-muted-foreground">{(ANNUAL_REPLACEMENT_RATE * 100).toFixed(0)}% da frota</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Receita Potencial</p>
          <p className="text-xl font-bold text-emerald-600">R$ {(totalRevenuePotential / 1000000).toFixed(1)}M</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cobertura Média</p>
          <p className="text-xl font-bold">{avgCoverage}%</p>
          <Progress value={avgCoverage} className="mt-1 h-1.5" />
        </Card>
        <Card className="p-3 text-center border-amber-500/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Oportunidades</p>
          <p className="text-xl font-bold text-amber-600">{highOpportunities}</p>
          <p className="text-[10px] text-muted-foreground">modelos com alta demanda + baixa cobertura</p>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 10 Revenue Potential */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Top 10 — Receita Potencial (R$)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topOpportunities} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="model" width={120} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`}
                labelFormatter={(label) => {
                  const item = topOpportunities.find(o => o.model === label);
                  return item?.fullModel || label;
                }}
              />
              <Bar dataKey="receita" radius={[0, 4, 4, 0]}>
                {topOpportunities.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Coverage Distribution */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Cobertura do Catálogo vs Frota
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={coverageDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {coverageDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Regional demand */}
      {regionalDemand.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            🗺️ Potencial de Mercado por Região
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {regionalDemand.map(r => (
              <Card key={r.region} className="p-3 text-center bg-accent/30">
                <p className="text-xs font-semibold">{r.region}</p>
                <p className="text-sm font-bold mt-1">{r.estimatedDemand.toLocaleString('pt-BR')} veículos</p>
                <p className="text-xs text-emerald-600 font-medium">R$ {(r.estimatedRevenue / 1000).toFixed(0)}k</p>
                <p className="text-[10px] text-muted-foreground">{r.percentage.toFixed(1)}% do mercado</p>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar modelo..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Main data table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b bg-accent/30">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Análise de Potencial por Modelo — {selectedYear}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Cruzamento entre frota circulante × catálogo de peças × estoque disponível
          </p>
        </div>
        <div className="overflow-auto max-h-[50vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Frota</TableHead>
                <TableHead className="text-right">Demanda Est.</TableHead>
                <TableHead className="text-right">Peças Catálogo</TableHead>
                <TableHead className="text-right">No Estoque</TableHead>
                <TableHead className="text-center">Cobertura</TableHead>
                <TableHead className="text-right">Receita Est.</TableHead>
                <TableHead>Oportunidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 50).map(m => (
                <TableRow key={m.model}>
                  <TableCell className="font-mono text-xs">{m.position}°</TableCell>
                  <TableCell className="font-medium text-sm">{m.model}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{m.fleetSize.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-primary">{m.estimatedDemand.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">
                    {m.partsInCatalog > 0 ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Package className="w-3 h-3" /> {m.partsInCatalog}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs text-destructive">
                        <AlertTriangle className="w-3 h-3" /> 0
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {m.inventoryItems > 0 ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <CheckCircle className="w-3 h-3" /> {m.inventoryItems}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-2">
                      <Progress value={m.coveragePercent} className="h-1.5 w-12" />
                      <span className="text-xs font-mono">{m.coveragePercent}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-emerald-600">
                    R$ {(m.revenueEstimate / 1000).toFixed(0)}k
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={m.opportunity === 'alta' ? 'default' : m.opportunity === 'media' ? 'secondary' : 'outline'}
                      className={m.opportunity === 'alta' ? 'bg-red-500 text-white border-0' : ''}
                    >
                      {m.opportunity === 'alta' ? '🔴 Alta' : m.opportunity === 'media' ? '🟡 Média' : '🟢 Baixa'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Insights */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          💡 Insights de Potencial de Mercado
        </h3>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li>🎯 <strong>{totalFleet.toLocaleString('pt-BR')}</strong> veículos na frota geram demanda estimada de <strong>{totalEstimatedDemand.toLocaleString('pt-BR')}</strong> manutenções/ano</li>
          <li>💰 Potencial de receita total estimado em <strong>R$ {(totalRevenuePotential / 1000000).toFixed(1)}M</strong> (base R$ {AVG_PARTS_SPEND_PER_VEHICLE}/veículo/ano)</li>
          <li>📦 Cobertura média do catálogo: <strong>{avgCoverage}%</strong> — {avgCoverage < 50 ? 'há grande espaço para ampliar o mix de peças' : 'boa cobertura, foque na profundidade do estoque'}</li>
          {highOpportunities > 0 && (
            <li>🚨 <strong>{highOpportunities} modelos</strong> com alta demanda e baixa cobertura — priorize a inclusão de peças para estes veículos</li>
          )}
          <li>📊 Seu estoque cobre <strong>{totalInventoryItems.toLocaleString('pt-BR')}</strong> itens — cruze com os modelos mais emplacados para maximizar o retorno</li>
        </ul>
      </Card>
    </div>
  );
}
