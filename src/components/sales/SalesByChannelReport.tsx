import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { MessageSquare, Store, Globe, TrendingUp, ShoppingBag, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Sale } from '@/hooks/useSalesData';

const CHANNEL_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  whatsapp: { label: 'WhatsApp', color: 'hsl(142 70% 45%)', icon: MessageSquare },
  balcao: { label: 'Balcão', color: 'hsl(var(--primary))', icon: Store },
  catalogo_b2b: { label: 'Catálogo B2B', color: 'hsl(38 70% 55%)', icon: Globe },
  telefone: { label: 'Telefone', color: 'hsl(200 60% 50%)', icon: ShoppingBag },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function getChannelLabel(ch: string) {
  return CHANNEL_CONFIG[ch]?.label || ch;
}
function getChannelColor(ch: string) {
  return CHANNEL_CONFIG[ch]?.color || 'hsl(var(--muted-foreground))';
}

interface SalesByChannelReportProps {
  allSales: Sale[];
}

type Period = 'month' | '3months' | '6months' | 'year';

export function SalesByChannelReport({ allSales }: SalesByChannelReportProps) {
  const [period, setPeriod] = useState<Period>('month');

  const filteredSales = useMemo(() => {
    const now = new Date();
    let cutoff: Date;
    switch (period) {
      case 'month': cutoff = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case '3months': cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1); break;
      case '6months': cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1); break;
      case 'year': cutoff = new Date(now.getFullYear(), 0, 1); break;
    }
    return allSales.filter(s => s.status === 'completed' && new Date(s.created_at) >= cutoff);
  }, [allSales, period]);

  // Channel summary
  const channelData = useMemo(() => {
    const map = new Map<string, { total: number; count: number; avgTicket: number; avgDiscount: number }>();
    filteredSales.forEach(s => {
      const ch = s.channel || 'balcao';
      const prev = map.get(ch) || { total: 0, count: 0, avgTicket: 0, avgDiscount: 0 };
      prev.total += Number(s.total);
      prev.count += 1;
      prev.avgDiscount += Number(s.discount || 0);
      map.set(ch, prev);
    });
    const grandTotal = filteredSales.reduce((sum, s) => sum + Number(s.total), 0);
    return Array.from(map.entries())
      .map(([channel, d]) => ({
        channel,
        label: getChannelLabel(channel),
        color: getChannelColor(channel),
        total: d.total,
        count: d.count,
        avgTicket: d.count > 0 ? d.total / d.count : 0,
        totalDiscount: d.avgDiscount,
        share: grandTotal > 0 ? (d.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  // Monthly evolution by channel (last 6 months)
  const monthlyEvolution = useMemo(() => {
    const now = new Date();
    const months: { label: string; [key: string]: number | string }[] = [];
    const channelsSet = new Set(filteredSales.map(s => s.channel || 'balcao'));

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const entry: any = { label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') };
      channelsSet.forEach(ch => { entry[ch] = 0; });

      allSales
        .filter(s => s.status === 'completed' && new Date(s.created_at).getMonth() === m && new Date(s.created_at).getFullYear() === y)
        .forEach(s => {
          const ch = s.channel || 'balcao';
          entry[ch] = (entry[ch] || 0) + Number(s.total);
        });

      months.push(entry);
    }
    return { data: months, channels: Array.from(channelsSet) };
  }, [allSales, filteredSales]);

  // Previous period comparison
  const comparison = useMemo(() => {
    const now = new Date();
    let currentStart: Date, prevStart: Date, prevEnd: Date;
    switch (period) {
      case 'month':
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case '3months':
        currentStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0);
        break;
      case '6months':
        currentStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth() - 5, 0);
        break;
      default:
        currentStart = new Date(now.getFullYear(), 0, 1);
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        prevEnd = new Date(now.getFullYear() - 1, 11, 31);
        break;
    }

    const prevSales = allSales.filter(s => s.status === 'completed' && new Date(s.created_at) >= prevStart && new Date(s.created_at) <= prevEnd);
    const prevTotal = prevSales.reduce((sum, s) => sum + Number(s.total), 0);
    const currentTotal = filteredSales.reduce((sum, s) => sum + Number(s.total), 0);
    const growth = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
    return { prevTotal, currentTotal, growth, prevCount: prevSales.length, currentCount: filteredSales.length };
  }, [allSales, filteredSales, period]);

  const grandTotal = filteredSales.reduce((sum, s) => sum + Number(s.total), 0);
  const grandCount = filteredSales.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Relatório de Vendas por Canal
          </h2>
          <p className="text-sm text-muted-foreground">Compare a performance entre os canais de venda</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="3months">Últimos 3 meses</SelectItem>
            <SelectItem value="6months">Últimos 6 meses</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Geral</span>
          </div>
          <p className="text-lg font-bold">{fmt(grandTotal)}</p>
          <p className="text-xs text-muted-foreground">{grandCount} vendas</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Ticket Médio</span>
          </div>
          <p className="text-lg font-bold">{fmt(grandCount > 0 ? grandTotal / grandCount : 0)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Canais Ativos</span>
          </div>
          <p className="text-lg font-bold">{channelData.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            {comparison.growth >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">vs. Período Anterior</span>
          </div>
          <p className={`text-lg font-bold ${comparison.growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {comparison.growth >= 0 ? '+' : ''}{comparison.growth.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">{fmt(comparison.prevTotal)} anterior</p>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Faturamento por Canal</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {channelData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie chart */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Participação por Canal</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ label, share }) => `${label} ${share.toFixed(0)}%`}
                >
                  {channelData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Monthly evolution */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Evolução Mensal por Canal</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyEvolution.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              {monthlyEvolution.channels.map(ch => (
                <Line
                  key={ch}
                  type="monotone"
                  dataKey={ch}
                  name={getChannelLabel(ch)}
                  stroke={getChannelColor(ch)}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detail table */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Detalhamento por Canal</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Descontos</TableHead>
                <TableHead className="text-right">Participação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelData.map(ch => (
                <TableRow key={ch.channel}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ch.color }} />
                      <span className="font-medium">{ch.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{ch.count}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(ch.total)}</TableCell>
                  <TableCell className="text-right">{fmt(ch.avgTicket)}</TableCell>
                  <TableCell className="text-right text-red-500">{fmt(ch.totalDiscount)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="text-xs">{ch.share.toFixed(1)}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {channelData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma venda encontrada no período selecionado
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
