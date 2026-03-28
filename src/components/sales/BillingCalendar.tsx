import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DollarSign, Receipt, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Sale, Customer } from '@/hooks/useSalesData';

interface AccountPayable {
  id: string;
  supplier_name: string;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  description: string;
}

interface Props {
  sales: Sale[];
  customers: Customer[];
  payables: AccountPayable[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function BillingCalendar({ sales, customers, payables }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'receivable' | 'payable'>('all');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // Receivables (sales with payment_deadline)
  const receivables = useMemo(() => {
    return sales
      .filter(s => s.payment_deadline && s.status === 'completed')
      .map(s => {
        const deadline = parseISO(s.payment_deadline!);
        const isPaid = !!s.paid_at;
        const isOverdue = !isPaid && isAfter(new Date(), deadline);
        return {
          id: s.id,
          type: 'receivable' as const,
          date: deadline,
          amount: Number(s.total),
          label: s.customer_name || 'Cliente balcão',
          isPaid,
          isOverdue,
        };
      });
  }, [sales]);

  // Payables
  const payableItems = useMemo(() => {
    return payables.map(p => ({
      id: p.id,
      type: 'payable' as const,
      date: parseISO(p.due_date),
      amount: Number(p.amount),
      label: p.supplier_name,
      isPaid: p.status === 'paid',
      isOverdue: p.status !== 'paid' && isAfter(new Date(), parseISO(p.due_date)),
    }));
  }, [payables]);

  const allItems = useMemo(() => {
    let items = [...receivables, ...payableItems];
    if (filter === 'receivable') items = items.filter(i => i.type === 'receivable');
    if (filter === 'payable') items = items.filter(i => i.type === 'payable');
    return items;
  }, [receivables, payableItems, filter]);

  const getItemsForDay = (day: Date) => allItems.filter(i => isSameDay(i.date, day));

  // Summary for current month
  const monthItems = allItems.filter(i => i.date >= monthStart && i.date <= monthEnd);
  const totalReceivable = monthItems.filter(i => i.type === 'receivable' && !i.isPaid).reduce((s, i) => s + i.amount, 0);
  const totalPayable = monthItems.filter(i => i.type === 'payable' && !i.isPaid).reduce((s, i) => s + i.amount, 0);
  const totalOverdue = monthItems.filter(i => i.isOverdue).reduce((s, i) => s + i.amount, 0);

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Agenda de Cobranças</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">A Receber</span>
          </div>
          <p className="text-lg font-bold text-blue-600">{fmt(totalReceivable)}</p>
        </Card>
        <Card className="p-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">A Pagar</span>
          </div>
          <p className="text-lg font-bold text-amber-600">{fmt(totalPayable)}</p>
        </Card>
        <Card className="p-3 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Vencidos</span>
          </div>
          <p className="text-lg font-bold text-destructive">{fmt(totalOverdue)}</p>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h3 className="text-sm font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="receivable">A Receber</SelectItem>
              <SelectItem value="payable">A Pagar</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <Card className="p-2 overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[600px]">
          {/* Weekday headers */}
          {WEEKDAYS.map(d => (
            <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground border-b">
              {d}
            </div>
          ))}

          {/* Empty cells before month start */}
          {Array.from({ length: startDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} className="p-2 min-h-[80px] bg-muted/20 border-b border-r" />
          ))}

          {/* Day cells */}
          {daysInMonth.map(day => {
            const dayItems = getItemsForDay(day);
            const isToday = isSameDay(day, today);
            const hasOverdue = dayItems.some(i => i.isOverdue);

            return (
              <div
                key={day.toISOString()}
                className={`p-1.5 min-h-[80px] border-b border-r transition-colors ${
                  isToday ? 'bg-primary/5 ring-1 ring-primary/30' : ''
                } ${hasOverdue ? 'bg-destructive/5' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                  {dayItems.length > 0 && (
                    <span className="text-[9px] text-muted-foreground">{dayItems.length}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayItems.slice(0, 3).map(item => (
                    <div
                      key={item.id}
                      className={`rounded px-1 py-0.5 text-[9px] leading-tight truncate ${
                        item.isPaid
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 line-through opacity-60'
                          : item.isOverdue
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold'
                          : item.type === 'receivable'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                      title={`${item.label} — ${fmt(item.amount)}`}
                    >
                      {item.type === 'receivable' ? '↓' : '↑'} {item.label.slice(0, 12)}
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <p className="text-[8px] text-muted-foreground text-center">+{dayItems.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30" /> A Receber</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30" /> A Pagar</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" /> Vencido</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30 line-through" /> Pago</span>
      </div>
    </div>
  );
}
