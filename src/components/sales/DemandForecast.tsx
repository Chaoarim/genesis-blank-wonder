import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Sale } from '@/hooks/useSalesData';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface DemandForecastProps {
  allSales: Sale[];
  adminUserId: string | null;
}

interface ProductDemand {
  codigo: string;
  produto: string;
  fornecedor: string;
  // Monthly quantities for last 6 months
  monthlyQtd: number[];
  monthlyRevenue: number[];
  totalQtd: number;
  totalRevenue: number;
  avgMonthlyQtd: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  forecast: number; // predicted qty next month
  forecastRevenue: number;
}

function calcTrend(values: number[]): { trend: 'up' | 'down' | 'stable'; percent: number } {
  if (values.length < 2) return { trend: 'stable', percent: 0 };
  // Compare last 3 months avg vs first 3 months avg
  const half = Math.ceil(values.length / 2);
  const first = values.slice(0, half);
  const second = values.slice(half);
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
  if (avgFirst === 0 && avgSecond === 0) return { trend: 'stable', percent: 0 };
  if (avgFirst === 0) return { trend: 'up', percent: 100 };
  const pct = ((avgSecond - avgFirst) / avgFirst) * 100;
  if (pct > 10) return { trend: 'up', percent: pct };
  if (pct < -10) return { trend: 'down', percent: pct };
  return { trend: 'stable', percent: pct };
}

