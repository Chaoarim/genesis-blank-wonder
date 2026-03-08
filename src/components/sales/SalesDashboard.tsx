import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, ShoppingBag, Target, PlusCircle, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { Sale } from '@/hooks/useSalesData';
import { getBusinessDaysInMonth, getRemainingBusinessDays, isBusinessDay } from '@/lib/businessDays';

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
  sellerName?: string | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function SalesDashboard({ stats, onNewSale, recentSales, sellerName }: SalesDashboardProps) {
  return (
    <div className="space-y-6">
      {sellerName && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
          <p className="text-sm text-muted-foreground">Dashboard de</p>
          <p className="text-lg font-bold text-primary">{sellerName}</p>
        </div>
      )}
      {/* Quick action */}
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
        const includeSaturdays = true;
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

            {/* Daily goal */}
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
                <span className="text-xs font-semibold text-amber-600">
                  Falta: {fmt(dailyRemaining)}
                </span>
              </div>
            </div>

            {/* Monthly goal */}
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
                <span className="text-xs font-semibold text-amber-600">
                  Falta: {fmt(monthlyRemaining)}
                </span>
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
        const includeSaturdays = true; // loja funciona aos sábados
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

            {/* Daily goal */}
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
                <span className="text-xs font-semibold text-amber-600">
                  Falta: {fmt(dailyRemaining)}
                </span>
              </div>
            </div>

            {/* Monthly goal */}
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
                <span className="text-xs font-semibold text-amber-600">
                  Falta: {fmt(monthlyRemaining)}
                </span>
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

      {/* Chart */}
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
