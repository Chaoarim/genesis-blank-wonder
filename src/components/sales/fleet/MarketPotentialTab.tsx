import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { Loader2, Target, TrendingUp, Package, Search, ShoppingCart, Upload, Download, FileSpreadsheet, Trash2 } from 'lucide-react';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { fetchAllInventory, type InventoryRow } from '@/lib/fetchAllInventory';
import { exportToExcel } from '@/lib/exportExcel';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reloadInventory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
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

  const handleDownloadTemplate = () => {
    const template = [
      { codigo: 'ABC123', produto: 'Pastilha de Freio Dianteira', fornecedor: 'FRAS-LE', aplicacao: 'GOL G5/G6/G7', qtd_estoque: 50, preco: 89.90 },
      { codigo: 'DEF456', produto: 'Disco de Freio Ventilado', fornecedor: 'FREMAX', aplicacao: 'ONIX/PRISMA', qtd_estoque: 30, preco: 149.90 },
    ];
    exportToExcel(template, 'modelo_estoque', 'Estoque');
    toast.success('Modelo de planilha baixado!');
  };

  const handleExport = () => {
    if (!filtered.length) { toast.error('Nenhum dado para exportar'); return; }
    const data = filtered.map(p => ({
      Código: p.codigo,
      Produto: p.produto,
      Fornecedor: p.fornecedor,
      Aplicação: p.aplicacao,
      'Qtd Estoque': p.qtd_estoque,
      'Preço (R$)': p.preco,
      Score: p.potentialScore,
      'Frota Match': p.totalFleetMatched,
      'Receita Estimada (R$)': p.revenueEstimate,
      Oportunidade: p.opportunity === 'alta' ? 'Alta' : p.opportunity === 'media' ? 'Média' : 'Baixa',
      'Modelos Compatíveis': p.matchedModels.join(', '),
    }));
    exportToExcel(data, `potencial_mercado_${selectedYear}`, 'Potencial');
    toast.success('Dados exportados com sucesso!');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: sellerRow } = await supabase
        .from('seller_users')
        .select('admin_user_id')
        .eq('seller_auth_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      const ownerId = sellerRow?.admin_user_id || user.id;

      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      if (!rows.length) { toast.error('Planilha vazia'); setImporting(false); return; }

      const items = rows.map(r => ({
        user_id: ownerId,
        codigo: String(r.codigo || r.Código || r['Codigo'] || '').trim(),
        produto: String(r.produto || r.Produto || '').trim(),
        fornecedor: String(r.fornecedor || r.Fornecedor || '').trim() || null,
        aplicacao: String(r.aplicacao || r.Aplicação || r['Aplicacao'] || '').trim() || null,
        qtd_estoque: Number(r.qtd_estoque || r['Qtd Estoque'] || r.quantidade || 0),
        preco: Number(r.preco || r['Preço'] || r.Preco || r['Preço (R$)'] || 0),
      })).filter(i => i.codigo && i.produto);

      if (!items.length) { toast.error('Nenhum item válido encontrado. Verifique as colunas: codigo, produto, fornecedor, aplicacao, qtd_estoque, preco'); setImporting(false); return; }

      const batchSize = 500;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const { error } = await supabase.from('inventory_items').upsert(batch, { onConflict: 'user_id,codigo' });
        if (error) throw error;
      }

      toast.success(`${items.length} itens importados com sucesso!`);
      await reloadInventory();
    } catch (err: any) {
      toast.error(`Erro na importação: ${err.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredRankings = useMemo(() => {
    return rankings
      .filter(r => r.year === Number(selectedYear) && r.vehicle_type === selectedType)
      .sort((a, b) => a.position - b.position);
  }, [rankings, selectedYear, selectedType]);

  useEffect(() => { reloadInventory(); }, []);

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

  // Top 10 chart — use demand when all revenues are zero (prices = 0)
  const hasRevenue = useMemo(() => withPotential.some(p => p.revenueEstimate > 0), [withPotential]);

  const topItems = useMemo(() => {
    const sorted = hasRevenue
      ? [...withPotential].sort((a, b) => b.revenueEstimate - a.revenueEstimate)
      : [...withPotential].sort((a, b) => b.estimatedDemand - a.estimatedDemand);
    return sorted.slice(0, 10).map(p => ({
      label: p.codigo.length > 12 ? p.codigo.substring(0, 12) + '…' : p.codigo,
      fullLabel: `${p.codigo} - ${p.produto}`,
      receita: p.revenueEstimate,
      demanda: p.estimatedDemand,
      score: p.potentialScore,
    }));
  }, [withPotential, hasRevenue]);

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
      <Card className="p-8 text-center space-y-4">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Nenhum item no estoque. Importe seu estoque primeiro para ver o potencial de mercado.</p>
        <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
            {importing ? 'Importando...' : 'Importar Estoque'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Baixar Modelo
          </Button>
        </div>
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

      {/* Action Bar: Import / Export / Template */}
      <div className="flex flex-wrap gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx,.xls,.csv"
          onChange={handleImport}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
          {importing ? 'Importando...' : 'Importar Estoque'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
          <Download className="w-4 h-4 mr-1.5" />
          Exportar Análise
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <FileSpreadsheet className="w-4 h-4 mr-1.5" />
          Baixar Modelo
        </Button>
        <ConfirmDeleteDialog
          description="Tem certeza que deseja excluir TODO o estoque? Esta ação não pode ser desfeita."
          onConfirm={async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { error } = await supabase.from('inventory_items').delete().eq('user_id', user.id);
            if (error) { toast.error('Erro ao excluir estoque'); return; }
            setInventory([]);
            toast.success('Estoque excluído com sucesso!');
          }}
          trigger={
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-1.5" />
              Excluir Todo Estoque
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Top 10 — {hasRevenue ? 'Maior Potencial de Receita' : 'Maior Demanda Estimada'}
          </h3>
          {topItems.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topItems} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={v => hasRevenue
                    ? `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}`
                    : v.toLocaleString('pt-BR')
                  }
                />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number) => hasRevenue
                    ? `R$ ${v.toLocaleString('pt-BR')}`
                    : `${v.toLocaleString('pt-BR')} unidades`
                  }
                  labelFormatter={(label) => topItems.find(o => o.label === label)?.fullLabel || label}
                />
                <Bar dataKey={hasRevenue ? 'receita' : 'demanda'} radius={[0, 4, 4, 0]}>
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
                <TableHead className="w-[40px]"></TableHead>
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
                  <TableCell>
                    <ConfirmDeleteDialog
                      description={`Excluir item ${p.codigo} do estoque?`}
                      onConfirm={async () => {
                        const { error } = await supabase.from('inventory_items').delete().eq('id', p.id);
                        if (error) { toast.error('Erro ao excluir'); return; }
                        setInventory(prev => prev.filter(i => i.id !== p.id));
                        toast.success(`${p.codigo} excluído`);
                      }}
                      iconSize="sm"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
