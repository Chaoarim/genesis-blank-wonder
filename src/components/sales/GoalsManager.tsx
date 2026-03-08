import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Trophy, Trash2, Users } from 'lucide-react';
import type { SalesGoal, Sale } from '@/hooks/useSalesData';
import type { SellerUser } from '@/hooks/useSellerPermissions';

interface GoalsManagerProps {
  goals: SalesGoal[];
  stats: {
    monthTotal: number;
    goalProgress: number;
    currentGoal: { goal_amount: number } | undefined;
  };
  onSetGoal: (month: number, year: number, amount: number, sellerAuthId?: string | null) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  isAdmin?: boolean;
  sellers?: SellerUser[];
  sales?: Sale[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function GoalsManager({ goals, stats, onSetGoal, onDeleteGoal, isAdmin, sellers, sales }: GoalsManagerProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState(stats.currentGoal ? Number(stats.currentGoal.goal_amount) : 0);
  const [selectedSeller, setSelectedSeller] = useState<string>('global');

  const handleSave = () => {
    if (amount <= 0) return;
    const sellerAuthId = selectedSeller === 'global' ? null : selectedSeller;
    onSetGoal(month, year, amount, sellerAuthId);
  };

  const getSellerName = (sellerAuthId: string | null | undefined) => {
    if (!sellerAuthId || !sellers) return 'Geral (Loja)';
    return sellers.find(s => s.seller_auth_id === sellerAuthId)?.name || 'Vendedor';
  };

  // Calculate seller-specific progress for admin view
  const getSellerGoalProgress = (goal: SalesGoal & { seller_auth_id?: string | null }) => {
    if (!sales) return 0;
    const goalMonth = goal.month;
    const goalYear = goal.year;
    const sellerSales = sales.filter(s => {
      if (s.status !== 'completed') return false;
      const d = new Date(s.created_at);
      if (d.getMonth() + 1 !== goalMonth || d.getFullYear() !== goalYear) return false;
      if (goal.seller_auth_id) return s.seller_auth_id === goal.seller_auth_id;
      return true;
    });
    const total = sellerSales.reduce((sum, s) => sum + Number(s.total), 0);
    return Math.min((total / Number(goal.goal_amount)) * 100, 100);
  };

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
        {isAdmin && sellers && sellers.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground">Vendedor</label>
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Geral (Loja)</SelectItem>
                {sellers.filter(s => s.seller_auth_id).map(s => (
                  <SelectItem key={s.id} value={s.seller_auth_id!}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
            {goals.map(g => {
              const gAny = g as any;
              const progress = isAdmin && sales ? getSellerGoalProgress(gAny) : null;
              return (
                <div key={g.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{MONTHS[g.month - 1]} {g.year}</span>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Users className="w-3 h-3" />
                          {getSellerName(gAny.seller_auth_id)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{fmt(Number(g.goal_amount))}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteGoal(g.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {progress !== null && (
                    <div>
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right mt-1">{progress.toFixed(1)}%</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// Need to import Badge
import { Badge } from '@/components/ui/badge';
