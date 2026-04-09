import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend, LineChart, Line, Area, AreaChart } from 'recharts';
import { Loader2, Target, TrendingUp, Package, Search, ShoppingCart, Upload, Download, FileSpreadsheet, Trash2, Zap, Clock } from 'lucide-react';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
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
  readOnly?: boolean;
}

interface SupplierItem {
  id: string;
  codigo: string;
  produto: string;
  aplicacao: string;
  fornecedor: string;
}

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
  trendGrowth: number; // % growth trend across years
  potentialScore: number;
  investmentScore: number; // long-term investment score
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

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCompactUnits(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return Math.round(value).toLocaleString('pt-BR');
}

export function MarketPotentialTab({ rankings, selectedYear, selectedType, readOnly = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getOwnerId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: sellerRow } = await supabase
      .from('seller_users')
      .select('admin_user_id')
      .eq('seller_auth_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    return sellerRow?.admin_user_id || user.id;
  };

  const reloadItems = async () => {
    setLoading(true);
    const ownerId = await getOwnerId();
    if (!ownerId) { setLoading(false); return; }

    // Paginate through all supplier catalog items
    const allItems: SupplierItem[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from('supplier_catalog_items')
        .select('id, codigo, produto, aplicacao, fornecedor')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error || !data || data.length === 0) { hasMore = false; break; }
      allItems.push(...data.map(d => ({
        id: d.id,
        codigo: d.codigo,
        produto: d.produto,
        aplicacao: d.aplicacao || '',
        fornecedor: d.fornecedor || '',
      })));
      if (data.length < pageSize) hasMore = false;
      else page++;
    }
    setItems(allItems);
    setLoading(false);
  };

  useEffect(() => { reloadItems(); }, []);

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

  // Cross supplier items × fleet (current + multi-year trend)
  const itemPotentials: ItemPotential[] = useMemo(() => {
    if (!items.length || !filteredRankings.length) return [];

    const fleetModels = filteredRankings.map(r => ({
      ...r,
      normalized: normalize(r.model),
      keywords: normalize(r.model).split(' ').filter(w => w.length > 2),
    }));

    // Build per-year fleet data for trend
    const fleetByYear = new Map<number, typeof fleetModels>();
    for (const year of availableYears) {
      const yearRankings = allYearRankings
        .filter(r => r.year === year)
        .map(r => ({
          ...r,
          normalized: normalize(r.model),
          keywords: normalize(r.model).split(' ').filter(w => w.length > 2),
        }));
      fleetByYear.set(year, yearRankings);
    }

    return items.map(item => {
      const itemText = normalize(`${item.aplicacao} ${item.produto}`);

      // Match current year
      const matchedModels: string[] = [];
      let totalFleetCurrent = 0;
      for (const fm of fleetModels) {
        const matchCount = fm.keywords.filter(kw => itemText.includes(kw)).length;
        const strongMatch = fm.keywords.length <= 2 ? matchCount >= 1 : matchCount >= 2;
        if (strongMatch) {
          matchedModels.push(fm.model);
          totalFleetCurrent += fm.quantity;
        }
      }

      // Multi-year trend: total fleet matched per year
      let totalFleetAllYears = 0;
      const yearlyFleet: number[] = [];
      for (const year of availableYears) {
        const yearModels = fleetByYear.get(year) || [];
        let yearTotal = 0;
        for (const fm of yearModels) {
          const matchCount = fm.keywords.filter(kw => itemText.includes(kw)).length;
          const strongMatch = fm.keywords.length <= 2 ? matchCount >= 1 : matchCount >= 2;
          if (strongMatch) yearTotal += fm.quantity;
        }
        totalFleetAllYears += yearTotal;
        yearlyFleet.push(yearTotal);
      }

      // Calculate growth trend (linear regression slope as %)
      let trendGrowth = 0;
      if (yearlyFleet.length >= 2) {
        const first = yearlyFleet[0] || 1;
        const last = yearlyFleet[yearlyFleet.length - 1];
        trendGrowth = ((last - first) / Math.max(first, 1)) * 100;
      }

      const estimatedDemandCurrent = Math.round(totalFleetCurrent * ANNUAL_REPLACEMENT_RATE);

      // Potential score: immediate sales potential
      const potentialScore = totalFleetCurrent > 0
        ? Math.min(100, Math.round(
            (Math.log10(totalFleetCurrent + 1) * 25) +
            (matchedModels.length * 8) +
            (estimatedDemandCurrent > 100 ? 20 : estimatedDemandCurrent > 10 ? 10 : 0)
          ))
        : 0;

      // Investment score: long-term value (growth trend + fleet size)
      const investmentScore = totalFleetCurrent > 0
        ? Math.min(100, Math.round(
            (trendGrowth > 0 ? Math.min(trendGrowth, 50) : 0) +
            (Math.log10(totalFleetAllYears + 1) * 15) +
            (matchedModels.length * 5) +
            (availableYears.length > 3 && trendGrowth > 20 ? 20 : 0)
          ))
        : 0;

      // Classification
      let classification: ItemPotential['classification'] = 'sem_match';
      if (potentialScore >= 50 && investmentScore >= 40) classification = 'imediato';
      else if (investmentScore >= 50) classification = 'investimento';
      else if (potentialScore > 0) classification = 'nicho';

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
  }, [items, filteredRankings, allYearRankings, availableYears]);

  const filtered = useMemo(() => {
    if (!searchQuery) return itemPotentials;
    const q = normalize(searchQuery);
    return itemPotentials.filter(p =>
      normalize(p.codigo).includes(q) ||
      normalize(p.produto).includes(q) ||
      normalize(p.fornecedor).includes(q) ||
      normalize(p.aplicacao).includes(q)
    );
  }, [itemPotentials, searchQuery]);

  // KPIs
  const withMatch = useMemo(() => itemPotentials.filter(p => p.potentialScore > 0), [itemPotentials]);
  const immediateCount = useMemo(() => itemPotentials.filter(p => p.classification === 'imediato').length, [itemPotentials]);
  const investCount = useMemo(() => itemPotentials.filter(p => p.classification === 'investimento').length, [itemPotentials]);
  const totalDemand = useMemo(() => withMatch.reduce((s, p) => s + p.estimatedDemandCurrent, 0), [withMatch]);
  const avgScore = useMemo(() => {
    return withMatch.length > 0 ? Math.round(withMatch.reduce((s, p) => s + p.potentialScore, 0) / withMatch.length) : 0;
  }, [withMatch]);

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

  // Top 10 investment — by investment score
  const topInvestment = useMemo((): TopChartItem[] => {
    return [...itemPotentials]
      .filter(p => p.investmentScore > 0)
      .sort((a, b) => b.investmentScore - a.investmentScore)
      .slice(0, 10)
      .map(p => ({
        label: p.codigo.length > 14 ? `${p.codigo.substring(0, 14)}…` : p.codigo,
        fullLabel: `${p.codigo} - ${p.produto}`,
        value: p.investmentScore,
        score: p.trendGrowth,
      }));
  }, [itemPotentials]);

  // Demand forecast by year (trend chart)
  const demandTrend = useMemo(() => {
    if (availableYears.length < 2 || !withMatch.length) return [];
    return availableYears.map(year => {
      const yearModels = allYearRankings.filter(r => r.year === year);
      const fleetKws = yearModels.map(r => ({
        normalized: normalize(r.model),
        keywords: normalize(r.model).split(' ').filter(w => w.length > 2),
        quantity: r.quantity,
      }));
      let totalDemandYear = 0;
      for (const item of items) {
        const itemText = normalize(`${item.aplicacao} ${item.produto}`);
        for (const fm of fleetKws) {
          const matchCount = fm.keywords.filter(kw => itemText.includes(kw)).length;
          const strongMatch = fm.keywords.length <= 2 ? matchCount >= 1 : matchCount >= 2;
          if (strongMatch) totalDemandYear += fm.quantity;
        }
      }
      return {
        ano: String(year),
        demanda: Math.round(totalDemandYear * ANNUAL_REPLACEMENT_RATE),
        frota: totalDemandYear,
      };
    });
  }, [availableYears, allYearRankings, items, withMatch]);

  // Classification distribution
  const classDistribution = useMemo(() => {
    const counts = {
      imediato: itemPotentials.filter(p => p.classification === 'imediato').length,
      investimento: itemPotentials.filter(p => p.classification === 'investimento').length,
      nicho: itemPotentials.filter(p => p.classification === 'nicho').length,
      sem_match: itemPotentials.filter(p => p.classification === 'sem_match').length,
    };
    const total = itemPotentials.length;
    const pct = (v: number) => total > 0 ? `${((v / total) * 100).toFixed(1)}%` : '0%';
    return [
      { name: '🔥 Venda Imediata', value: counts.imediato, fill: '#ef4444', detail: `${pct(counts.imediato)} — Alta demanda atual + tendência` },
      { name: '📈 Investimento', value: counts.investimento, fill: '#3b82f6', detail: `${pct(counts.investimento)} — Crescimento futuro` },
      { name: '🔹 Nicho', value: counts.nicho, fill: '#10b981', detail: `${pct(counts.nicho)} — Demanda menor` },
      { name: '⚪ Sem match', value: counts.sem_match, fill: '#94a3b8', detail: `${pct(counts.sem_match)} — Sem correspondência na frota` },
    ].filter(d => d.value > 0);
  }, [itemPotentials]);

  // Import handler
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const ownerId = await getOwnerId();
      if (!ownerId) throw new Error('Usuário não autenticado');

      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      if (!rows.length) { toast.error('Planilha vazia'); setImporting(false); return; }

      const parsed = rows.map(r => ({
        user_id: ownerId,
        codigo: String(r.codigo || r.Código || r['Codigo'] || r['Código do Fabricante'] || '').trim(),
        produto: String(r.produto || r.Produto || r.descricao || r.Descrição || '').trim(),
        aplicacao: String(r.aplicacao || r.Aplicação || r['Aplicacao'] || '').trim() || null,
        fornecedor: String(r.fornecedor || r.Fornecedor || r.marca || r.Marca || '').trim() || null,
      })).filter(i => i.codigo && i.produto);

      if (!parsed.length) {
        toast.error('Nenhum item válido. Verifique colunas: codigo, produto, aplicacao, fornecedor');
        setImporting(false);
        return;
      }

      const batchSize = 500;
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize);
        const { error } = await supabase
          .from('supplier_catalog_items')
          .upsert(batch, { onConflict: 'user_id,codigo,fornecedor' });
        if (error) throw error;
      }

      toast.success(`${parsed.length} peças do fornecedor importadas!`);
      await reloadItems();
    } catch (err: any) {
      toast.error(`Erro na importação: ${err.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      { codigo: 'RCDI06820', produto: 'DISCO FREIO DIANT VENTILADO', aplicacao: 'GOL G5/G6/SAVEIRO/VOYAGE', fornecedor: 'FREMAX' },
      { codigo: 'PD/581', produto: 'PASTILHA DE FREIO DIANTEIRA', aplicacao: 'ONIX/PRISMA/COBALT/SPIN', fornecedor: 'FRAS-LE' },
      { codigo: 'HK4577', produto: 'AMORTECEDOR DIANTEIRO', aplicacao: 'HB20 1.0/1.6', fornecedor: 'KAYABA' },
    ];
    exportToExcel(template, 'modelo_lista_fornecedor', 'Lista');
    toast.success('Modelo de planilha baixado!');
  };

  const handleExport = () => {
    if (!filtered.length) { toast.error('Nenhum dado para exportar'); return; }
    const data = filtered.map(p => ({
      Código: p.codigo,
      Produto: p.produto,
      Fornecedor: p.fornecedor,
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
    exportToExcel(data, `potencial_fornecedor_${selectedYear}`, 'Potencial');
    toast.success('Dados exportados!');
  };

  const handleDeleteAll = async () => {
    const ownerId = await getOwnerId();
    if (!ownerId) return;
    const { error } = await supabase.from('supplier_catalog_items').delete().eq('user_id', ownerId);
    if (error) { toast.error('Erro ao excluir'); return; }
    setItems([]);
    toast.success('Lista de fornecedores excluída!');
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!items.length) {
    return (
      <Card className="p-8 text-center space-y-4">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold">Potencial de Mercado — Listas de Fornecedores</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {readOnly
            ? 'Nenhuma lista de fornecedores foi importada ainda. O administrador precisa importar as listas pelo painel administrativo.'
            : 'Importe listas de peças dos seus fornecedores. O sistema cruzará com os dados da FENABRAVE para identificar quais peças têm maior potencial de venda imediata e quais são ideais para investimento a longo prazo.'}
        </p>
        {!readOnly && (
          <>
            <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
                {importing ? 'Importando...' : 'Importar Lista do Fornecedor'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                Baixar Modelo
              </Button>
            </div>
          </>
        )}
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
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Peças Analisadas</p>
          <p className="text-xl font-bold">{items.length.toLocaleString('pt-BR')}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Com Potencial</p>
          <p className="text-xl font-bold text-primary">{withMatch.length.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-muted-foreground">{items.length > 0 ? Math.round((withMatch.length / items.length) * 100) : 0}% da lista</p>
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
          <p className="text-xl font-bold text-blue-600">{investCount}</p>
          <p className="text-[10px] text-muted-foreground">peças c/ crescimento</p>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        {!readOnly && (
          <>
            <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
              {importing ? 'Importando...' : 'Importar Lista'}
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
          <Download className="w-4 h-4 mr-1.5" />
          Exportar Análise
        </Button>
        {!readOnly && (
          <>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Baixar Modelo
            </Button>
            <ConfirmDeleteDialog
              description="Tem certeza que deseja excluir TODA a lista de fornecedores? Esta ação não pode ser desfeita."
              onConfirm={handleDeleteAll}
              trigger={
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Excluir Toda Lista
                </Button>
              }
            />
          </>
        )}
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
            <p className="text-sm text-muted-foreground text-center py-10">Dados insuficientes para análise de tendência</p>
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
          placeholder="Buscar por código, produto, fornecedor ou aplicação..."
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
            Análise de Potencial — Lista de Fornecedores ({selectedYear})
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Cruzamento: lista de peças × frota FENABRAVE ({filteredRankings.length} modelos)
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
                <TableHead className="text-center">Score Potencial</TableHead>
                <TableHead className="text-center">Score Invest.</TableHead>
                <TableHead className="text-right">Demanda Est.</TableHead>
                <TableHead className="text-right">Frota Match</TableHead>
                <TableHead className="text-right">Tendência</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead className="w-[40px]"></TableHead>
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
                  <TableCell>
                    <ConfirmDeleteDialog
                      description={`Excluir item ${p.codigo} da lista?`}
                      onConfirm={async () => {
                        const { error } = await supabase.from('supplier_catalog_items').delete().eq('id', p.id);
                        if (error) { toast.error('Erro ao excluir'); return; }
                        setItems(prev => prev.filter(i => i.id !== p.id));
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
          💡 Insights Estratégicos
        </h3>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li>📦 Sua lista contém <strong>{items.length}</strong> peças de fornecedores, <strong>{withMatch.length}</strong> ({items.length > 0 ? Math.round((withMatch.length / items.length) * 100) : 0}%) têm match com a frota circulante</li>
          <li>🔥 <strong>{immediateCount} peças</strong> classificadas como "Venda Imediata" — alta demanda atual, ideal para compra imediata</li>
          <li>📈 <strong>{investCount} peças</strong> com potencial de "Investimento" — tendência de crescimento na frota, bom para investimento a longo prazo</li>
          {demandTrend.length >= 2 && (
            <li>📊 Demanda estimada: de <strong>{formatCompactUnits(demandTrend[0]?.demanda || 0)}</strong> ({demandTrend[0]?.ano}) para <strong>{formatCompactUnits(demandTrend[demandTrend.length - 1]?.demanda || 0)}</strong> ({demandTrend[demandTrend.length - 1]?.ano})</li>
          )}
          <li>🎯 Peças "Sem match" podem precisar de dados de aplicação mais detalhados para correspondência correta com a frota</li>
        </ul>
      </Card>
    </div>
  );
}
