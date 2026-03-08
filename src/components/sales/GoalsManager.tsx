import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Target, Trophy, Trash2, Users, CalendarDays } from 'lucide-react';
import type { SalesGoal, Sale } from '@/hooks/useSalesData';
import type { SellerUser } from '@/hooks/useSellerPermissions';

interface GoalsManagerProps {
  goals: SalesGoal[];
  stats: {
    monthTotal: number;
    goalProgress: number;
    currentGoal: { goal_amount: number } | undefined;
    storeGoal?: { goal_amount: number } | undefined;
    storeMonthTotal?: number;
    storeGoalProgress?: number;
  };
  onSetGoal: (month: number, year: number, amount: number, sellerAuthId?: string | null) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  isAdmin?: boolean;
  sellers?: SellerUser[];
  sales?: Sale[];
  sellerAuthId?: string | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parseGoalAmountInput = (raw: string) => {
  const sanitized = raw.replace(/\s/g, '').replace(/[^\d.,]/g, '');
  if (!sanitized) return 0;

  if (sanitized.includes(',') && sanitized.includes('.')) {
    return Number(sanitized.replace(/\./g, '').replace(',', '.')) || 0;
  }

  if (sanitized.includes(',')) {
    return Number(sanitized.replace(/\./g, '').replace(',', '.')) || 0;
  }

  if (sanitized.includes('.')) {
    const parts = sanitized.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      return Number(sanitized.replace(/\./g, '')) || 0;
    }
  }

  return Number(sanitized) || 0;
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function GoalsManager({ goals, stats, onSetGoal, onDeleteGoal, isAdmin, sellers, sales, sellerAuthId }: GoalsManagerProps) {
  const now = new Date();
  const initialAmount = stats.currentGoal ? Number(stats.currentGoal.goal_amount) : 0;
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState(initialAmount);
  const [amountInput, setAmountInput] = useState(initialAmount ? initialAmount.toLocaleString('pt-BR') : '');
  const [selectedSeller, setSelectedSeller] = useState<string>('global');

  // Filter goals: sellers see their own goals + global (store) goals
  const visibleGoals = !isAdmin && sellerAuthId
    ? goals.filter(g => g.seller_auth_id === sellerAuthId || !g.seller_auth_id)
    : goals;
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
  const getSellerGoalProgress = (goal: SalesGoal) => {
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

      {/* Store goal - always visible */}
      {stats.storeGoal && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold">Meta da Loja</span>
            </div>
            <span className="text-sm font-bold text-primary">{(stats.storeGoalProgress ?? 0).toFixed(1)}%</span>
          </div>
          <Progress value={stats.storeGoalProgress ?? 0} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground text-right">
            {fmt(stats.storeMonthTotal ?? 0)} de {fmt(Number(stats.storeGoal.goal_amount))}
          </p>
        </Card>
      )}

      {/* Set goal - only for admin */}
      {isAdmin && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Definir Meta</h3>
          {sellers && sellers.length > 0 && (
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
            <Input
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={e => {
                const nextInput = e.target.value;
                setAmountInput(nextInput);
                setAmount(parseGoalAmountInput(nextInput));
              }}
              placeholder="Ex: 100.000"
            />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={amount <= 0}>
            <Target className="w-4 h-4 mr-2" /> Salvar Meta
          </Button>
        </Card>
      )}

      {/* Goal history */}
      {visibleGoals.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Histórico de Metas</h3>
          <div className="space-y-2">
            {visibleGoals.map(g => {
              const progress = sales ? getSellerGoalProgress(g) : null;
              return (
                <div key={g.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{MONTHS[g.month - 1]} {g.year}</span>
                      {isAdmin && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                         <Users className="w-3 h-3" />
                          {getSellerName(g.seller_auth_id)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{fmt(Number(g.goal_amount))}</span>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteGoal(g.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
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
