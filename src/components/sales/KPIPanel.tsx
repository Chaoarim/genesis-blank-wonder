import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Receipt, Users, Clock, Truck, TrendingUp, TrendingDown, Minus,
  BarChart3, ShoppingCart, CalendarDays, Package,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from 'recharts';
import type { Sale } from '@/hooks/useSalesData';

interface KPIPanelProps {
  allSales: Sale[];
  adminUserId: string | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(38 70% 60%)',
  'hsl(200 50% 60%)',
  'hsl(142 50% 55%)',
];

export function KPIPanel({ allSales, adminUserId }: KPIPanelProps) {
  const completedSales = useMemo(() => allSales.filter(s => s.status === 'completed'), [allSales]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Current month sales
  const monthSales = useMemo(
    () => completedSales.filter(s => {
      const d = new Date(s.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }),
    [completedSales, currentMonth, currentYear]
  );

  // Previous month sales
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthSales = useMemo(
    () => completedSales.filter(s => {
      const d = new Date(s.created_at);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }),
    [completedSales, prevMonth, prevYear]
  );

  // --- KPI 1: Ticket Médio ---
  const ticketMedio = monthSales.length > 0
    ? monthSales.reduce((s, v) => s + Number(v.total), 0) / monthSales.length
    : 0;
  const prevTicketMedio = prevMonthSales.length > 0
    ? prevMonthSales.reduce((s, v) => s + Number(v.total), 0) / prevMonthSales.length
    : 0;
  const ticketVariation = prevTicketMedio > 0
    ? ((ticketMedio - prevTicketMedio) / prevTicketMedio) * 100
    : 0;

  // --- KPI 2: Taxa de conversão (vendas com cliente vs balcão) ---
  const salesWithCustomer = monthSales.filter(s => s.customer_id).length;
  const conversionRate = monthSales.length > 0
    ? (salesWithCustomer / monthSales.length) * 100
    : 0;

  // --- KPI 3: Tempo médio entre compras por cliente ---
  const avgRepurchaseDays = useMemo(() => {
    const customerSales = new Map<string, Date[]>();
    completedSales.forEach(s => {
      if (!s.customer_id) return;
      const dates = customerSales.get(s.customer_id) || [];
      dates.push(new Date(s.created_at));
      customerSales.set(s.customer_id, dates);
    });

    const intervals: number[] = [];
    customerSales.forEach(dates => {
      if (dates.length < 2) return;
      dates.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < dates.length; i++) {
        const diffDays = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 0 && diffDays < 365) intervals.push(diffDays);
      }
    });

    return intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : 0;
  }, [completedSales]);

  // --- KPI 4: Vendas por canal ---
  const channelBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    monthSales.forEach(s => {
      const ch = s.channel === 'whatsapp' ? 'WhatsApp' : s.channel === 'catalogo_b2b' ? 'Catálogo B2B' : 'Balcão';
      const prev = map.get(ch) || { count: 0, total: 0 };
      prev.count++;
      prev.total += Number(s.total);
      map.set(ch, prev);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [monthSales]);

  // --- KPI 5: Vendas por forma de pagamento ---
  const paymentBreakdown = useMemo(() => {
    const labels: Record<string, string> = {
      dinheiro: 'Dinheiro', pix: 'PIX', cartao_credito: 'Cartão Crédito',
      cartao_debito: 'Cartão Débito', boleto: 'Boleto', prazo: 'A Prazo',
      a_combinar: 'A Combinar', transferencia: 'Transferência',
    };
    const map = new Map<string, number>();
    monthSales.forEach(s => {
      const label = labels[s.payment_method] || s.payment_method;
      map.set(label, (map.get(label) || 0) + Number(s.total));
    });
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [monthSales]);

  // --- KPI 6: Top Fornecedores ---
  const [topSuppliers, setTopSuppliers] = useState<{ name: string; total: number; qtd: number }[]>([]);
  useEffect(() => {
    const load = async () => {
      const saleIds = monthSales.map(s => s.id);
      if (saleIds.length === 0) { setTopSuppliers([]); return; }

      const { data: items } = await supabase
        .from('sale_items')
        .select('fornecedor, quantidade, preco_unitario')
        .in('sale_id', saleIds.slice(0, 200));

      if (!items) { setTopSuppliers([]); return; }

      const map = new Map<string, { total: number; qtd: number }>();
      items.forEach(i => {
        const name = i.fornecedor || 'Sem fornecedor';
        const prev = map.get(name) || { total: 0, qtd: 0 };
        prev.total += Number(i.preco_unitario) * Number(i.quantidade);
        prev.qtd += Number(i.quantidade);
        map.set(name, prev);
      });

      setTopSuppliers(
        Array.from(map.entries())
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 8)
      );
    };
    load();
  }, [monthSales]);

  // --- KPI 7: Vendas por dia da semana ---
  const salesByWeekday = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const totals = Array(7).fill(0);
    const counts = Array(7).fill(0);
    monthSales.forEach(s => {
      const day = new Date(s.created_at).getDay();
      totals[day] += Number(s.total);
      counts[day]++;
    });
    return days.map((name, i) => ({ name, total: totals[i], count: counts[i] }));
  }, [monthSales]);

  // --- KPI 8: Horário de pico ---
  const salesByHour = useMemo(() => {
    const hours = Array(24).fill(0);
    monthSales.forEach(s => {
      const h = new Date(s.created_at).getHours();
      hours[h]++;
    });
    const peakHour = hours.indexOf(Math.max(...hours));
    return { hours, peakHour, peakCount: hours[peakHour] };
  }, [monthSales]);

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 2) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
    if (value < -2) return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Painel de KPIs</h2>
        <Badge variant="secondary" className="text-[10px]">
          {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </Badge>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Ticket Médio */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Ticket Médio</span>
          </div>
          <p className="text-xl font-bold">{fmt(ticketMedio)}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon value={ticketVariation} />
            <span className={`text-[11px] font-medium ${ticketVariation > 0 ? 'text-emerald-500' : ticketVariation < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {ticketVariation > 0 ? '+' : ''}{ticketVariation.toFixed(1)}% vs mês anterior
            </span>
          </div>
        </Card>

        {/* Taxa de Conversão */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Taxa Conversão</span>
          </div>
          <p className="text-xl font-bold">{conversionRate.toFixed(1)}%</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {salesWithCustomer} de {monthSales.length} com cliente
          </p>
        </Card>

        {/* Tempo Médio entre Compras */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Recompra Média</span>
          </div>
          <p className="text-xl font-bold">{avgRepurchaseDays > 0 ? `${avgRepurchaseDays} dias` : '—'}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Tempo entre compras
          </p>
        </Card>

        {/* Horário de Pico */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Horário de Pico</span>
          </div>
          <p className="text-xl font-bold">
            {salesByHour.peakCount > 0 ? `${salesByHour.peakHour}h` : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {salesByHour.peakCount > 0 ? `${salesByHour.peakCount} vendas nesse horário` : 'Sem dados'}
          </p>
        </Card>
      </div>

      {/* Top Fornecedores */}
      {topSuppliers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Top Fornecedores do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSuppliers.slice(0, 6)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 14) + '…' : v} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {topSuppliers.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {topSuppliers.slice(0, 6).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.qtd} un.</p>
                    </div>
                    <span className="text-xs font-bold text-primary shrink-0">{fmt(s.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vendas por dia da semana */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Vendas por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByWeekday}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    labelFormatter={(l) => `${l}`}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vendas por forma de pagamento */}
        {paymentBreakdown.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Formas de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentBreakdown}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name.length > 10 ? name.slice(0, 10) + '…' : name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {paymentBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Vendas por Canal */}
      {channelBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Vendas por Canal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {channelBreakdown.map((ch, i) => (
                <div key={ch.name} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-xs font-medium">{ch.name}</span>
                  </div>
                  <p className="text-lg font-bold">{fmt(ch.total)}</p>
                  <p className="text-[11px] text-muted-foreground">{ch.count} vendas</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
