import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DollarSign, AlertTriangle, CheckCircle, Clock, Search, MessageCircle, Filter, Download, Calendar, Send, Users } from 'lucide-react';
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

interface Receivable extends Sale {
  deadline: Date;
  isPaid: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  customerPhone: string | null;
  status: 'paid' | 'overdue' | 'pending';
}

function buildCollectionMessage(customerName: string, total: number, deadline: Date, isOverdue: boolean, daysOverdue: number, saleId: string): string {
  const valor = `R$ ${total.toFixed(2).replace('.', ',')}`;
  const vencimento = format(deadline, 'dd/MM/yyyy');

  if (isOverdue) {
    return `Olá ${customerName}! 🙂

Verificamos que o pagamento referente à venda *#${saleId.slice(0, 8)}* no valor de *${valor}* venceu em *${vencimento}* (${daysOverdue} dia${daysOverdue > 1 ? 's' : ''} atrás).

Gostaríamos de verificar se houve algum problema. Caso já tenha efetuado o pagamento, por favor desconsidere esta mensagem.

Ficamos à disposição para qualquer dúvida! 🤝`;
  }

  return `Olá ${customerName}! 🙂

Passando para lembrar sobre o pagamento referente à venda *#${saleId.slice(0, 8)}* no valor de *${valor}* com vencimento em *${vencimento}*.

Qualquer dúvida, estamos à disposição! 🤝`;
}

export function AccountsReceivableManager({ sales, customers, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [messageDialog, setMessageDialog] = useState<{ receivable: Receivable; message: string } | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  const receivables = useMemo<Receivable[]>(() => {
    return sales
      .filter(s => s.payment_deadline && s.status === 'completed')
      .map(s => {
        const deadline = parseISO(s.payment_deadline!);
        const now = new Date();
        const isPaid = !!s.paid_at;
        const isOverdue = !isPaid && isAfter(now, deadline);
        const daysOverdue = !isPaid ? Math.max(differenceInDays(now, deadline), 0) : 0;
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

  const overdueWithPhone = useMemo(() =>
    receivables.filter(r => r.status === 'overdue' && r.customerPhone),
  [receivables]);

  const markAsPaid = async (saleId: string) => {
    const { error } = await supabase.from('sales').update({ paid_at: new Date().toISOString() }).eq('id', saleId);
    if (error) { toast.error('Erro ao registrar pagamento'); return; }
    toast.success('Pagamento registrado!');
    onRefresh?.();
  };

  const openMessagePreview = (r: Receivable) => {
    const msg = buildCollectionMessage(
      r.customer_name || 'Cliente',
      r.total,
      r.deadline,
      r.isOverdue,
      r.daysOverdue,
      r.id
    );
    setMessageDialog({ receivable: r, message: msg });
  };

  const sendWhatsAppMessage = (phone: string | null, message: string) => {
    const encoded = encodeURIComponent(message);
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  const handleBatchSend = () => {
    if (overdueWithPhone.length === 0) {
      toast.info('Nenhum cliente vencido com telefone cadastrado');
      return;
    }

    let sent = 0;
    for (const r of overdueWithPhone) {
      const msg = buildCollectionMessage(r.customer_name || 'Cliente', r.total, r.deadline, true, r.daysOverdue, r.id);
      const cleanPhone = r.customerPhone!.replace(/\D/g, '');
      const encoded = encodeURIComponent(msg);
      // Open first one immediately, rest after small delay
      setTimeout(() => {
        window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
      }, sent * 1500);
      sent++;
    }

    toast.success(`${sent} cobrança${sent > 1 ? 's' : ''} aberta${sent > 1 ? 's' : ''} no WhatsApp`);
    setBatchDialogOpen(false);
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Contas a Receber
        </h2>
        {overdueWithPhone.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs border-green-600/30 text-green-700 dark:text-green-400 hover:bg-green-500/10"
            onClick={() => setBatchDialogOpen(true)}
          >
            <Users className="w-3.5 h-3.5" />
            Cobrar {overdueWithPhone.length} vencido{overdueWithPhone.length > 1 ? 's' : ''} via WhatsApp
          </Button>
        )}
      </div>

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
                        {r.customerPhone && <p className="text-[10px] text-muted-foreground">📱 {r.customerPhone}</p>}
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
                        {!r.isPaid && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            onClick={() => openMessagePreview(r)}
                            title="Cobrar via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Cobrar</span>
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

      {/* Message Preview Dialog */}
      {messageDialog && (
        <Dialog open onOpenChange={() => setMessageDialog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                Mensagem de Cobrança
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{messageDialog.receivable.customer_name || 'Cliente'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-bold text-destructive">{fmt(messageDialog.receivable.total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vencimento:</span>
                <span>{format(messageDialog.receivable.deadline, 'dd/MM/yyyy')}</span>
              </div>
              {messageDialog.receivable.daysOverdue > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Atraso:</span>
                  <Badge variant="destructive" className="text-xs">{messageDialog.receivable.daysOverdue} dias</Badge>
                </div>
              )}

              <div>
                <Label className="text-xs">Prévia da mensagem (editável)</Label>
                <Textarea
                  value={messageDialog.message}
                  onChange={e => setMessageDialog(prev => prev ? { ...prev, message: e.target.value } : null)}
                  rows={8}
                  className="mt-1 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    sendWhatsAppMessage(messageDialog.receivable.customerPhone, messageDialog.message);
                    setMessageDialog(null);
                  }}
                >
                  <Send className="w-4 h-4" />
                  {messageDialog.receivable.customerPhone ? 'Enviar via WhatsApp' : 'Abrir WhatsApp'}
                </Button>
                <Button variant="outline" onClick={() => setMessageDialog(null)}>
                  Cancelar
                </Button>
              </div>

              {!messageDialog.receivable.customerPhone && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Cliente sem telefone cadastrado. O WhatsApp abrirá sem destinatário.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Batch Send Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" />
              Cobrança em Lote via WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Serão abertas {overdueWithPhone.length} conversas no WhatsApp com mensagens de cobrança personalizadas para cada cliente vencido.
            </p>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {overdueWithPhone.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{r.customer_name || 'Cliente'}</p>
                    <p className="text-[10px] text-muted-foreground">{r.daysOverdue}d atraso • 📱 {r.customerPhone}</p>
                  </div>
                  <span className="font-bold text-destructive text-sm">{fmt(r.total)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm font-medium border-t pt-3">
              <span>Total a cobrar:</span>
              <span className="text-destructive">{fmt(overdueWithPhone.reduce((s, r) => s + r.total, 0))}</span>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleBatchSend}
              >
                <Send className="w-4 h-4" />
                Cobrar todos ({overdueWithPhone.length})
              </Button>
              <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
                Cancelar
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              💡 As conversas serão abertas com intervalo de 1,5s entre cada para evitar bloqueios.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
