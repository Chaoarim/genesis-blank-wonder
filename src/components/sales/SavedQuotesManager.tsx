import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ShoppingCart, Trash2, Eye, CheckCircle, Clock, X, Send, FileText, ChevronDown, ChevronUp, LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Customer, Sale } from '@/hooks/useSalesData';
import { QuotesKanban } from './QuotesKanban';

interface QuoteItem {
  codigo: string;
  produto: string;
  fornecedor?: string;
  quantidade: number;
  preco_unitario: number;
}

interface SavedQuote {
  id: string;
  user_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: QuoteItem[];
  total: number;
  discount: number;
  notes: string | null;
  status: string;
  pipeline_stage: string;
  expires_at: string | null;
  converted_sale_id: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  approved: { label: 'Aprovado', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  rejected: { label: 'Recusado', color: 'bg-destructive/10 text-destructive' },
  expired: { label: 'Expirado', color: 'bg-muted text-muted-foreground' },
  converted: { label: 'Convertido', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
};

interface Props {
  adminUserId: string | null;
  customers: Customer[];
  onCreateSale: (data: {
    customer_id?: string;
    customer_name?: string;
    channel?: string;
    delivery_type?: string;
    payment_method?: string;
    items: { codigo: string; produto: string; fornecedor?: string; quantidade: number; preco_unitario: number }[];
    discount?: number;
    notes?: string;
  }) => Promise<Sale | null>;
}

export function SavedQuotesManager({ adminUserId, customers, onCreateSale }: Props) {
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const fetchQuotes = useCallback(async () => {
    if (!adminUserId) return;
    const { data } = await supabase
      .from('saved_quotes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      const parsed = data.map((q: any) => ({
        ...q,
        items: Array.isArray(q.items) ? q.items : (typeof q.items === 'string' ? JSON.parse(q.items) : []),
      })) as SavedQuote[];
      // Mark expired
      const now = new Date();
      parsed.forEach(q => {
        if (q.status === 'pending' && q.expires_at && new Date(q.expires_at) < now) {
          q.status = 'expired';
        }
      });
      setQuotes(parsed);
    }
    setLoading(false);
  }, [adminUserId]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('saved_quotes').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    setQuotes(prev => prev.filter(q => q.id !== id));
    toast.success('Orçamento excluído');
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('saved_quotes').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); return; }
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q));
    toast.success('Status atualizado');
  };

  const handleConvertToSale = async (quote: SavedQuote) => {
    const sale = await onCreateSale({
      customer_id: quote.customer_id || undefined,
      customer_name: quote.customer_name || undefined,
      channel: 'balcao',
      delivery_type: 'retirada',
      payment_method: 'dinheiro',
      items: quote.items.map(i => ({
        codigo: i.codigo,
        produto: i.produto,
        fornecedor: i.fornecedor,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
      })),
      discount: quote.discount,
      notes: `Convertido do orçamento #${quote.id.slice(0, 8)}. ${quote.notes || ''}`.trim(),
    });

    if (sale) {
      await supabase.from('saved_quotes').update({
        status: 'converted',
        converted_sale_id: sale.id,
        updated_at: new Date().toISOString(),
      }).eq('id', quote.id);
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'converted', converted_sale_id: sale.id } : q));
      toast.success('Orçamento convertido em venda!');
    }
  };

  const handleSendWhatsApp = (quote: SavedQuote) => {
    const lines = quote.items.map((item, idx) => {
      const subtotal = item.quantidade * item.preco_unitario;
      return `${idx + 1}. ${item.codigo} - ${item.produto}\n   Qtde: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)} = R$ ${subtotal.toFixed(2)}`;
    });
    let text = `*ORÇAMENTO DE PEÇAS*\n\n${lines.join('\n\n')}`;
    if (quote.discount > 0) text += `\n\nDesconto: R$ ${quote.discount.toFixed(2)}`;
    text += `\n\n*TOTAL: R$ ${quote.total.toFixed(2)}*`;
    if (quote.notes) text += `\n\nObs: ${quote.notes}`;

    const encoded = encodeURIComponent(text);
    const phone = quote.customer_phone?.replace(/\D/g, '') || '';
    const url = phone
      ? `https://api.whatsapp.com/send?phone=55${phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const filtered = quotes.filter(q => {
    if (filter !== 'all' && q.status !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (q.customer_name || '').toLowerCase().includes(s) ||
        q.items.some(i => i.codigo.toLowerCase().includes(s) || i.produto.toLowerCase().includes(s));
    }
    return true;
  });

  const pendingCount = quotes.filter(q => q.status === 'pending').length;
  const totalPendingValue = quotes.filter(q => q.status === 'pending').reduce((s, q) => s + Number(q.total), 0);

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> CRM de Orçamentos
          </h2>
          <p className="text-sm text-muted-foreground">Pipeline visual de negociações</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <Button
            size="sm"
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            className="h-7 px-2.5 gap-1.5 text-xs"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Kanban
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            className="h-7 px-2.5 gap-1.5 text-xs"
            onClick={() => setViewMode('list')}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{quotes.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{quotes.filter(q => q.status === 'converted').length}</p>
            <p className="text-xs text-muted-foreground">Convertidos</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">R$ {totalPendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground">Valor Pendente</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Buscar por cliente ou peça..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="converted">Convertidos</SelectItem>
            <SelectItem value="rejected">Recusados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quotes list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum orçamento encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Os orçamentos criados na busca de peças aparecerão aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(quote => {
            const isExpanded = expandedId === quote.id;
            const statusInfo = STATUS_MAP[quote.status] || STATUS_MAP.pending;

            return (
              <Card key={quote.id} className="border-border/50">
                <CardContent className="p-4">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => setExpandedId(isExpanded ? null : quote.id)} className="shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {quote.customer_name || 'Cliente não informado'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{quote.id.slice(0, 8)} • {format(new Date(quote.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          {' • '}{quote.items.length} {quote.items.length === 1 ? 'item' : 'itens'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusInfo.color} border-0`}>{statusInfo.label}</Badge>
                      <span className="font-bold text-sm">
                        R$ {Number(quote.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Qtde</TableHead>
                            <TableHead className="text-right">Preço Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {quote.items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                              <TableCell className="text-sm">{item.produto}</TableCell>
                              <TableCell className="text-right">{item.quantidade}</TableCell>
                              <TableCell className="text-right">R$ {Number(item.preco_unitario).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {quote.discount > 0 && (
                        <p className="text-sm text-muted-foreground">Desconto: R$ {Number(quote.discount).toFixed(2)}</p>
                      )}
                      {quote.notes && (
                        <p className="text-sm text-muted-foreground">Obs: {quote.notes}</p>
                      )}
                      {quote.expires_at && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Válido até {format(new Date(quote.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
                        {quote.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleConvertToSale(quote)} className="gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5" /> Converter em Venda
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(quote.id, 'approved')} className="gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(quote.id, 'rejected')} className="gap-1.5 text-destructive">
                              <X className="w-3.5 h-3.5" /> Recusar
                            </Button>
                          </>
                        )}
                        {quote.status === 'approved' && (
                          <Button size="sm" onClick={() => handleConvertToSale(quote)} className="gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Converter em Venda
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleSendWhatsApp(quote)} className="gap-1.5">
                          <Send className="w-3.5 h-3.5" /> WhatsApp
                        </Button>
                        {quote.status !== 'converted' && (
                          <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => handleDelete(quote.id)}>
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
