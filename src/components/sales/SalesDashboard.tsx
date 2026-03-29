import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, ShoppingBag, Target, PlusCircle, Crown, Medal, Package, Award, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import type { Sale } from '@/hooks/useSalesData';
import { getBusinessDaysInMonth, getRemainingBusinessDays, isBusinessDay } from '@/lib/businessDays';
import { supabase } from '@/integrations/supabase/client';

function useIncludeSaturdays() {
  const [includeSaturdays, setIncludeSaturdays] = useState(() => {
    try { return localStorage.getItem('goals_include_saturdays') !== 'false'; } catch { return true; }
  });
  useEffect(() => {
    const handler = () => {
      try { setIncludeSaturdays(localStorage.getItem('goals_include_saturdays') !== 'false'); } catch { /* */ }
    };
    window.addEventListener('saturday-config-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('saturday-config-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return includeSaturdays;
}

interface SalesDashboardProps {
  stats: {
    todayTotal: number;
    weekTotal: number;
    monthTotal: number;
    todaySales: number;
    monthSales: number;
    goalProgress: number;
    currentGoal: { goal_amount: number } | undefined;
    individualGoal?: { goal_amount: number } | undefined;
    individualGoalProgress?: number;
    storeGoal?: { goal_amount: number } | undefined;
    storeGoalProgress?: number;
    dailyTotals: { day: string; total: number }[];
    storeMonthTotal?: number;
  };
  onNewSale: () => void;
  recentSales: Sale[];
  allSales: Sale[];
  sellerName?: string | null;
  adminUserId?: string | null;
  sellerAuthId?: string | null;
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

export function SalesDashboard({ stats, onNewSale, recentSales, allSales, sellerName, adminUserId, sellerAuthId }: SalesDashboardProps) {
  const includeSaturdays = useIncludeSaturdays();

  // Monthly evolution (last 6 months)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const total = allSales
        .filter(s => s.status === 'completed' && new Date(s.created_at).getMonth() === m && new Date(s.created_at).getFullYear() === y)
        .reduce((sum, s) => sum + Number(s.total), 0);
      months.push({
        key: `${y}-${String(m + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        total,
      });
    }
    return months;
  }, [allSales]);

  // Top products (current month)
  const [topProducts, setTopProducts] = useState<{ produto: string; total: number; qtd: number }[]>([]);
  useEffect(() => {
    const loadTopProducts = async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthSaleIds = allSales
        .filter(s => s.status === 'completed' && new Date(s.created_at) >= new Date(monthStart))
        .map(s => s.id);
      
      if (monthSaleIds.length === 0) { setTopProducts([]); return; }

      const { data: items } = await supabase
        .from('sale_items')
        .select('produto, quantidade, preco_unitario')
        .in('sale_id', monthSaleIds.slice(0, 100));

      if (!items) { setTopProducts([]); return; }

      const prodMap = new Map<string, { total: number; qtd: number }>();
      items.forEach(i => {
        const key = i.produto;
        const prev = prodMap.get(key) || { total: 0, qtd: 0 };
        prev.total += Number(i.preco_unitario) * Number(i.quantidade);
        prev.qtd += Number(i.quantidade);
        prodMap.set(key, prev);
      });

      const sorted = Array.from(prodMap.entries())
        .map(([produto, v]) => ({ produto, ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      setTopProducts(sorted);
    };
    loadTopProducts();
  }, [allSales]);

  // Top sellers (current month) - only for admin
  const sellerRanking = useMemo(() => {
    if (sellerName) return []; // sellers don't see this
    const now = new Date();
    const monthSales = allSales.filter(
      s => s.status === 'completed' && new Date(s.created_at).getMonth() === now.getMonth() && new Date(s.created_at).getFullYear() === now.getFullYear()
    );
    const sellerMap = new Map<string, { name: string; total: number; count: number }>();
    monthSales.forEach(s => {
      const name = s.seller_name || 'Dono';
      const prev = sellerMap.get(name) || { name, total: 0, count: 0 };
      prev.total += Number(s.total);
      prev.count += 1;
      sellerMap.set(name, prev);
    });
    return Array.from(sellerMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [allSales, sellerName]);

  // Top customers (current month)
  const topCustomers = useMemo(() => {
    const now = new Date();
    const monthSales = allSales.filter(
      s => s.status === 'completed' && new Date(s.created_at).getMonth() === now.getMonth() && new Date(s.created_at).getFullYear() === now.getFullYear()
    );
    const custMap = new Map<string, number>();
    monthSales.forEach(s => {
      const name = s.customer_name || 'Cliente balcão';
      custMap.set(name, (custMap.get(name) || 0) + Number(s.total));
    });
    return Array.from(custMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [allSales]);

  return (
    <div className="space-y-6">
      {sellerName && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
          <p className="text-sm text-muted-foreground">Dashboard de</p>
          <p className="text-lg font-bold text-primary">{sellerName}</p>
        </div>
      )}

      <Button onClick={onNewSale} size="lg" className="w-full bg-gradient-to-r from-primary to-amber-600 text-primary-foreground font-bold text-base gap-2 h-14 shadow-lg">
        <PlusCircle className="w-5 h-5" />
        Registrar Nova Venda
      </Button>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Hoje" value={fmt(stats.todayTotal)} sub={`${stats.todaySales} vendas`} color="text-green-500" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Semana" value={fmt(stats.weekTotal)} color="text-blue-500" />
        <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Mês" value={fmt(stats.monthTotal)} sub={`${stats.monthSales} vendas`} color="text-primary" />
        {!sellerName && (
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="Meta da Loja"
            value={stats.storeGoal ? `${(stats.storeGoalProgress ?? 0).toFixed(0)}%` : 'Sem meta'}
            sub={stats.storeGoal ? `Objetivo ${fmt(Number(stats.storeGoal.goal_amount))}` : 'Sem meta da loja'}
            color="text-amber-500"
          >
            {stats.storeGoal && <Progress value={stats.storeGoalProgress ?? 0} className="h-1.5 mt-2" />}
          </StatCard>
        )}
        {sellerName && (
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="Meta Individual"
            value={stats.individualGoal ? `${(stats.individualGoalProgress ?? 0).toFixed(0)}%` : 'Sem meta'}
            sub={stats.individualGoal ? `Objetivo ${fmt(Number(stats.individualGoal.goal_amount))}` : 'Sem meta individual'}
            color="text-amber-500"
          >
            {stats.individualGoal && <Progress value={stats.individualGoalProgress ?? 0} className="h-1.5 mt-2" />}
          </StatCard>
        )}
      </div>

      {/* Detailed store goal card for admin */}
      {!sellerName && stats.storeGoal && (() => {
        const now = new Date();
        const goalAmount = Number(stats.storeGoal!.goal_amount);
        const businessDaysInMonth = getBusinessDaysInMonth(now.getFullYear(), now.getMonth(), includeSaturdays);
        const remainingDays = getRemainingBusinessDays(now, includeSaturdays);
        const todayIsBD = isBusinessDay(now, includeSaturdays);
        const dailyGoal = businessDaysInMonth > 0 ? goalAmount / businessDaysInMonth : 0;
        const dailyRemaining = Math.max(dailyGoal - stats.todayTotal, 0);
        const dailyProgress = dailyGoal > 0 ? Math.min((stats.todayTotal / dailyGoal) * 100, 100) : 0;
        const storeMonthTotal = stats.storeMonthTotal ?? stats.monthTotal;
        const monthlyRemaining = Math.max(goalAmount - storeMonthTotal, 0);
        const monthlyProgress = stats.storeGoalProgress ?? 0;

        return (
          <Card className="p-4 border-primary/20 bg-primary/5 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">Detalhes da Meta da Loja</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Meta Diária {!todayIsBD && <span className="text-[10px] text-muted-foreground/70">(hoje não é dia útil)</span>}
                </span>
                <span className="text-xs font-bold">{fmt(dailyGoal)}</span>
              </div>
              <Progress value={dailyProgress} className="h-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Vendido hoje: <span className="font-semibold text-foreground">{fmt(stats.todayTotal)}</span> ({dailyProgress.toFixed(0)}%)
                </span>
                <span className="text-xs font-semibold text-amber-600">Falta: {fmt(dailyRemaining)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Meta Mensal</span>
                <span className="text-xs font-bold">{fmt(goalAmount)}</span>
              </div>
              <Progress value={monthlyProgress} className="h-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Vendido no mês: <span className="font-semibold text-foreground">{fmt(storeMonthTotal)}</span> ({monthlyProgress.toFixed(0)}%)
                </span>
                <span className="text-xs font-semibold text-amber-600">Falta: {fmt(monthlyRemaining)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground text-right">
                {remainingDays} dias úteis restantes · Média necessária: {fmt(remainingDays > 0 ? monthlyRemaining / remainingDays : 0)}/dia útil
              </p>
            </div>
          </Card>
        );
      })()}

      {/* Detailed individual goal card for sellers */}
      {sellerName && stats.individualGoal && (() => {
        const now = new Date();
        const goalAmount = Number(stats.individualGoal!.goal_amount);
        const businessDaysInMonth = getBusinessDaysInMonth(now.getFullYear(), now.getMonth(), includeSaturdays);
        const remainingDays = getRemainingBusinessDays(now, includeSaturdays);
        const todayIsBusinessDay = isBusinessDay(now, includeSaturdays);
        const dailyGoal = businessDaysInMonth > 0 ? goalAmount / businessDaysInMonth : 0;
        const dailyRemaining = Math.max(dailyGoal - stats.todayTotal, 0);
        const dailyProgress = dailyGoal > 0 ? Math.min((stats.todayTotal / dailyGoal) * 100, 100) : 0;
        const monthlyRemaining = Math.max(goalAmount - stats.monthTotal, 0);
        const monthlyProgress = stats.individualGoalProgress ?? 0;

        return (
          <Card className="p-4 border-amber-500/20 bg-amber-500/5 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-semibold">Detalhes da Meta Individual</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Meta Diária {!todayIsBusinessDay && <span className="text-[10px] text-muted-foreground/70">(hoje não é dia útil)</span>}
                </span>
                <span className="text-xs font-bold">{fmt(dailyGoal)}</span>
              </div>
              <Progress value={dailyProgress} className="h-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Vendido hoje: <span className="font-semibold text-foreground">{fmt(stats.todayTotal)}</span> ({dailyProgress.toFixed(0)}%)
                </span>
                <span className="text-xs font-semibold text-amber-600">Falta: {fmt(dailyRemaining)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Meta Mensal</span>
                <span className="text-xs font-bold">{fmt(goalAmount)}</span>
              </div>
              <Progress value={monthlyProgress} className="h-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Vendido no mês: <span className="font-semibold text-foreground">{fmt(stats.monthTotal)}</span> ({monthlyProgress.toFixed(0)}%)
                </span>
                <span className="text-xs font-semibold text-amber-600">Falta: {fmt(monthlyRemaining)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground text-right">
                {remainingDays} dias úteis restantes · Média necessária: {fmt(remainingDays > 0 ? monthlyRemaining / remainingDays : 0)}/dia útil
              </p>
            </div>
          </Card>
        );
      })()}

      {/* Store goal card - always visible for seller */}
      {sellerName && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">Meta da Loja</span>
            </div>
            <span className="text-sm font-bold text-primary">
              {stats.storeGoal ? `${(stats.storeGoalProgress ?? 0).toFixed(0)}%` : 'Sem meta'}
            </span>
          </div>
          <Progress value={stats.storeGoal ? (stats.storeGoalProgress ?? 0) : 0} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground text-right">
            {stats.storeGoal ? `Objetivo ${fmt(Number(stats.storeGoal.goal_amount))}` : 'Sem meta da loja definida'}
          </p>
        </Card>
      )}

      {/* Monthly evolution chart */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Evolução Mensal de Vendas
        </h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={(l) => `Mês: ${l}`} />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', r: 5 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Daily chart */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Vendas dos últimos 7 dias</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.dailyTotals}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top products ranking */}
      {topProducts.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Top Produtos do Mês
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="produto" tick={{ fontSize: 10 }} width={120} tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + '…' : v} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {topProducts.slice(0, 5).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {topProducts.slice(0, 5).map((p, i) => (
                <div key={p.produto} className="flex items-center gap-2 text-sm">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-xs">{p.produto}</p>
                    <p className="text-xs text-muted-foreground">{p.qtd} un. vendidas</p>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">{fmt(p.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Seller ranking - admin only */}
      {!sellerName && sellerRanking.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Medal className="w-4 h-4 text-primary" />
            Ranking de Vendedores do Mês
          </h3>
          <div className="space-y-2">
            {sellerRanking.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {i + 1}º
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.count} vendas</p>
                </div>
                <span className="text-sm font-bold text-primary">{fmt(s.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top customers with pie chart */}
      {topCustomers.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            Top Clientes do Mês
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topCustomers}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 12) + '…' : name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {topCustomers.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium truncate">{c.name}</span>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Recent sales */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Vendas recentes</h3>
        {recentSales.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma venda ainda. Comece registrando sua primeira!</p>
        ) : (
          <div className="space-y-2">
            {recentSales.map(sale => (
              <div key={sale.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{sale.customer_name || 'Cliente balcão'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleDateString('pt-BR')} · {sale.channel === 'whatsapp' ? 'WhatsApp' : 'Balcão'}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">{fmt(Number(sale.total))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, children }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string; children?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {children}
    </Card>
  );
}
