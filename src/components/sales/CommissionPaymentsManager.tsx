import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Wallet, PlusCircle, DollarSign, CheckCircle, History, Users, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/exportExcel';
import type { Sale, SaleItem } from '@/hooks/useSalesData';

interface Commission {
  id: string;
  type: string;
  reference: string | null;
  commission_percent: number;
  commission_fixed: number;
  seller_auth_id: string | null;
  seller_name: string | null;
}

interface CommissionPayment {
  id: string;
  user_id: string;
  seller_auth_id: string;
  seller_name: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  total_commission: number;
  amount_paid: number;
  notes: string | null;
  paid_at: string;
  created_at: string;
}

interface Seller {
  id: string;
  name: string;
  seller_auth_id: string | null;
}

interface Props {
  userId: string;
  sales: Sale[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CommissionPaymentsManager({ userId, sales }: Props) {
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [saleItemsMap, setSaleItemsMap] = useState<Record<string, SaleItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterSeller, setFilterSeller] = useState('all');

  // Form state
  const [selectedSeller, setSelectedSeller] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: payData }, { data: commData }, { data: sellerData }] = await Promise.all([
      supabase.from('commission_payments').select('*').order('paid_at', { ascending: false }),
      supabase.from('sales_commissions').select('*').eq('user_id', userId),
      supabase.from('seller_users').select('id, name, seller_auth_id').eq('admin_user_id', userId).eq('is_active', true).order('name'),
    ]);
    setPayments((payData || []) as CommissionPayment[]);
    setCommissions((commData || []) as Commission[]);
    setSellers((sellerData || []) as Seller[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load sale items for commission calculation
  useEffect(() => {
    if (sales.length === 0) return;
    const ids = sales.filter(s => s.status === 'completed').map(s => s.id);
    if (ids.length === 0) return;
    const missing = ids.filter(id => !saleItemsMap[id]);
    if (missing.length === 0) return;

    const load = async () => {
      const { data } = await supabase.from('sale_items').select('*').in('sale_id', missing);
      if (data) {
        const grouped: Record<string, SaleItem[]> = { ...saleItemsMap };
        for (const item of data as SaleItem[]) {
          if (!grouped[item.sale_id]) grouped[item.sale_id] = [];
          grouped[item.sale_id].push(item);
        }
        setSaleItemsMap(grouped);
      }
    };
    load();
  }, [sales]);

  const calcCommission = useCallback((sale: Sale): number => {
    if (commissions.length === 0) return 0;
    let total = 0;
    const sellerAuthId = sale.seller_auth_id || null;

    const getApplicableRules = (type: string) => {
      const sellerRules = commissions.filter(c => c.type === type && c.seller_auth_id === sellerAuthId && sellerAuthId);
      const globalRules = commissions.filter(c => c.type === type && !c.seller_auth_id);
      return sellerRules.length > 0 ? sellerRules : globalRules;
    };

    const orderRules = getApplicableRules('order');
    for (const rule of orderRules) {
      total += Number(sale.total) * (Number(rule.commission_percent) / 100) + Number(rule.commission_fixed);
    }

    const items = saleItemsMap[sale.id] || [];
    const productRules = getApplicableRules('product');
    const supplierRules = getApplicableRules('supplier');

    for (const item of items) {
      const itemTotal = Number(item.quantidade) * Number(item.preco_unitario);
      for (const rule of productRules) {
        if (rule.reference && item.codigo.toLowerCase() === rule.reference.toLowerCase()) {
          total += itemTotal * (Number(rule.commission_percent) / 100) + Number(rule.commission_fixed);
        }
      }
      for (const rule of supplierRules) {
        if (rule.reference && item.fornecedor && item.fornecedor.toLowerCase().includes(rule.reference.toLowerCase())) {
          total += itemTotal * (Number(rule.commission_percent) / 100) + Number(rule.commission_fixed);
        }
      }
    }
    return total;
  }, [commissions, saleItemsMap]);

  // Calculate pending commissions per seller
  const pendingBySeller = useMemo(() => {
    const map = new Map<string, { sellerName: string; totalSales: number; totalAmount: number; commission: number; paidTotal: number }>();

    const completedSales = sales.filter(s => s.status === 'completed');
    for (const sale of completedSales) {
      const key = sale.seller_auth_id || '__admin__';
      const name = sale.seller_name || 'Administrador';
      const entry = map.get(key) || { sellerName: name, totalSales: 0, totalAmount: 0, commission: 0, paidTotal: 0 };
      entry.totalSales += 1;
      entry.totalAmount += Number(sale.total);
      entry.commission += calcCommission(sale);
      map.set(key, entry);
    }

    // Subtract already paid amounts
    for (const payment of payments) {
      const entry = map.get(payment.seller_auth_id);
      if (entry) entry.paidTotal += Number(payment.amount_paid);
    }

    return map;
  }, [sales, payments, calcCommission]);

  const handleOpenDialog = (sellerAuthId?: string) => {
    if (sellerAuthId) setSelectedSeller(sellerAuthId);
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setPeriodStart(firstDay.toISOString().slice(0, 10));
    setPeriodEnd(now.toISOString().slice(0, 10));
    setAmountPaid('');
    setNotes('');
    setDialogOpen(true);
  };

  const handlePay = async () => {
    if (!selectedSeller) { toast.error('Selecione um vendedor'); return; }
    if (!periodStart || !periodEnd) { toast.error('Informe o período'); return; }
    const amount = parseFloat(amountPaid);
    if (!amount || amount <= 0) { toast.error('Informe o valor pago'); return; }

    const seller = sellers.find(s => s.seller_auth_id === selectedSeller);
    const pending = pendingBySeller.get(selectedSeller);

    const { error } = await supabase.from('commission_payments').insert({
      user_id: userId,
      seller_auth_id: selectedSeller,
      seller_name: seller?.name || pending?.sellerName || 'Vendedor',
      period_start: periodStart,
      period_end: periodEnd,
      total_sales: pending?.totalAmount || 0,
      total_commission: pending?.commission || 0,
      amount_paid: amount,
      notes: notes || null,
    });

    if (error) { toast.error('Erro ao registrar pagamento'); return; }
    toast.success('Pagamento de comissão registrado!');
    setDialogOpen(false);
    fetchData();
  };

  const handleExportExcel = () => {
    const rows = filteredPayments.map((p, idx) => ({
      '#': idx + 1,
      'Vendedor': p.seller_name,
      'Período Início': new Date(p.period_start).toLocaleDateString('pt-BR'),
      'Período Fim': new Date(p.period_end).toLocaleDateString('pt-BR'),
      'Total Vendas (R$)': Number(Number(p.total_sales).toFixed(2)),
      'Comissão Calculada (R$)': Number(Number(p.total_commission).toFixed(2)),
      'Valor Pago (R$)': Number(Number(p.amount_paid).toFixed(2)),
      'Data Pagamento': new Date(p.paid_at).toLocaleDateString('pt-BR'),
      'Observações': p.notes || '',
    }));
    exportToExcel(rows, `Pagamentos_Comissoes_${new Date().toISOString().slice(0, 10)}`, 'Pagamentos');
  };

  const filteredPayments = filterSeller === 'all'
    ? payments
    : payments.filter(p => p.seller_auth_id === filterSeller);

  const totalPaid = filteredPayments.reduce((s, p) => s + Number(p.amount_paid), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Controle de Comissões Pagas
          </h2>
          <p className="text-sm text-muted-foreground">Registre pagamentos e acompanhe o histórico</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredPayments.length === 0}>
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="w-4 h-4 mr-2" /> Registrar Pagamento
          </Button>
        </div>
      </div>

      {/* Pending commissions summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from(pendingBySeller.entries())
          .filter(([key]) => key !== '__admin__')
          .map(([key, data]) => {
            const pending = Math.max(0, data.commission - data.paidTotal);
            return (
              <Card key={key} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{data.sellerName}</span>
                    </div>
                    {pending > 0 && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                        Pendente
                      </Badge>
                    )}
                    {pending <= 0 && data.commission > 0 && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]">
                        <CheckCircle className="w-3 h-3 mr-0.5" /> Quitado
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div>
                      <p className="text-muted-foreground">Comissão</p>
                      <p className="font-semibold">{fmt(data.commission)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pago</p>
                      <p className="font-semibold text-green-600">{fmt(data.paidTotal)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pendente</p>
                      <p className="font-semibold text-amber-600">{fmt(pending)}</p>
                    </div>
                  </div>
                  {pending > 0 && (
                    <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => {
                      setAmountPaid(pending.toFixed(2));
                      handleOpenDialog(key);
                    }}>
                      <DollarSign className="w-3.5 h-3.5" /> Pagar {fmt(pending)}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        {Array.from(pendingBySeller.entries()).filter(([k]) => k !== '__admin__').length === 0 && (
          <Card className="col-span-full p-6 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum vendedor com comissões no período</p>
          </Card>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Pagamentos</span>
          </div>
          <p className="text-2xl font-bold">{filteredPayments.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Total Pago</span>
          </div>
          <p className="text-2xl font-bold">{fmt(totalPaid)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Vendedores</span>
          </div>
          <p className="text-2xl font-bold">{new Set(payments.map(p => p.seller_auth_id)).size}</p>
        </Card>
      </div>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
            <Select value={filterSeller} onValueChange={setFilterSeller}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {sellers.map(s => (
                  <SelectItem key={s.seller_auth_id || s.id} value={s.seller_auth_id || s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum pagamento registrado</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {filteredPayments.map(p => (
                  <div key={p.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{p.seller_name}</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        {fmt(Number(p.amount_paid))}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <p>Período</p>
                        <p className="text-foreground">{new Date(p.period_start).toLocaleDateString('pt-BR')} — {new Date(p.period_end).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div>
                        <p>Pago em</p>
                        <p className="text-foreground">{new Date(p.paid_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    {p.notes && <p className="text-xs text-muted-foreground italic">{p.notes}</p>}
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead className="text-right">Vendas</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-right">Valor Pago</TableHead>
                      <TableHead>Data Pgto</TableHead>
                      <TableHead>Obs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.seller_name}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(p.period_start).toLocaleDateString('pt-BR')} — {new Date(p.period_end).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">{fmt(Number(p.total_sales))}</TableCell>
                        <TableCell className="text-right">{fmt(Number(p.total_commission))}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{fmt(Number(p.amount_paid))}</TableCell>
                        <TableCell>{new Date(p.paid_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{p.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Registrar Pagamento de Comissão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendedor</Label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map(s => (
                    <SelectItem key={s.seller_auth_id || s.id} value={s.seller_auth_id || s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início do período</Label>
                <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
              </div>
              <div>
                <Label>Fim do período</Label>
                <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Valor Pago (R$)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea placeholder="Ex: Referente a comissões de março/2026" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePay}>
              <CheckCircle className="w-4 h-4 mr-2" /> Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
