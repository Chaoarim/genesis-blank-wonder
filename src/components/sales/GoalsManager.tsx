import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Target, Trophy } from 'lucide-react';
import type { SalesGoal } from '@/hooks/useSalesData';

interface GoalsManagerProps {
  goals: SalesGoal[];
  stats: {
    monthTotal: number;
    goalProgress: number;
    currentGoal: { goal_amount: number } | undefined;
  };
  onSetGoal: (month: number, year: number, amount: number) => Promise<void>;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function GoalsManager({ goals, stats, onSetGoal }: GoalsManagerProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState(stats.currentGoal ? Number(stats.currentGoal.goal_amount) : 0);

  const handleSave = () => {
    if (amount <= 0) return;
    onSetGoal(month, year, amount);
  };

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  return (
    <div className="space-y-6">
      {/* Current month progress */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-amber-500/5 border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {stats.goalProgress >= 100 ? <Trophy className="w-6 h-6 text-amber-500" /> : <Target className="w-6 h-6 text-primary" />}
          </div>
          <div>
            <h3 className="font-bold text-lg">
              {stats.goalProgress >= 100 ? '🎉 Meta Batida!' : `Meta de ${MONTHS[now.getMonth()]}`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {stats.currentGoal
                ? `${fmt(stats.monthTotal)} de ${fmt(Number(stats.currentGoal.goal_amount))}`
                : 'Defina sua meta abaixo'}
            </p>
          </div>
        </div>
        {stats.currentGoal && (
          <>
            <Progress value={stats.goalProgress} className="h-3 mb-2" />
            <p className="text-sm font-medium text-center">{stats.goalProgress.toFixed(1)}%</p>
          </>
        )}
      </Card>

      {/* Set goal */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Definir Meta</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Mês</label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Ano</label>
            <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Valor da meta (R$)</label>
          <Input type="number" min={0} step={100} value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value) || 0)} placeholder="Ex: 50000" />
        </div>
        <Button className="w-full" onClick={handleSave} disabled={amount <= 0}>
          <Target className="w-4 h-4 mr-2" /> Salvar Meta
        </Button>
      </Card>

      {/* Goal history */}
      {goals.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Histórico de Metas</h3>
          <div className="space-y-2">
            {goals.map(g => (
              <div key={g.id} className="flex items-center justify-between text-sm rounded-lg border border-border p-3">
                <span>{MONTHS[g.month - 1]} {g.year}</span>
                <span className="font-bold text-primary">{fmt(Number(g.goal_amount))}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
