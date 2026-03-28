import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronUp, Phone, MessageSquare, CheckCircle, Clock, XCircle, Package, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ListSkeleton } from './ListSkeleton';

interface OrderItem {
  codigo: string;
  produto: string;
  quantidade: number;
  preco: number;
}

interface CatalogOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_id: string | null;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
  confirmed: { label: 'Confirmado', variant: 'default', icon: CheckCircle },
  cancelled: { label: 'Cancelado', variant: 'destructive', icon: XCircle },
};

export function CatalogOrdersManager() {
  const [orders, setOrders] = useState<CatalogOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('catalog_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data.map(d => ({
        ...d,
        items: (Array.isArray(d.items) ? d.items : []) as unknown as OrderItem[],
        total: Number(d.total),
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    const { error } = await supabase.from('catalog_orders').update({ status }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    toast.success(`Pedido ${status === 'confirmed' ? 'confirmado' : 'cancelado'}!`);
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;
    const { error } = await supabase.from('catalog_orders').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir pedido'); return; }
    setOrders(prev => prev.filter(o => o.id !== id));
    setExpandedId(null);
    toast.success('Pedido excluído!');
  }, []);

  const openWhatsApp = useCallback((phone: string, order: CatalogOrder) => {
    const lines = order.items.map((item, idx) =>
      `${idx + 1}. ${item.codigo} - ${item.produto}\n   Qtde: ${item.quantidade} x ${fmt(item.preco)}`
    );
    const text = `Olá ${order.customer_name}! Sobre seu pedido:\n\n${lines.join('\n\n')}\n\n*Total: ${fmt(order.total)}*`;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`, '_blank');
  }, []);

  const filtered = orders.filter(o => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return o.customer_name.toLowerCase().includes(q) || o.customer_phone.includes(q) || o.id.includes(q);
  });

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  if (loading) {
    return <ListSkeleton count={3} variant="card" />;
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">{pendingCount} pedido(s) pendente(s)</span>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por cliente ou telefone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-2" />
          <p>Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const sc = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            return (
              <Card key={order.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{order.customer_name}</span>
                      <Badge variant={sc.variant} className="text-[10px] gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{order.customer_phone}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary text-sm">{fmt(order.total)}</span>
                    {expandedId === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {expandedId === order.id && (
                  <div className="border-t border-border p-4 bg-muted/10 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Itens do pedido</p>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{item.codigo}</span>
                          <span className="text-muted-foreground ml-2">{item.produto}</span>
                        </div>
                        <span>{item.quantidade}x {fmt(item.preco)}</span>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openWhatsApp(order.customer_phone, order)}
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </Button>
                      <a href={`tel:${order.customer_phone.replace(/\D/g, '')}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Phone className="w-3 h-3" /> Ligar
                        </Button>
                      </a>
                      {order.status === 'pending' && (
                        <>
                          <Button size="sm" className="gap-1" onClick={() => updateStatus(order.id, 'confirmed')}>
                            <CheckCircle className="w-3 h-3" /> Confirmar
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => updateStatus(order.id, 'cancelled')}>
                            <XCircle className="w-3 h-3" /> Cancelar
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => deleteOrder(order.id)}>
                        <Trash2 className="w-3 h-3" /> Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
