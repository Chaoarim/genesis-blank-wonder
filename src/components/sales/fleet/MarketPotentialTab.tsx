import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { Loader2, Target, TrendingUp, Package, Search, DollarSign, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { fetchAllInventory, type InventoryRow } from '@/lib/fetchAllInventory';

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
}

interface InventoryPotential {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  qtd_estoque: number;
  preco: number;
  matchedModels: string[];
  totalFleetMatched: number;
  estimatedDemand: number;
  revenueEstimate: number;
  potentialScore: number;
  opportunity: 'alta' | 'media' | 'baixa';
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const ANNUAL_REPLACEMENT_RATE = 0.15;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function MarketPotentialTab({ rankings, selectedYear, selectedType }: Props) {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRankings = useMemo(() => {
    return rankings
      .filter(r => r.year === Number(selectedYear) && r.vehicle_type === selectedType)
      .sort((a, b) => a.position - b.position);
  }, [rankings, selectedYear, selectedType]);

  // Load user inventory
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get admin user id (for sellers)
      const { data: sellerRow } = await supabase
        .from('seller_users')
        .select('admin_user_id')
        .eq('seller_auth_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const ownerId = sellerRow?.admin_user_id || user.id;
      const items = await fetchAllInventory(ownerId, 'produto', true);
      setInventory(items);
      setLoading(false);
    };
    load();
  }, []);

  // Cross inventory × fleet
  const inventoryPotentials: InventoryPotential[] = useMemo(() => {
    if (!inventory.length || !filteredRankings.length) return [];

    // Pre-process fleet models for matching
    const fleetModels = filteredRankings.map(r => ({
      ...r,
      normalized: normalize(r.model),
      keywords: normalize(r.model).split(' ').filter(w => w.length > 2),
    }));

    return inventory.map(item => {
      const itemText = normalize(`${item.aplicacao} ${item.produto}`);

      // Find which fleet models match this inventory item
      const matchedModels: string[] = [];
      let totalFleetMatched = 0;

      for (const fm of fleetModels) {
        // Check if at least 2 keywords match OR the main model name is found
        const matchCount = fm.keywords.filter(kw => itemText.includes(kw)).length;
        const strongMatch = fm.keywords.length <= 2
          ? matchCount >= 1
          : matchCount >= 2;

        if (strongMatch) {
          matchedModels.push(fm.model);
          totalFleetMatched += fm.quantity;
        }
      }

      const estimatedDemand = Math.round(totalFleetMatched * ANNUAL_REPLACEMENT_RATE);
      const revenueEstimate = Math.round(estimatedDemand * item.preco);

      // Score: demand × price × stock availability
      const potentialScore = totalFleetMatched > 0
        ? Math.min(100, Math.round(
            (Math.log10(totalFleetMatched + 1) * 20) +
            (item.qtd_estoque > 0 ? 20 : 0) +
            (item.preco > 50 ? 15 : 5) +
            (matchedModels.length * 5)
          ))
        : 0;

      let opportunity: 'alta' | 'media' | 'baixa' = 'baixa';
      if (potentialScore >= 60) opportunity = 'alta';
      else if (potentialScore >= 35) opportunity = 'media';

      return {
        id: item.id,
        codigo: item.codigo,
        produto: item.produto,
        fornecedor: item.fornecedor,
        aplicacao: item.aplicacao,
        qtd_estoque: item.qtd_estoque,
        preco: item.preco,
        matchedModels,
        totalFleetMatched,
        estimatedDemand,
        revenueEstimate,
        potentialScore,
        opportunity,
      };
    })
    .sort((a, b) => b.potentialScore - a.potentialScore);
  }, [inventory, filteredRankings]);

  const filtered = useMemo(() => {
    if (!searchQuery) return inventoryPotentials;
    const q = normalize(searchQuery);
    return inventoryPotentials.filter(p =>
      normalize(p.codigo).includes(q) ||
      normalize(p.produto).includes(q) ||
      normalize(p.fornecedor).includes(q) ||
      normalize(p.aplicacao).includes(q)
    );
  }, [inventoryPotentials, searchQuery]);

  // Summary
  const withPotential = useMemo(() => inventoryPotentials.filter(p => p.potentialScore > 0), [inventoryPotentials]);
  const totalRevenueEst = useMemo(() => withPotential.reduce((s, p) => s + p.revenueEstimate, 0), [withPotential]);
  const highCount = useMemo(() => inventoryPotentials.filter(p => p.opportunity === 'alta').length, [inventoryPotentials]);
  const avgScore = useMemo(() => {
    return withPotential.length > 0 ? Math.round(withPotential.reduce((s, p) => s + p.potentialScore, 0) / withPotential.length) : 0;
  }, [withPotential]);

  // Top 10 chart
  const topItems = useMemo(() => {
    return withPotential.slice(0, 10).map(p => ({
      label: p.codigo.length > 12 ? p.codigo.substring(0, 12) + '…' : p.codigo,
      fullLabel: `${p.codigo} - ${p.produto}`,
      receita: p.revenueEstimate,
      score: p.potentialScore,
    }));
  }, [withPotential]);

  // Opportunity distribution
  const oppDistribution = useMemo(() => {
    const alta = inventoryPotentials.filter(p => p.opportunity === 'alta').length;
    const media = inventoryPotentials.filter(p => p.opportunity === 'media').length;
    const baixa = inventoryPotentials.filter(p => p.opportunity === 'baixa' && p.potentialScore > 0).length;
    const sem = inventoryPotentials.filter(p => p.potentialScore === 0).length;
    return [
      { name: '🔴 Alta', value: alta, fill: '#ef4444' },
      { name: '🟡 Média', value: media, fill: '#f59e0b' },
      { name: '🟢 Baixa', value: baixa, fill: '#10b981' },
      { name: 'Sem match', value: sem, fill: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [inventoryPotentials]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!inventory.length) {
    return (
      <Card className="p-8 text-center">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum item no estoque. Importe seu estoque primeiro para ver o potencial de mercado.</p>
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
      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Itens no Estoque</p>
          <p className="text-xl font-bold">{inventory.length.toLocaleString('pt-BR')}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Com Potencial</p>
          <p className="text-xl font-bold text-primary">{withPotential.length.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-muted-foreground">{inventory.length > 0 ? Math.round((withPotential.length / inventory.length) * 100) : 0}% do estoque</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Receita Potencial</p>
          <p className="text-xl font-bold text-emerald-600">
            R$ {totalRevenueEst >= 1000000 ? `${(totalRevenueEst / 1000000).toFixed(1)}M` : `${(totalRevenueEst / 1000).toFixed(0)}k`}
          </p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Score Médio</p>
          <p className="text-xl font-bold">{avgScore}</p>
          <Progress value={avgScore} className="mt-1 h-1.5" />
        </Card>
        <Card className="p-3 text-center border-red-500/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">🔴 Alta Oportunidade</p>
          <p className="text-xl font-bold text-red-600">{highCount}</p>
          <p className="text-[10px] text-muted-foreground">peças para investir</p>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Top 10 — Maior Potencial de Receita
          </h3>
          {topItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topItems} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`}
                  labelFormatter={(label) => topItems.find(o => o.label === label)?.fullLabel || label}
                />
                <Bar dataKey="receita" radius={[0, 4, 4, 0]}>
                  {topItems.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum match encontrado</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Distribuição de Oportunidade
          </h3>
          {oppDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={oppDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {oppDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">Sem dados</p>
          )}
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código, produto, fornecedor ou aplicação..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Main data table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b bg-accent/30">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            Potencial de Mercado do Seu Estoque — {selectedYear}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Cruzamento entre seu estoque × frota circulante ({filteredRankings.length} modelos)
          </p>
        </div>
        <div className="overflow-auto max-h-[50vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Aplicação</TableHead>
                <TableHead className="text-right">Qtd Estoque</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-right">Frota Match</TableHead>
                <TableHead className="text-right">Receita Est.</TableHead>
                <TableHead>Oportunidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-medium">{p.codigo}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={p.produto}>{p.produto}</TableCell>
                  <TableCell className="text-xs">{p.fornecedor}</TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate" title={p.aplicacao}>{p.aplicacao || '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{p.qtd_estoque}</TableCell>
                  <TableCell className="text-right font-mono text-xs">R$ {p.preco.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <Progress value={p.potentialScore} className="h-1.5 w-10" />
                      <span className="text-xs font-mono">{p.potentialScore}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {p.totalFleetMatched > 0 ? p.totalFleetMatched.toLocaleString('pt-BR') : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-emerald-600">
                    {p.revenueEstimate > 0 ? `R$ ${(p.revenueEstimate / 1000).toFixed(0)}k` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.opportunity === 'alta' ? 'default' : p.opportunity === 'media' ? 'secondary' : 'outline'}
                      className={p.opportunity === 'alta' ? 'bg-red-500 text-white border-0' : ''}
                    >
                      {p.opportunity === 'alta' ? '🔴 Alta' : p.opportunity === 'media' ? '🟡 Média' : '🟢 Baixa'}
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
          💡 Insights do Seu Estoque
        </h3>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li>📦 Seu estoque tem <strong>{inventory.length}</strong> itens, dos quais <strong>{withPotential.length}</strong> ({inventory.length > 0 ? Math.round((withPotential.length / inventory.length) * 100) : 0}%) têm match com a frota circulante</li>
          <li>💰 Receita potencial estimada: <strong>R$ {totalRevenueEst >= 1000000 ? `${(totalRevenueEst / 1000000).toFixed(1)}M` : `${(totalRevenueEst / 1000).toFixed(0)}k`}</strong> baseada na demanda de reposição de {(ANNUAL_REPLACEMENT_RATE * 100).toFixed(0)}% da frota</li>
          {highCount > 0 && (
            <li>🚨 <strong>{highCount} peças</strong> com alta oportunidade — considere investir em mais estoque desses itens</li>
          )}
          <li>🎯 Peças com score alto e estoque baixo são candidatas ideais para reposição</li>
          <li>📊 Peças sem match com a frota podem indicar itens de nicho ou aplicações não mapeadas</li>
        </ul>
      </Card>
    </div>
  );
}
