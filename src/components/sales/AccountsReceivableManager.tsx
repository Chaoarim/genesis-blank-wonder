import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, AlertTriangle, CheckCircle, Clock, Search, MessageCircle, Filter, Download, Calendar } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { format, differenceInDays, parseISO, isAfter, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Sale, Customer } from '@/hooks/useSalesData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  sales: Sale[];
  customers: Customer[];
  onRefresh?: () => void;
}

type StatusFilter = 'all' | 'pending' | 'overdue' | 'paid';

export function AccountsReceivableManager({ sales, customers, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  // Receivables = sales with payment_deadline (credit sales)
  const receivables = useMemo(() => {
    return sales
      .filter(s => s.payment_deadline && s.status === 'completed')
      .map(s => {
        const deadline = parseISO(s.payment_deadline!);
        const now = new Date();
        const isPaid = !!s.paid_at;
        const isOverdue = !isPaid && isAfter(now, deadline);
        const daysOverdue = !isPaid ? differenceInDays(now, deadline) : 0;
        const customer = customers.find(c => c.id === s.customer_id);

        return {
          ...s,
          deadline,
          isPaid,
          isOverdue,
          daysOverdue,
          customerPhone: customer?.whatsapp || customer?.phone || null,
          status: isPaid ? 'paid' as const : isOverdue ? 'overdue' as const : 'pending' as const,
        };
      })
      .sort((a, b) => {
        // Overdue first, then pending, then paid
        const order = { overdue: 0, pending: 1, paid: 2 };
        return order[a.status] - order[b.status] || a.deadline.getTime() - b.deadline.getTime();
      });
  }, [sales, customers]);

  const filtered = useMemo(() => {
    return receivables.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (periodFilter !== 'all') {
        const now = new Date();
        const deadline = r.deadline;
        if (periodFilter === 'week') {
          if (deadline < startOfWeek(now, { weekStartsOn: 1 }) || deadline > endOfWeek(now, { weekStartsOn: 1 })) return false;
        } else if (periodFilter === 'month') {
          if (deadline < startOfMonth(now) || deadline > endOfMonth(now)) return false;
        } else if (periodFilter === 'last3') {
          if (deadline < subMonths(startOfMonth(now), 2) || deadline > endOfMonth(now)) return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        return (r.customer_name?.toLowerCase().includes(q) || r.id.includes(q));
      }
      return true;
    });
  }, [receivables, statusFilter, search, periodFilter]);

  const totals = useMemo(() => {
    const pending = receivables.filter(r => r.status === 'pending').reduce((s, r) => s + r.total, 0);
    const overdue = receivables.filter(r => r.status === 'overdue').reduce((s, r) => s + r.total, 0);
    const paid = receivables.filter(r => r.status === 'paid').reduce((s, r) => s + r.total, 0);
    return { pending, overdue, paid, total: pending + overdue + paid };
  }, [receivables]);

  const markAsPaid = async (saleId: string) => {
    const { error } = await supabase.from('sales').update({ paid_at: new Date().toISOString() }).eq('id', saleId);
    if (error) { toast.error('Erro ao registrar pagamento'); return; }
    toast.success('Pagamento registrado!');
    onRefresh?.();
  };

  const sendWhatsApp = (phone: string, customerName: string, total: number, deadline: Date) => {
    const msg = encodeURIComponent(
      `Olá ${customerName}! 🙂\n\nGostaríamos de lembrar sobre o pagamento no valor de R$ ${total.toFixed(2).replace('.', ',')} com vencimento em ${format(deadline, 'dd/MM/yyyy')}.\n\nQualquer dúvida, estamos à disposição!`
    );
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-primary" />
        Contas a Receber
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="text-lg font-bold text-amber-600">{fmt(totals.pending)}</p>
            <p className="text-[10px] text-muted-foreground">{receivables.filter(r => r.status === 'pending').length} títulos</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Vencido</p>
            <p className="text-lg font-bold text-destructive">{fmt(totals.overdue)}</p>
            <p className="text-[10px] text-muted-foreground">{receivables.filter(r => r.status === 'overdue').length} títulos</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Recebido</p>
            <p className="text-lg font-bold text-green-600">{fmt(totals.paid)}</p>
            <p className="text-[10px] text-muted-foreground">{receivables.filter(r => r.status === 'paid').length} títulos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Geral</p>
            <p className="text-lg font-bold">{fmt(totals.total)}</p>
            <p className="text-[10px] text-muted-foreground">{receivables.length} títulos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="overdue">Vencidos</SelectItem>
            <SelectItem value="paid">Recebidos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="last3">Últimos 3 meses</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
          exportToExcel(filtered.map(r => ({
            Cliente: r.customer_name || 'Consumidor',
            Vendedor: r.seller_name || '-',
            Pagamento: r.payment_method.replace(/_/g, ' '),
            Vencimento: format(r.deadline, 'dd/MM/yyyy'),
            Valor: r.total,
            Status: r.status === 'paid' ? 'Recebido' : r.status === 'overdue' ? 'Vencido' : 'Pendente',
            'Dias Atraso': r.daysOverdue > 0 ? r.daysOverdue : 0,
          })), 'contas-receber', 'Recebíveis');
        }}>
          <Download className="w-3.5 h-3.5" />
          Exportar
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhuma conta a receber encontrada.</p>
            <p className="text-xs mt-1">Vendas a prazo com data de vencimento aparecerão aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Método</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className={r.isOverdue ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">
                      <div>
                        <span className="text-sm">{r.customer_name || 'Consumidor'}</span>
                        {r.seller_name && <p className="text-[10px] text-muted-foreground">Vendedor: {r.seller_name}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs capitalize">{r.payment_method.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {format(r.deadline, 'dd/MM/yyyy')}
                        {r.isOverdue && (
                          <p className="text-destructive font-semibold">{r.daysOverdue}d atraso</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{fmt(r.total)}</TableCell>
                    <TableCell>
                      {r.status === 'paid' && <Badge variant="default" className="bg-green-600 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Recebido</Badge>}
                      {r.status === 'overdue' && <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Vencido</Badge>}
                      {r.status === 'pending' && <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!r.isPaid && (
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => markAsPaid(r.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Recebido
                          </Button>
                        )}
                        {r.customerPhone && !r.isPaid && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => sendWhatsApp(r.customerPhone!, r.customer_name || 'Cliente', r.total, r.deadline)} title="Cobrar via WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
