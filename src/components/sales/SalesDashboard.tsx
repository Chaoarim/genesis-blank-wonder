import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, ShoppingBag, Target, PlusCircle, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { Sale } from '@/hooks/useSalesData';

interface SalesDashboardProps {
  stats: {
    todayTotal: number;
    weekTotal: number;
    monthTotal: number;
    todaySales: number;
    monthSales: number;
    goalProgress: number;
    currentGoal: { goal_amount: number } | undefined;
    dailyTotals: { day: string; total: number }[];
  };
  onNewSale: () => void;
  recentSales: Sale[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function SalesDashboard({ stats, onNewSale, recentSales }: SalesDashboardProps) {
  return (
    <div className="space-y-6">
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
        <StatCard icon={<Target className="w-5 h-5" />} label="Meta" value={stats.currentGoal ? `${stats.goalProgress.toFixed(0)}%` : 'Sem meta'} color="text-amber-500">
          {stats.currentGoal && <Progress value={stats.goalProgress} className="h-1.5 mt-2" />}
        </StatCard>
      </div>

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
