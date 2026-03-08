import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PlusCircle, Search, Filter, CheckCircle2, Clock, AlertTriangle, Trash2, Edit, Receipt, Barcode, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { format, isPast, isToday, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AccountPayable {
  id: string;
  supplier_name: string;
  document_number: string;
  description: string;
  category: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  paid_amount: number;
  status: string;
  notes: string | null;
  barcode: string | null;
  created_at: string;
}

// Suppliers will be loaded from user's inventory

const CATEGORIES = [
  { value: 'boleto', label: 'Boleto Bancário' },
  { value: 'nf', label: 'Nota Fiscal' },
  { value: 'duplicata', label: 'Duplicata' },
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outros', label: 'Outros' },
];

const INITIAL_FORM = {
  supplier_name: '',
  document_number: '',
  description: '',
  category: 'boleto',
  amount: '',
  due_date: '',
  notes: '',
  barcode: '',
  installments: 1,
  installment_dates: [''] as string[],
};

export function AccountsPayableManager({ userId }: { userId: string }) {
  const [bills, setBills] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [newSupplier, setNewSupplier] = useState('');
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);

  const fetchBills = useCallback(async () => {
    const { data } = await supabase
      .from('accounts_payable')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });
    setBills((data as any[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const fetchSuppliers = useCallback(async () => {
    const { data } = await supabase
      .from('payable_suppliers')
      .select('name')
      .eq('user_id', userId)
      .order('name');
    if (data) setSuppliers(data.map(d => d.name));
  }, [userId]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleAddSupplier = async () => {
    if (!newSupplier.trim()) return;
    const { error } = await supabase.from('payable_suppliers').insert({ user_id: userId, name: newSupplier.trim() });
    if (error) {
      if (error.code === '23505') toast.error('Fornecedor já cadastrado');
      else toast.error('Erro ao cadastrar fornecedor');
      return;
    }
    toast.success('Fornecedor cadastrado!');
    setNewSupplier('');
    fetchSuppliers();
  };

  const handleDeleteSupplier = async (name: string) => {
    await supabase.from('payable_suppliers').delete().eq('user_id', userId).eq('name', name);
    toast.success('Fornecedor removido');
    fetchSuppliers();
  };

  const handleSave = async () => {
    const numInstallments = form.installments;
    
    if (!form.supplier_name || !form.amount) {
      toast.error('Preencha fornecedor e valor');
      return;
    }

    if (numInstallments === 1) {
      if (!form.due_date) {
        toast.error('Preencha o vencimento');
        return;
      }
      const payload = {
        user_id: userId,
        supplier_name: form.supplier_name,
        document_number: form.document_number,
        description: form.description,
        category: form.category,
        amount: Number(form.amount),
        due_date: form.due_date,
        notes: form.notes || null,
        barcode: form.barcode || null,
      };

      if (editingId) {
        const { error } = await supabase.from('accounts_payable').update(payload).eq('id', editingId);
        if (error) { toast.error('Erro ao atualizar'); return; }
        toast.success('Conta atualizada!');
      } else {
        const { error } = await supabase.from('accounts_payable').insert(payload);
        if (error) { toast.error('Erro ao criar'); return; }
        toast.success('Conta cadastrada!');
      }
    } else {
      // Multiple installments - validate all dates
      const dates = form.installment_dates.slice(0, numInstallments);
      if (dates.some(d => !d)) {
        toast.error('Preencha todos os vencimentos das parcelas');
        return;
      }

      const totalAmount = Number(form.amount);
      const installmentAmount = Math.round((totalAmount / numInstallments) * 100) / 100;
      const lastInstallmentAmount = Math.round((totalAmount - installmentAmount * (numInstallments - 1)) * 100) / 100;

      const payloads = dates.map((date, i) => ({
        user_id: userId,
        supplier_name: form.supplier_name,
        document_number: form.document_number ? `${form.document_number} (${i + 1}/${numInstallments})` : '',
        description: form.description ? `${form.description} - Parcela ${i + 1}/${numInstallments}` : `Parcela ${i + 1}/${numInstallments}`,
        category: form.category,
        amount: i === numInstallments - 1 ? lastInstallmentAmount : installmentAmount,
        due_date: date,
        notes: form.notes || null,
        barcode: i === 0 ? (form.barcode || null) : null,
      }));

      const { error } = await supabase.from('accounts_payable').insert(payloads);
      if (error) { toast.error('Erro ao criar parcelas'); return; }
      toast.success(`${numInstallments} parcelas cadastradas!`);
    }

    setForm(INITIAL_FORM);
    setEditingId(null);
    setDialogOpen(false);
    fetchBills();
  };

  const handlePay = async (bill: AccountPayable) => {
    await supabase.from('accounts_payable').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_amount: bill.amount,
    }).eq('id', bill.id);
    toast.success('Marcado como pago!');
    fetchBills();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('accounts_payable').delete().eq('id', id);
    toast.success('Removido');
    fetchBills();
  };

  const startEdit = (bill: AccountPayable) => {
    setForm({
      supplier_name: bill.supplier_name,
      document_number: bill.document_number,
      description: bill.description,
      category: bill.category,
      amount: String(bill.amount),
      due_date: bill.due_date,
      notes: bill.notes || '',
      barcode: bill.barcode || '',
      installments: 1,
      installment_dates: [''],
    });
    setEditingId(bill.id);
    setDialogOpen(true);
  };

  // Stats
  const pending = bills.filter(b => b.status === 'pending');
  const overdue = pending.filter(b => isPast(new Date(b.due_date)) && !isToday(new Date(b.due_date)));
  const dueThisWeek = pending.filter(b => {
    const d = new Date(b.due_date);
    return differenceInDays(d, new Date()) >= 0 && differenceInDays(d, new Date()) <= 7;
  });
  const totalPending = pending.reduce((s, b) => s + Number(b.amount), 0);
  const totalOverdue = overdue.reduce((s, b) => s + Number(b.amount), 0);
  const totalPaidMonth = bills.filter(b => b.status === 'paid' && b.paid_at && new Date(b.paid_at).getMonth() === new Date().getMonth()).reduce((s, b) => s + Number(b.paid_amount), 0);

  // Filtered
  const filtered = bills.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.supplier_name.toLowerCase().includes(q) || b.document_number.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusBadge = (bill: AccountPayable) => {
    if (bill.status === 'paid') return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" />Pago</Badge>;
    if (isPast(new Date(bill.due_date)) && !isToday(new Date(bill.due_date))) return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Vencido</Badge>;
    if (differenceInDays(new Date(bill.due_date), new Date()) <= 3) return <Badge className="bg-amber-500/15 text-amber-600 border-amber-200"><Clock className="w-3 h-3 mr-1" />Vence em breve</Badge>;
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencidas</p>
              <p className="text-lg font-bold text-destructive">{fmt(totalOverdue)}</p>
              <p className="text-[10px] text-muted-foreground">{overdue.length} títulos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vence em 7 dias</p>
              <p className="text-lg font-bold">{fmt(dueThisWeek.reduce((s, b) => s + Number(b.amount), 0))}</p>
              <p className="text-[10px] text-muted-foreground">{dueThisWeek.length} títulos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pendente</p>
              <p className="text-lg font-bold">{fmt(totalPending)}</p>
              <p className="text-[10px] text-muted-foreground">{pending.length} títulos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pago este mês</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(totalPaidMonth)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" />Contas a Pagar</CardTitle>
              <CardDescription>Gerencie boletos e títulos de fornecedores</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm(INITIAL_FORM); setEditingId(null); } }}>
              <DialogTrigger asChild>
                <Button size="sm"><PlusCircle className="w-4 h-4 mr-1" />Nova Conta</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Editar Conta' : 'Nova Conta a Pagar'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Fornecedor *</Label>
                    <div className="flex gap-2">
                      <Select value={form.supplier_name} onValueChange={v => setForm(f => ({ ...f, supplier_name: v }))}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" size="icon" title="Gerenciar fornecedores"><PlusCircle className="w-4 h-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                          <DialogHeader><DialogTitle>Gerenciar Fornecedores</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Input value={newSupplier} onChange={e => setNewSupplier(e.target.value)} placeholder="Nome do fornecedor" onKeyDown={e => e.key === 'Enter' && handleAddSupplier()} />
                              <Button onClick={handleAddSupplier} size="sm">Adicionar</Button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {suppliers.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Nenhum fornecedor cadastrado</p>}
                              {suppliers.map(s => (
                                <div key={s} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted">
                                  <span className="text-sm">{s}</span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSupplier(s)}><Trash2 className="w-3 h-3" /></Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Categoria</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nº Documento</Label>
                      <Input value={form.document_number} onChange={e => setForm(f => ({ ...f, document_number: e.target.value }))} placeholder="Ex: NF-12345" />
                    </div>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Lote pastilhas de freio Fras-le" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor Total (R$) *</Label>
                      <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0,00" />
                    </div>
                    {!editingId && (
                      <div>
                        <Label>Nº de Parcelas</Label>
                        <Select value={String(form.installments)} onValueChange={v => {
                          const num = Number(v);
                          setForm(f => ({
                            ...f,
                            installments: num,
                            installment_dates: Array.from({ length: num }, (_, i) => f.installment_dates[i] || ''),
                          }));
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                              <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {form.installments === 1 ? (
                    <div>
                      <Label>Vencimento *</Label>
                      <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Vencimentos das Parcelas *</Label>
                      {form.amount && (
                        <p className="text-xs text-muted-foreground">
                          Valor por parcela: {fmt(Math.round((Number(form.amount) / form.installments) * 100) / 100)}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: form.installments }, (_, i) => (
                          <div key={i}>
                            <Label className="text-xs text-muted-foreground">{i + 1}ª Parcela</Label>
                            <Input
                              type="date"
                              value={form.installment_dates[i] || ''}
                              onChange={e => {
                                const dates = [...form.installment_dates];
                                dates[i] = e.target.value;
                                setForm(f => ({ ...f, installment_dates: dates }));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="flex items-center gap-1"><Barcode className="w-3 h-3" />Código de Barras</Label>
                    <Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="Linha digitável do boleto" />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Anotações adicionais..." />
                  </div>
                  <Button onClick={handleSave} className="w-full">{editingId ? 'Salvar Alterações' : 'Cadastrar Conta'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar fornecedor, documento..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma conta encontrada</p>
              <p className="text-xs mt-1">Cadastre boletos e títulos de fornecedores</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(bill => (
                    <TableRow key={bill.id} className={bill.status === 'pending' && isPast(new Date(bill.due_date)) && !isToday(new Date(bill.due_date)) ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-medium max-w-[150px] truncate">{bill.supplier_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{bill.document_number || '-'}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm">{bill.description || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(Number(bill.amount))}</TableCell>
                      <TableCell className="text-sm">{format(new Date(bill.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(bill)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {bill.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handlePay(bill)} title="Marcar como pago">
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(bill)} title="Editar">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(bill.id)} title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
