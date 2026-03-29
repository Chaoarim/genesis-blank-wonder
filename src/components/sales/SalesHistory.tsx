import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Search, Send, Printer, FileText, FileDown, Loader2, Calendar, Download, Copy } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { printSale, downloadPdf, downloadQuotePdf } from '@/lib/salePrint';
import { NfEditDialog, NfStatusBadge } from './NfEditDialog';
import type { Sale, SaleItem } from '@/hooks/useSalesData';

interface SalesHistoryProps {
  sales: Sale[];
  onDeleteSale: (id: string) => void;
  getSaleItems: (saleId: string) => Promise<SaleItem[]>;
  onDuplicateSale?: (sale: Sale, items: SaleItem[]) => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PAGE_SIZE = 30;

const DELIVERY_LABELS: Record<string, string> = {
  retirada: 'Retirada',
  moto: 'Moto Entrega',
  frota: 'Frota Própria',
  transportadora: 'Transportadora',
};

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao: 'Cartão',
  faturado: 'Faturado',
};

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: '3months', label: 'Últimos 3 meses' },
];

export function SalesHistory({ sales, onDeleteSale, getSaleItems, onDuplicateSale }: SalesHistoryProps) {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all');
  const [nfFilter, setNfFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, SaleItem[]>>({});
  const [nfOverrides, setNfOverrides] = useState<Record<string, { nf_numero: string | null; nf_serie: string | null; nf_chave: string | null; nf_status: string }>>({});

  const filtered = useMemo(() => {
    const now = new Date();
    let result = sales;

    // Period filter
    if (period !== 'all') {
      const cutoff = new Date();
      if (period === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (period === 'week') { cutoff.setDate(now.getDate() - now.getDay()); cutoff.setHours(0, 0, 0, 0); }
      else if (period === 'month') { cutoff.setDate(1); cutoff.setHours(0, 0, 0, 0); }
      else if (period === '3months') { cutoff.setMonth(now.getMonth() - 3); cutoff.setHours(0, 0, 0, 0); }
      result = result.filter(s => new Date(s.created_at) >= cutoff);
    }

    // Text filter
    const q = search.toLowerCase();
    if (q) {
      result = result.filter(s =>
        (s.customer_name || '').toLowerCase().includes(q) ||
        s.id.includes(q) ||
        (s.seller_name || '').toLowerCase().includes(q) ||
        (s.nf_numero || '').includes(q)
      );
    }

    // NF filter
    if (nfFilter !== 'all') {
      result = result.filter(s => {
        const status = nfOverrides[s.id]?.nf_status || s.nf_status || 'sem_nf';
        return status === nfFilter;
      });
    }

    return result;
  }, [sales, search, period, nfFilter, nfOverrides]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const totalFiltered = filtered.reduce((s, v) => s + Number(v.total), 0);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!itemsCache[id]) {
      const items = await getSaleItems(id);
      setItemsCache(prev => ({ ...prev, [id]: items }));
    }
  };

  const resendWhatsApp = (sale: Sale) => {
    const items = itemsCache[sale.id];
    if (!items) return;
    const lines = items.map((item, idx) => `${idx + 1}. ${item.codigo} - ${item.produto}\n   Qtde: ${item.quantidade} x R$ ${Number(item.preco_unitario).toFixed(2)}`);
    const text = `*VENDA #${sale.id.slice(0, 8)}*\nCliente: ${sale.customer_name || 'Balcão'}\n\n${lines.join('\n\n')}\n\n*TOTAL: ${fmt(Number(sale.total))}*`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por cliente ou vendedor..." value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }} />
        </div>
        <Select value={period} onValueChange={v => { setPeriod(v); setVisibleCount(PAGE_SIZE); }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={nfFilter} onValueChange={v => { setNfFilter(v); setVisibleCount(PAGE_SIZE); }}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <FileText className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas NF</SelectItem>
            <SelectItem value="sem_nf">Sem NF</SelectItem>
            <SelectItem value="pendente">NF Pendente</SelectItem>
            <SelectItem value="emitida">NF Emitida</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
          exportToExcel(filtered.map(s => ({
            Data: new Date(s.created_at).toLocaleDateString('pt-BR'),
            Cliente: s.customer_name || 'Balcão',
            Vendedor: s.seller_name || '-',
            Canal: s.channel,
            Pagamento: PAYMENT_LABELS[s.payment_method] || s.payment_method,
            Entrega: DELIVERY_LABELS[s.delivery_type] || s.delivery_type,
            Desconto: Number(s.discount),
            Total: Number(s.total),
            Status: s.status,
            NF_Status: nfOverrides[s.id]?.nf_status || s.nf_status || 'sem_nf',
            NF_Numero: nfOverrides[s.id]?.nf_numero || s.nf_numero || '',
          })), 'historico-vendas', 'Vendas');
        }}>
          <Download className="w-3.5 h-3.5" />
          Exportar
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>{filtered.length} venda{filtered.length !== 1 ? 's' : ''}</span>
        <span className="font-medium text-foreground">Total: {fmt(totalFiltered)}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Nenhuma venda encontrada</p>
      ) : (
        <div className="space-y-2">
          {visible.map(sale => {
            const nfData = nfOverrides[sale.id] || { nf_numero: sale.nf_numero, nf_serie: sale.nf_serie, nf_chave: sale.nf_chave, nf_status: sale.nf_status || 'sem_nf' };
            return (
            <Card key={sale.id} className="overflow-hidden">
              <button onClick={() => toggleExpand(sale.id)} className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{sale.customer_name || 'Cliente balcão'}</span>
                    <Badge variant="outline" className="text-[10px]">{sale.channel === 'whatsapp' ? 'WhatsApp' : sale.channel === 'catalogo_b2b' ? 'Catálogo' : 'Balcão'}</Badge>
                    {sale.seller_name && (
                      <Badge variant="secondary" className="text-[10px]">🧑‍💼 {sale.seller_name}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleString('pt-BR')}</p>
                    <Badge variant="outline" className="text-[9px]">{DELIVERY_LABELS[sale.delivery_type] || sale.delivery_type}</Badge>
                    <Badge variant="outline" className="text-[9px]">{PAYMENT_LABELS[sale.payment_method] || sale.payment_method}</Badge>
                    {sale.payment_method === 'faturado' && sale.payment_deadline && (
                      <Badge variant="outline" className="text-[9px] text-amber-600">Prazo: {new Date(sale.payment_deadline).toLocaleDateString('pt-BR')}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary text-sm">{fmt(Number(sale.total))}</span>
                  {expandedId === sale.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {expandedId === sale.id && (
                <div className="border-t border-border p-4 bg-muted/10 space-y-2">
                  {itemsCache[sale.id] ? (
                    <>
                      {itemsCache[sale.id].map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">{item.codigo}</span>
                            <span className="text-muted-foreground ml-2">{item.produto}</span>
                          </div>
                          <span>{item.quantidade}x {fmt(Number(item.preco_unitario))}</span>
                        </div>
                      ))}
                      {Number(sale.discount) > 0 && (
                        <p className="text-xs text-muted-foreground">Desconto: {fmt(Number(sale.discount))}</p>
                      )}
                      {sale.notes && <p className="text-xs text-muted-foreground italic">{sale.notes}</p>}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => printSale(sale, itemsCache[sale.id])} className="gap-1">
                          <Printer className="w-3 h-3" /> Imprimir
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadPdf(sale, itemsCache[sale.id])} className="gap-1">
                          <FileText className="w-3 h-3" /> PDF
                        </Button>
                        <Button variant="default" size="sm" onClick={() => downloadQuotePdf(sale, itemsCache[sale.id])} className="gap-1">
                          <FileDown className="w-3 h-3" /> Orçamento PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => resendWhatsApp(sale)} className="gap-1">
                          <Send className="w-3 h-3" /> WhatsApp
                        </Button>
                        {onDuplicateSale && (
                          <Button variant="outline" size="sm" onClick={() => onDuplicateSale(sale, itemsCache[sale.id])} className="gap-1">
                            <Copy className="w-3 h-3" /> Duplicar
                          </Button>
                        )}
                        <ConfirmDeleteDialog
                          description="Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita."
                          onConfirm={() => onDeleteSale(sale.id)}
                          trigger={
                            <Button variant="ghost" size="sm" className="text-destructive gap-1">
                              Excluir
                            </Button>
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Carregando itens...</p>
                  )}
                </div>
              )}
            </Card>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                className="gap-2"
              >
                <Loader2 className="w-3.5 h-3.5" />
                Carregar mais ({filtered.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
