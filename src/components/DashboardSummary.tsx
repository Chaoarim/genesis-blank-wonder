import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DollarSign, ShoppingBag, Target, AlertTriangle, TrendingUp, PackageCheck, Package, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SummaryData {
  todayTotal: number;
  todaySales: number;
  monthTotal: number;
  monthSales: number;
  goalAmount: number | null;
  goalProgress: number;
  lowStockCount: number;
  expeditionPending: number;
  expeditionInProgress: number;
  expeditionReady: number;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function DashboardSummary({ userId }: { userId: string }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const [salesRes, goalRes, stockRes, expeditionRes] = await Promise.all([
        supabase
          .from('sales')
          .select('total, created_at')
          .in('status', ['completed', 'draft'])
          .gte('created_at', monthStart),
        supabase
          .from('sales_goals')
          .select('goal_amount')
          .eq('month', today.getMonth() + 1)
          .eq('year', today.getFullYear())
          .is('seller_auth_id', null)
          .maybeSingle(),
        supabase
          .from('inventory_items')
          .select('id', { count: 'exact', head: true })
          .lte('qtd_estoque', 3)
          .gt('qtd_estoque', -1),
        supabase
          .from('expedition_orders')
          .select('status')
          .in('status', ['pending', 'in_progress', 'ready']),
      ]);
      const sales = salesRes.data || [];
      const todaySales = sales.filter(s => s.created_at.startsWith(todayStr));
      const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
      const monthTotal = sales.reduce((sum, s) => sum + Number(s.total), 0);
      const goalAmount = goalRes.data?.goal_amount ? Number(goalRes.data.goal_amount) : null;
      const goalProgress = goalAmount ? Math.min((monthTotal / goalAmount) * 100, 100) : 0;

      const expeditions = expeditionRes.data || [];
      const expeditionPending = expeditions.filter(e => e.status === 'pending').length;
      const expeditionInProgress = expeditions.filter(e => e.status === 'in_progress').length;
      const expeditionReady = expeditions.filter(e => e.status === 'ready').length;

      setData({
        todayTotal,
        todaySales: todaySales.length,
        monthTotal,
        monthSales: sales.length,
        goalAmount,
        goalProgress,
        lowStockCount: stockRes.count ?? 0,
        expeditionPending,
        expeditionInProgress,
        expeditionReady,
      });
      setLoading(false);
    };

    fetchSummary();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-16 mt-1" />
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Resumo do Dia</h2>
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Vendas Hoje</span>
          </div>
          <p className="text-xl font-bold">{fmt(data.todayTotal)}</p>
          <p className="text-xs text-muted-foreground">{data.todaySales} venda{data.todaySales !== 1 ? 's' : ''}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Vendas no Mês</span>
          </div>
          <p className="text-xl font-bold">{fmt(data.monthTotal)}</p>
          <p className="text-xs text-muted-foreground">{data.monthSales} venda{data.monthSales !== 1 ? 's' : ''}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Meta Mensal</span>
          </div>
          {data.goalAmount ? (
            <>
              <p className="text-xl font-bold">{data.goalProgress.toFixed(0)}%</p>
              <Progress value={data.goalProgress} className="h-1.5 mt-1" />
              <p className="text-xs text-muted-foreground mt-1">
                Falta {fmt(Math.max(data.goalAmount - data.monthTotal, 0))}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sem meta definida</p>
          )}
        </Card>

        <Card className={`p-4 ${data.lowStockCount > 0 ? 'border-amber-500/40 bg-amber-500/5' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${data.lowStockCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground">Estoque Baixo</span>
          </div>
          <p className={`text-xl font-bold ${data.lowStockCount > 0 ? 'text-amber-600' : ''}`}>
            {data.lowStockCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.lowStockCount > 0 ? 'produto(s) com ≤ 3 un.' : 'Tudo OK'}
          </p>
        </Card>

        {(data.expeditionPending + data.expeditionInProgress + data.expeditionReady) > 0 && (
          <Card className="p-4 col-span-2 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <PackageCheck className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Expedição</span>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm font-semibold">{data.expeditionPending}</span>
                <span className="text-xs text-muted-foreground">Pendente{data.expeditionPending !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-sm font-semibold">{data.expeditionInProgress}</span>
                <span className="text-xs text-muted-foreground">Separando</span>
              </div>
              <div className="flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-green-500" />
                <span className="text-sm font-semibold">{data.expeditionReady}</span>
                <span className="text-xs text-muted-foreground">Pronto{data.expeditionReady !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
