import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Search, Download, Users, DollarSign, Percent, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { exportToExcel } from '@/lib/exportExcel';

interface Sale {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  total: number;
  discount: number;
  status: string;
  created_at: string;
}

interface WarrantyReturn {
  customer_id: string | null;
  customer_name: string | null;
  total_value: number;
  type: string;
  status: string;
}

interface CustomerProfit {
  customerId: string;
  name: string;
  totalSales: number;
  totalDiscount: number;
  totalReturns: number;
  netRevenue: number;
  salesCount: number;
  avgTicket: number;
  discountPct: number;
  rank: 'A' | 'B' | 'C';
}

interface CustomerProfitabilityReportProps {
  sales: Sale[];
  customers: Array<{ id: string; name: string }>;
  adminUserId: string | null;
}

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Este mês' },
  { value: '3months', label: 'Últimos 3 meses' },
  { value: '6months', label: 'Últimos 6 meses' },
  { value: 'year', label: 'Este ano' },
  { value: 'all', label: 'Tudo' },
];

export function CustomerProfitabilityReport({ sales, customers, adminUserId }: CustomerProfitabilityReportProps) {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('month');
  const [warrantyReturns, setWarrantyReturns] = useState<WarrantyReturn[]>([]);

  useEffect(() => {
    if (!adminUserId) return;
    supabase
      .from('warranty_returns')
      .select('customer_id, customer_name, total_value, type, status')
      .eq('user_id', adminUserId)
      .then(({ data }) => { if (data) setWarrantyReturns(data); });
  }, [adminUserId]);

  const filteredSales = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;

    if (period === 'month') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === '3months') {
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else if (period === '6months') {
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    } else if (period === 'year') {
      cutoff = new Date(now.getFullYear(), 0, 1);
    }

    return sales.filter(s => {
      if (s.status !== 'completed') return false;
      if (!s.customer_id) return false;
      if (cutoff && new Date(s.created_at) < cutoff) return false;
      return true;
    });
  }, [sales, period]);

  const profitData = useMemo(() => {
    const map = new Map<string, CustomerProfit>();

    for (const sale of filteredSales) {
      if (!sale.customer_id) continue;
      let entry = map.get(sale.customer_id);
      if (!entry) {
        const cust = customers.find(c => c.id === sale.customer_id);
        entry = {
          customerId: sale.customer_id,
          name: sale.customer_name || cust?.name || 'Cliente',
          totalSales: 0,
          totalDiscount: 0,
          totalReturns: 0,
          netRevenue: 0,
          salesCount: 0,
          avgTicket: 0,
          discountPct: 0,
          rank: 'C',
        };
        map.set(sale.customer_id, entry);
      }
      entry.totalSales += Number(sale.total);
      entry.totalDiscount += Number(sale.discount || 0);
      entry.salesCount += 1;
    }

    // Add warranty/returns data
    for (const wr of warrantyReturns) {
      if (!wr.customer_id) continue;
      const entry = map.get(wr.customer_id);
      if (entry) {
        entry.totalReturns += Number(wr.total_value);
      }
    }

    // Calculate derived fields
    const entries = Array.from(map.values()).map(e => {
      e.netRevenue = e.totalSales - e.totalDiscount - e.totalReturns;
      e.avgTicket = e.salesCount > 0 ? e.totalSales / e.salesCount : 0;
      e.discountPct = e.totalSales > 0 ? (e.totalDiscount / e.totalSales) * 100 : 0;
      return e;
    });

    // Sort by net revenue descending
    entries.sort((a, b) => b.netRevenue - a.netRevenue);

    // ABC classification
    const totalNet = entries.reduce((sum, e) => sum + Math.max(e.netRevenue, 0), 0);
    let cumulative = 0;
    for (const e of entries) {
      cumulative += Math.max(e.netRevenue, 0);
      const pct = totalNet > 0 ? (cumulative / totalNet) * 100 : 100;
      if (pct <= 80) e.rank = 'A';
      else if (pct <= 95) e.rank = 'B';
      else e.rank = 'C';
    }

    return entries;
  }, [filteredSales, customers, warrantyReturns]);

  const filtered = useMemo(() => {
    if (!search.trim()) return profitData;
    const q = search.toLowerCase();
    return profitData.filter(e => e.name.toLowerCase().includes(q));
  }, [profitData, search]);

  const summaryStats = useMemo(() => {
    const totalRevenue = profitData.reduce((s, e) => s + e.totalSales, 0);
    const totalNet = profitData.reduce((s, e) => s + e.netRevenue, 0);
    const totalDiscounts = profitData.reduce((s, e) => s + e.totalDiscount, 0);
    const totalReturns = profitData.reduce((s, e) => s + e.totalReturns, 0);
    const avgDiscountPct = totalRevenue > 0 ? (totalDiscounts / totalRevenue) * 100 : 0;
    return { totalRevenue, totalNet, totalDiscounts, totalReturns, avgDiscountPct, customerCount: profitData.length };
  }, [profitData]);

  const chartData = useMemo(() => {
    return filtered.slice(0, 15).map(e => ({
      name: e.name.length > 15 ? e.name.slice(0, 15) + '…' : e.name,
      receita: Number(e.netRevenue.toFixed(2)),
      rank: e.rank,
    }));
  }, [filtered]);

  const rankColor = (rank: string) => {
    if (rank === 'A') return 'bg-green-500/10 text-green-700 border-green-300';
    if (rank === 'B') return 'bg-amber-500/10 text-amber-700 border-amber-300';
    return 'bg-red-500/10 text-red-700 border-red-300';
  };

  const barColor = (rank: string) => {
    if (rank === 'A') return 'hsl(142, 71%, 45%)';
    if (rank === 'B') return 'hsl(38, 92%, 50%)';
    return 'hsl(0, 72%, 51%)';
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleExport = useCallback(() => {
    const rows = filtered.map((e, i) => ({
      '#': i + 1,
      'Cliente': e.name,
      'Vendas (R$)': Number(e.totalSales.toFixed(2)),
      'Descontos (R$)': Number(e.totalDiscount.toFixed(2)),
      'Devoluções (R$)': Number(e.totalReturns.toFixed(2)),
      'Receita Líquida (R$)': Number(e.netRevenue.toFixed(2)),
      'Qtd Vendas': e.salesCount,
      'Ticket Médio (R$)': Number(e.avgTicket.toFixed(2)),
      '% Desconto': Number(e.discountPct.toFixed(1)),
      'Classe': e.rank,
    }));
    exportToExcel(rows, 'rentabilidade-clientes');
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Rentabilidade por Cliente
          </h2>
          <p className="text-xs text-muted-foreground">Lucro considerando volume, descontos e devoluções</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Clientes</p>
                <p className="text-lg font-bold">{summaryStats.customerCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Receita Líquida</p>
                <p className="text-lg font-bold">{fmt(summaryStats.totalNet)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Desc. Médio</p>
                <p className="text-lg font-bold">{summaryStats.avgDiscountPct.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Devoluções</p>
                <p className="text-lg font-bold">{fmt(summaryStats.totalReturns)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top 15 — Receita Líquida por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 60, left: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} labelStyle={{ fontSize: 12 }} />
                <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={barColor(entry.rank)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Search + Table */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <Card>
        <ScrollArea className="max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-10">#</TableHead>
                <TableHead className="text-xs">Cliente</TableHead>
                <TableHead className="text-xs text-right">Vendas</TableHead>
                <TableHead className="text-xs text-right">Descontos</TableHead>
                <TableHead className="text-xs text-right">Devoluções</TableHead>
                <TableHead className="text-xs text-right">Líquido</TableHead>
                <TableHead className="text-xs text-right">Ticket</TableHead>
                <TableHead className="text-xs text-center">Classe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum cliente encontrado no período
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e, idx) => (
                  <TableRow key={e.customerId}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-sm font-medium max-w-[200px] truncate">{e.name}</TableCell>
                    <TableCell className="text-xs text-right">{fmt(e.totalSales)}</TableCell>
                    <TableCell className="text-xs text-right text-amber-600">
                      {e.totalDiscount > 0 ? `-${fmt(e.totalDiscount)}` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-right text-red-600">
                      {e.totalReturns > 0 ? `-${fmt(e.totalReturns)}` : '—'}
                    </TableCell>
                    <TableCell className={`text-xs text-right font-semibold ${e.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmt(e.netRevenue)}
                    </TableCell>
                    <TableCell className="text-xs text-right">{fmt(e.avgTicket)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-[10px] ${rankColor(e.rank)}`}>
                        {e.rank}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> A = 80% receita</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> B = 15% receita</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> C = 5% receita</span>
      </div>
    </div>
  );
}
