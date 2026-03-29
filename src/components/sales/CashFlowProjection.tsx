import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Loader2 } from 'lucide-react';
import { format, addDays, startOfDay, endOfDay, isWithinInterval, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashFlowProjectionProps {
  allSales: any[];
  adminUserId: string | null;
}

interface Receivable {
  date: string;
  amount: number;
  label: string;
}

interface Payable {
  date: string;
  amount: number;
  label: string;
}

export function CashFlowProjection({ allSales, adminUserId }: CashFlowProjectionProps) {
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState('30');

  useEffect(() => {
    if (!adminUserId) return;
    supabase.from('accounts_payable').select('*').eq('status', 'pending')
      .then(({ data }) => {
        if (data) setPayables(data);
        setLoading(false);
      });
  }, [adminUserId]);

  const days = parseInt(horizon);
  const today = startOfDay(new Date());
  const endDate = endOfDay(addDays(today, days));

  // Receivables: sales with payment_deadline in the future that haven't been paid
  const receivables = useMemo<Receivable[]>(() => {
    return allSales
      .filter(s => s.status === 'completed' && s.payment_deadline && !s.paid_at)
      .map(s => ({
        date: s.payment_deadline,
        amount: Number(s.total),
        label: s.customer_name || 'Cliente',
      }))
      .filter(r => {
        const d = parseISO(r.date);
        return isWithinInterval(d, { start: today, end: endDate });
      });
  }, [allSales, today, endDate]);

  // Payables: pending accounts payable
  const futurePayables = useMemo<Payable[]>(() => {
    return payables
      .map(p => ({
        date: p.due_date,
        amount: Number(p.amount) - Number(p.paid_amount || 0),
        label: p.supplier_name || p.description || 'Fornecedor',
      }))
      .filter(p => {
        const d = parseISO(p.date);
        return p.amount > 0 && isWithinInterval(d, { start: today, end: endDate });
      });
  }, [payables, today, endDate]);

  // Group by week
  const chartData = useMemo(() => {
    const weeks: { label: string; start: Date; end: Date }[] = [];
    let cursor = new Date(today);
    while (cursor <= endDate) {
      const weekEnd = addDays(cursor, 6) > endDate ? endDate : addDays(cursor, 6);
      weeks.push({
        label: `${format(cursor, 'dd/MM', { locale: ptBR })} - ${format(weekEnd, 'dd/MM', { locale: ptBR })}`,
        start: cursor,
        end: endOfDay(weekEnd),
      });
      cursor = addDays(weekEnd, 1);
    }

    return weeks.map(w => {
      const income = receivables
        .filter(r => isWithinInterval(parseISO(r.date), { start: w.start, end: w.end }))
        .reduce((s, r) => s + r.amount, 0);
      const expense = futurePayables
        .filter(p => isWithinInterval(parseISO(p.date), { start: w.start, end: w.end }))
        .reduce((s, p) => s + p.amount, 0);
      return { name: w.label, entradas: income, saidas: expense, saldo: income - expense };
    });
  }, [receivables, futurePayables, today, endDate]);

  const totalReceivables = receivables.reduce((s, r) => s + r.amount, 0);
  const totalPayables = futurePayables.reduce((s, p) => s + p.amount, 0);
  const netFlow = totalReceivables - totalPayables;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Fluxo de Caixa Projetado</h2>
          <p className="text-muted-foreground text-sm">Entradas e saídas futuras com base nos prazos de pagamento</p>
        </div>
        <Select value={horizon} onValueChange={setHorizon}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="15">15 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">A Receber</p>
                <p className="text-2xl font-bold text-green-600">{fmt(totalReceivables)}</p>
                <p className="text-xs text-muted-foreground">{receivables.length} parcelas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ArrowDownCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">A Pagar</p>
                <p className="text-2xl font-bold text-red-600">{fmt(totalPayables)}</p>
                <p className="text-xs text-muted-foreground">{futurePayables.length} contas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className={`w-8 h-8 ${netFlow >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <div>
                <p className="text-sm text-muted-foreground">Saldo Projetado</p>
                <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(netFlow)}</p>
                <Badge variant={netFlow >= 0 ? 'default' : 'destructive'} className="mt-1">
                  {netFlow >= 0 ? 'Positivo' : 'Negativo'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projeção Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">Sem dados para o período selecionado</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => fmt(value)} />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                <Bar dataKey="entradas" fill="hsl(142, 76%, 36%)" name="Entradas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" fill="hsl(0, 84%, 60%)" name="Saídas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detail tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-green-500" /> Próximas Entradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivables.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma entrada prevista</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {receivables.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 20).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-1">
                    <div>
                      <span className="font-medium">{r.label}</span>
                      <span className="text-muted-foreground ml-2">{format(parseISO(r.date), 'dd/MM/yyyy')}</span>
                    </div>
                    <span className="font-semibold text-green-600">{fmt(r.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-red-500" /> Próximas Saídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {futurePayables.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma saída prevista</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {futurePayables.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 20).map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-border pb-1">
                    <div>
                      <span className="font-medium">{p.label}</span>
                      <span className="text-muted-foreground ml-2">{format(parseISO(p.date), 'dd/MM/yyyy')}</span>
                    </div>
                    <span className="font-semibold text-red-600">{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
