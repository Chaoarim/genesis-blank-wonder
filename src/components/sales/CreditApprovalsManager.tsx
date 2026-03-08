import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CreditCard, CheckCircle, XCircle, Clock, AlertTriangle, Eye } from 'lucide-react';

interface CreditApproval {
  id: string;
  user_id: string;
  sale_id: string;
  customer_id: string;
  customer_name: string | null;
  sale_total: number;
  credit_limit: number;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface Props {
  userId: string;
  reviewerName?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Aguardando', color: 'bg-amber-100 text-amber-800', icon: Clock },
  approved: { label: 'Liberado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Negado', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export function CreditApprovalsManager({ userId, reviewerName }: Props) {
  const [records, setRecords] = useState<CreditApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailRecord, setDetailRecord] = useState<CreditApproval | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('credit_approvals')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setRecords(data as any[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('credit_approvals').update({
      status,
      notes: reviewNotes || null,
      reviewed_by: reviewerName || 'Admin',
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);

    if (error) { toast.error('Erro ao atualizar'); return; }

    if (status === 'approved') {
      // Update the sale status to completed
      const record = records.find(r => r.id === id);
      if (record?.sale_id) {
        await supabase.from('sales').update({ status: 'completed' }).eq('id', record.sale_id);
      }
      toast.success('Crédito liberado! Venda aprovada.');
    } else {
      const record = records.find(r => r.id === id);
      if (record?.sale_id) {
        await supabase.from('sales').update({ status: 'cancelled' }).eq('id', record.sale_id);
      }
      toast.success('Crédito negado.');
    }

    setDetailRecord(null);
    setReviewNotes('');
    fetchRecords();
  };

  const filtered = records.filter(r => statusFilter === 'all' ? true : r.status === statusFilter);
  const pendingCount = records.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Análise de Crédito</h2>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" /> {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(['pending', 'approved', 'rejected'] as const).map(st => {
          const info = STATUS_MAP[st];
          const count = records.filter(r => r.status === st).length;
          const total = records.filter(r => r.status === st).reduce((s, r) => s + Number(r.sale_total), 0);
          return (
            <Card key={st} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(st)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded ${info.color}`}><info.icon className="w-3.5 h-3.5" /></div>
                  <span className="text-xs font-medium">{info.label}</span>
                </div>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">R$ {total.toFixed(2)}</p>
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
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor Pedido</TableHead>
              <TableHead className="text-right">Limite</TableHead>
              <TableHead className="text-right">Excedente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum registro</TableCell></TableRow>
            ) : filtered.map(r => {
              const info = STATUS_MAP[r.status];
              const excedente = Number(r.sale_total) - Number(r.credit_limit);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.customer_name || '—'}</TableCell>
                  <TableCell className="text-right font-semibold">R$ {Number(r.sale_total).toFixed(2)}</TableCell>
                  <TableCell className="text-right">R$ {Number(r.credit_limit).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-600 font-medium">+ R$ {excedente.toFixed(2)}</TableCell>
                  <TableCell><Badge className={`${info.color} border-0`}>{info.label}</Badge></TableCell>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setDetailRecord(r); setReviewNotes(r.notes || ''); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Detail / Review Dialog */}
      <Dialog open={!!detailRecord} onOpenChange={v => { if (!v) setDetailRecord(null); }}>
        <DialogContent className="max-w-md">
          {detailRecord && (() => {
            const info = STATUS_MAP[detailRecord.status];
            const excedente = Number(detailRecord.sale_total) - Number(detailRecord.credit_limit);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" /> Análise de Crédito
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Badge className={`${info.color} border-0`}>{info.label}</Badge>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Cliente:</span><br /><strong>{detailRecord.customer_name || '—'}</strong></div>
                    <div><span className="text-muted-foreground">Data:</span><br /><strong>{new Date(detailRecord.created_at).toLocaleDateString('pt-BR')}</strong></div>
                    <div><span className="text-muted-foreground">Valor Pedido:</span><br /><strong className="text-lg">R$ {Number(detailRecord.sale_total).toFixed(2)}</strong></div>
                    <div><span className="text-muted-foreground">Limite:</span><br /><strong>R$ {Number(detailRecord.credit_limit).toFixed(2)}</strong></div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-red-600">Valor excede o limite em</p>
                    <p className="text-xl font-bold text-red-700">R$ {excedente.toFixed(2)}</p>
                  </div>

                  {detailRecord.reviewed_by && (
                    <p className="text-xs text-muted-foreground">Analisado por: <strong>{detailRecord.reviewed_by}</strong> em {detailRecord.reviewed_at ? new Date(detailRecord.reviewed_at).toLocaleDateString('pt-BR') : ''}</p>
                  )}

                  {detailRecord.status === 'pending' && (
                    <div className="space-y-3 pt-2 border-t">
                      <Textarea
                        value={reviewNotes}
                        onChange={e => setReviewNotes(e.target.value)}
                        placeholder="Observações da análise..."
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button onClick={() => handleReview(detailRecord.id, 'approved')} className="flex-1 gap-1 bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4" /> Liberar
                        </Button>
                        <Button onClick={() => handleReview(detailRecord.id, 'rejected')} variant="destructive" className="flex-1 gap-1">
                          <XCircle className="w-4 h-4" /> Negar
                        </Button>
                      </div>
                    </div>
                  )}

                  {detailRecord.notes && detailRecord.status !== 'pending' && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm bg-muted/50 p-2 rounded">{detailRecord.notes}</p>
                    </div>
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