function simpleForecast(values: number[]): number {
  if (values.length === 0) return 0;
  // Weighted moving average (more recent months weigh more)
  const weights = values.map((_, i) => i + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weighted = values.reduce((sum, v, i) => sum + v * weights[i], 0);
  return Math.round(weighted / totalWeight);
}

export function DemandForecast({ allSales, adminUserId }: DemandForecastProps) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductDemand[]>([]);
  const [sortBy, setSortBy] = useState<'forecast' | 'trend' | 'total'>('forecast');
  const [filterTrend, setFilterTrend] = useState<'all' | 'up' | 'down' | 'stable'>('all');

  // Build 6-month windows
  const monthWindows = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: d.getMonth(), year: d.getFullYear(), label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') };
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      // Get completed sale IDs in the last 6 months
      const relevantSales = allSales.filter(
        s => s.status === 'completed' && new Date(s.created_at) >= sixMonthsAgo
      );
      if (relevantSales.length === 0) { setProducts([]); setLoading(false); return; }

      const saleIds = relevantSales.map(s => s.id);
      // Map sale_id -> created_at month/year
      const saleMonthMap = new Map<string, { month: number; year: number }>();
      relevantSales.forEach(s => {
        const d = new Date(s.created_at);
        saleMonthMap.set(s.id, { month: d.getMonth(), year: d.getFullYear() });
      });

      // Fetch sale items in batches
      let allItems: any[] = [];
      for (let i = 0; i < saleIds.length; i += 100) {
        const batch = saleIds.slice(i, i + 100);
        const { data } = await supabase
          .from('sale_items')
          .select('sale_id, codigo, produto, fornecedor, quantidade, preco_unitario')
          .in('sale_id', batch);
        if (data) allItems = allItems.concat(data);
      }

      // Aggregate by product
      const prodMap = new Map<string, {
        codigo: string; produto: string; fornecedor: string;
        monthlyQtd: number[]; monthlyRevenue: number[];
      }>();

      allItems.forEach(item => {
        const saleMeta = saleMonthMap.get(item.sale_id);
        if (!saleMeta) return;

        const key = item.codigo;
        if (!prodMap.has(key)) {
          prodMap.set(key, {
            codigo: item.codigo,
            produto: item.produto,
            fornecedor: item.fornecedor || '',
            monthlyQtd: new Array(6).fill(0),
            monthlyRevenue: new Array(6).fill(0),
          });
        }
        const prod = prodMap.get(key)!;
        const monthIdx = monthWindows.findIndex(
          w => w.month === saleMeta.month && w.year === saleMeta.year
        );
        if (monthIdx >= 0) {
          prod.monthlyQtd[monthIdx] += Number(item.quantidade);
          prod.monthlyRevenue[monthIdx] += Number(item.quantidade) * Number(item.preco_unitario);
        }
      });

      // Build result
      const result: ProductDemand[] = Array.from(prodMap.values()).map(p => {
        const totalQtd = p.monthlyQtd.reduce((a, b) => a + b, 0);
        const totalRevenue = p.monthlyRevenue.reduce((a, b) => a + b, 0);
        const avgMonthlyQtd = totalQtd / 6;
        const { trend, percent } = calcTrend(p.monthlyQtd);
        const forecast = simpleForecast(p.monthlyQtd);
        const avgPrice = totalQtd > 0 ? totalRevenue / totalQtd : 0;

        return {
          ...p,
          totalQtd,
          totalRevenue,
          avgMonthlyQtd,
          trend,
          trendPercent: percent,
          forecast,
          forecastRevenue: forecast * avgPrice,
        };
      });

      setProducts(result);
      setLoading(false);
    };
    load();
  }, [allSales, monthWindows]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (filterTrend !== 'all') list = list.filter(p => p.trend === filterTrend);
    switch (sortBy) {
      case 'forecast': list.sort((a, b) => b.forecast - a.forecast); break;
      case 'trend': list.sort((a, b) => b.trendPercent - a.trendPercent); break;
      case 'total': list.sort((a, b) => b.totalQtd - a.totalQtd); break;
    }
    return list.slice(0, 50);
  }, [products, sortBy, filterTrend]);

  // Top 10 for chart
  const top10 = filtered.slice(0, 10);

  // Aggregate forecast chart data
  const forecastChartData = useMemo(() => {
    const data = monthWindows.map(w => ({ label: w.label, qtd: 0 }));
    // Sum all top10 products
    top10.forEach(p => {
      p.monthlyQtd.forEach((q, i) => { data[i].qtd += q; });
    });
    // Add forecast month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const forecastTotal = top10.reduce((s, p) => s + p.forecast, 0);
    data.push({
      label: nextMonth.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + ' (prev)',
      qtd: forecastTotal,
    });
    return data;
  }, [top10, monthWindows]);

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const trendColor = (trend: string) => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400';
    if (trend === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Analisando histórico de vendas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Previsão de Demanda
          </h2>
          <p className="text-sm text-muted-foreground">Previsão baseada no histórico dos últimos 6 meses</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterTrend} onValueChange={(v) => setFilterTrend(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tendência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="up">↑ Em alta</SelectItem>
              <SelectItem value="down">↓ Em queda</SelectItem>
              <SelectItem value="stable">→ Estável</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="forecast">Previsão</SelectItem>
              <SelectItem value="trend">Tendência</SelectItem>
              <SelectItem value="total">Total vendido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Produtos Analisados</span>
          </div>
          <p className="text-lg font-bold">{products.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Em Alta</span>
          </div>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {products.filter(p => p.trend === 'up').length}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Em Queda</span>
          </div>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">
            {products.filter(p => p.trend === 'down').length}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Alta Demanda Prevista</span>
          </div>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {products.filter(p => p.forecast >= p.avgMonthlyQtd * 1.2).length}
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Evolução + Previsão (Top 10 produtos)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="qtd"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  strokeDasharray={(idx: number) => idx === forecastChartData.length - 1 ? '5 5' : '0'}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Previsão Próximo Mês — Top 10
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="produto"
                  tick={{ fontSize: 10 }}
                  width={120}
                  tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v}
                />
                <Tooltip formatter={(v: number, name: string) => [v, name === 'forecast' ? 'Previsão' : v]} />
                <Bar dataKey="forecast" name="Previsão" radius={[0, 4, 4, 0]}>
                  {top10.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.trend === 'up' ? 'hsl(142 60% 50%)' : entry.trend === 'down' ? 'hsl(0 60% 55%)' : 'hsl(var(--primary))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Detail table */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Detalhamento por Produto</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Fornecedor</TableHead>
                {monthWindows.map(w => (
                  <TableHead key={w.label + w.year} className="text-center text-xs">{w.label}</TableHead>
                ))}
                <TableHead className="text-center">Tendência</TableHead>
                <TableHead className="text-center">Previsão</TableHead>
                <TableHead className="text-right">Receita Prev.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.codigo}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-xs truncate max-w-[180px]">{p.produto}</p>
                      <p className="text-[10px] text-muted-foreground">{p.codigo}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{p.fornecedor || '—'}</TableCell>
                  {p.monthlyQtd.map((q, i) => (
                    <TableCell key={i} className="text-center text-xs">
                      {q > 0 ? q : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TrendIcon trend={p.trend} />
                      <span className={`text-xs font-medium ${trendColor(p.trend)}`}>
                        {p.trendPercent > 0 ? '+' : ''}{p.trendPercent.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={p.forecast >= p.avgMonthlyQtd * 1.2 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {p.forecast} un.
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold">
                    {fmt(p.forecastRevenue)}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Nenhum produto encontrado com os filtros selecionados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
