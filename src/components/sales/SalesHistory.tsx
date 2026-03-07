import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, ChevronDown, ChevronUp, Search, Send, Printer, FileText } from 'lucide-react';
import { printSale, downloadPdf } from '@/lib/salePrint';
import type { Sale, SaleItem } from '@/hooks/useSalesData';

interface SalesHistoryProps {
  sales: Sale[];
  onDeleteSale: (id: string) => void;
  getSaleItems: (saleId: string) => Promise<SaleItem[]>;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

export function SalesHistory({ sales, onDeleteSale, getSaleItems }: SalesHistoryProps) {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [itemsCache, setItemsCache] = useState<Record<string, SaleItem[]>>({});

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    return !q || (s.customer_name || '').toLowerCase().includes(q) || s.id.includes(q) || (s.seller_name || '').toLowerCase().includes(q);
  });

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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por cliente ou vendedor..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Nenhuma venda encontrada</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(sale => (
            <Card key={sale.id} className="overflow-hidden">
              <button onClick={() => toggleExpand(sale.id)} className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{sale.customer_name || 'Cliente balcão'}</span>
                    <Badge variant="outline" className="text-[10px]">{sale.channel === 'whatsapp' ? 'WhatsApp' : 'Balcão'}</Badge>
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
                        <Button variant="outline" size="sm" onClick={() => resendWhatsApp(sale)} className="gap-1">
                          <Send className="w-3 h-3" /> WhatsApp
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDeleteSale(sale.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Excluir
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Carregando itens...</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
