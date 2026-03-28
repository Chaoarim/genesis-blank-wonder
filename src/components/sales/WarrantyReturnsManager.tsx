import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ListSkeleton } from './ListSkeleton';
import { toast } from 'sonner';
import { ShieldCheck, RotateCcw, Plus, CheckCircle, XCircle, Clock, Eye, Printer, Download } from 'lucide-react';
import { printHtml, downloadHtmlAsPdf } from '@/lib/htmlToPdf';
import type { Customer, Sale, SaleItem } from '@/hooks/useSalesData';

interface WarrantyReturn {
  id: string;
  user_id: string;
  sale_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  type: 'warranty' | 'return';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason: string | null;
  items: any[];
  total_value: number;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface Props {
  userId: string;
  customers: Customer[];
  sales: Sale[];
  getSaleItems: (saleId: string) => Promise<SaleItem[]>;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Aprovado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle },
};

export function WarrantyReturnsManager({ userId, customers, sales, getSaleItems }: Props) {
  const [records, setRecords] = useState<WarrantyReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [detailRecord, setDetailRecord] = useState<WarrantyReturn | null>(null);
  const [filter, setFilter] = useState<'all' | 'warranty' | 'return'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New form state
  const [formType, setFormType] = useState<'warranty' | 'return'>('return');
  const [formSaleId, setFormSaleId] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formItems, setFormItems] = useState<any[]>([]);
  const [formResolution, setFormResolution] = useState('');
  const [loadingSaleItems, setLoadingSaleItems] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('warranty_returns')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRecords(data as any[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleLoadSaleItems = async (saleId: string) => {
    setFormSaleId(saleId);
    if (!saleId) { setFormItems([]); return; }
    setLoadingSaleItems(true);
    const items = await getSaleItems(saleId);
    setFormItems(items.map(i => ({ ...i, selected: true })));
    const sale = sales.find(s => s.id === saleId);
    if (sale?.customer_id) setFormCustomerId(sale.customer_id);
    setLoadingSaleItems(false);
  };

  const handleCreate = async () => {
    if (!formReason.trim()) { toast.error('Informe o motivo'); return; }
    const selectedItems = formItems.filter(i => i.selected);
    if (selectedItems.length === 0) { toast.error('Selecione ao menos 1 item'); return; }

    const totalValue = selectedItems.reduce((s: number, i: any) => s + (i.quantidade * i.preco_unitario), 0);
    const customer = customers.find(c => c.id === formCustomerId);

    const { error } = await supabase.from('warranty_returns').insert({
      user_id: userId,
      sale_id: formSaleId || null,
      customer_id: formCustomerId || null,
      customer_name: customer?.name || null,
      type: formType,
      reason: formReason,
      items: selectedItems.map(i => ({ codigo: i.codigo, produto: i.produto, quantidade: i.quantidade, preco_unitario: Number(i.preco_unitario) })),
      total_value: totalValue,
    });

    if (error) { toast.error('Erro ao registrar'); return; }
    toast.success(`${formType === 'warranty' ? 'Garantia' : 'Devolução'} registrada!`);
    setShowNew(false);
    resetForm();
    fetchRecords();
  };

  const resetForm = () => {
    setFormType('return');
    setFormSaleId('');
    setFormCustomerId('');
    setFormReason('');
    setFormItems([]);
    setFormResolution('');
  };

  const handleUpdateStatus = async (id: string, status: string, resolution?: string) => {
    const update: any = { status, updated_at: new Date().toISOString() };
    if (status === 'completed' || status === 'rejected') update.resolved_at = new Date().toISOString();
    if (resolution) update.resolution = resolution;

    const { error } = await supabase.from('warranty_returns').update(update).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    toast.success('Status atualizado!');
    fetchRecords();
    setDetailRecord(null);
  };

  const filtered = records.filter(r => {
    if (filter !== 'all' && r.type !== filter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const buildPrintHtml = (r: WarrantyReturn) => {
    const items = (r.items || []) as any[];
    return `
      <div style="font-family:Arial;max-width:600px;margin:auto;padding:20px">
        <h2 style="text-align:center">${r.type === 'warranty' ? '📋 Garantia' : '🔄 Devolução'} #${r.id.slice(0, 8)}</h2>
        <p><strong>Cliente:</strong> ${r.customer_name || '—'}</p>
        <p><strong>Status:</strong> ${STATUS_MAP[r.status]?.label}</p>
        <p><strong>Data:</strong> ${new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
        <p><strong>Motivo:</strong> ${r.reason || '—'}</p>
        ${r.resolution ? `<p><strong>Resolução:</strong> ${r.resolution}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;margin-top:10px">
          <thead><tr style="border-bottom:2px solid #333">
            <th style="text-align:left;padding:6px">Produto</th>
            <th style="text-align:right;padding:6px">Qtd</th>
            <th style="text-align:right;padding:6px">Valor</th>
          </tr></thead>
          <tbody>
            ${items.map(i => `<tr style="border-bottom:1px solid #eee"><td style="padding:6px">${i.produto}</td><td style="text-align:right;padding:6px">${i.quantidade}</td><td style="text-align:right;padding:6px">R$ ${(i.quantidade * i.preco_unitario).toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>
        <p style="text-align:right;font-size:18px;margin-top:10px"><strong>Total: R$ ${Number(r.total_value).toFixed(2)}</strong></p>
      </div>
    `;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Garantias & Devoluções</h2>
        </div>
        <Button onClick={() => { resetForm(); setShowNew(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Solicitação
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="warranty">Garantia</SelectItem>
            <SelectItem value="return">Devolução</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['pending', 'approved', 'rejected', 'completed'] as const).map(st => {
          const info = STATUS_MAP[st];
          const count = records.filter(r => r.status === st).length;
          return (
            <Card key={st} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(st)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${info.color}`}>
                  <info.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{info.label}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
            ) : filtered.map(r => {
              const info = STATUS_MAP[r.status];
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {r.type === 'warranty' ? <ShieldCheck className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
                      {r.type === 'warranty' ? 'Garantia' : 'Devolução'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{r.customer_name || '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{r.reason || '—'}</TableCell>
                  <TableCell className="text-right font-semibold">R$ {Number(r.total_value).toFixed(2)}</TableCell>
                  <TableCell><Badge className={`${info.color} border-0`}>{info.label}</Badge></TableCell>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDetailRecord(r)} title="Detalhes"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => printHtml(buildPrintHtml(r))} title="Imprimir"><Printer className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => downloadHtmlAsPdf(buildPrintHtml(r), `garantia-${r.id.slice(0, 8)}`)} title="PDF"><Download className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* New Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                <Select value={formType} onValueChange={(v: any) => setFormType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="return">Devolução</SelectItem>
                    <SelectItem value="warranty">Garantia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Venda (opcional)</label>
                <Select value={formSaleId} onValueChange={handleLoadSaleItems}>
                  <SelectTrigger><SelectValue placeholder="Selecionar venda" /></SelectTrigger>
                  <SelectContent>
                    {sales.slice(0, 50).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        #{s.id.slice(0, 6)} — {s.customer_name || 'Balcão'} — R$ {Number(s.total).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Cliente</label>
              <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Motivo *</label>
              <Textarea value={formReason} onChange={e => setFormReason(e.target.value)} placeholder="Descreva o motivo da solicitação..." rows={3} />
            </div>

            {/* Items from sale */}
            {formItems.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Itens da Venda</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {formItems.map((item, idx) => (
                    <label key={idx} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => setFormItems(prev => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it))}
                        className="rounded"
                      />
                      <span className="text-sm flex-1">{item.produto}</span>
                      <span className="text-xs text-muted-foreground">x{item.quantidade}</span>
                      <span className="text-xs font-medium">R$ {(item.quantidade * Number(item.preco_unitario)).toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {loadingSaleItems && <p className="text-xs text-muted-foreground">Carregando itens...</p>}

            <Button onClick={handleCreate} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Registrar {formType === 'warranty' ? 'Garantia' : 'Devolução'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailRecord} onOpenChange={v => { if (!v) setDetailRecord(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailRecord && (() => {
            const info = STATUS_MAP[detailRecord.status];
            const items = (detailRecord.items || []) as any[];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {detailRecord.type === 'warranty' ? <ShieldCheck className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                    {detailRecord.type === 'warranty' ? 'Garantia' : 'Devolução'} #{detailRecord.id.slice(0, 8)}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className={`${info.color} border-0`}>{info.label}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(detailRecord.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Cliente:</span> <strong>{detailRecord.customer_name || '—'}</strong></div>
                    <div><span className="text-muted-foreground">Valor:</span> <strong>R$ {Number(detailRecord.total_value).toFixed(2)}</strong></div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Motivo</p>
                    <p className="text-sm bg-muted/50 p-2 rounded">{detailRecord.reason || '—'}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Itens</p>
                    <div className="space-y-1">
                      {items.map((i: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm p-1.5 bg-muted/30 rounded">
                          <span>{i.produto}</span>
                          <span className="font-medium">x{i.quantidade} — R$ {(i.quantidade * i.preco_unitario).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {detailRecord.resolution && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Resolução</p>
                      <p className="text-sm bg-green-50 p-2 rounded">{detailRecord.resolution}</p>
                    </div>
                  )}

                  {detailRecord.status === 'pending' && (
                    <div className="space-y-3 pt-2 border-t">
                      <Textarea
                        value={formResolution}
                        onChange={e => setFormResolution(e.target.value)}
                        placeholder="Resolução / Observações..."
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdateStatus(detailRecord.id, 'approved', formResolution)} className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700">
                          <CheckCircle className="w-4 h-4" /> Aprovar
                        </Button>
                        <Button onClick={() => handleUpdateStatus(detailRecord.id, 'rejected', formResolution)} variant="destructive" className="flex-1 gap-1">
                          <XCircle className="w-4 h-4" /> Rejeitar
                        </Button>
                      </div>
                    </div>
                  )}

                  {detailRecord.status === 'approved' && (
                    <Button onClick={() => handleUpdateStatus(detailRecord.id, 'completed', formResolution || detailRecord.resolution || '')} className="w-full gap-1 bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4" /> Marcar como Concluído
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
