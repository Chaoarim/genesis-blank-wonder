import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search, ChevronDown, ChevronUp, PackageCheck, Clock, CheckCircle,
  PlayCircle, Printer, Package, AlertTriangle, User
} from 'lucide-react';
import { toast } from 'sonner';
import { ListSkeleton } from './ListSkeleton';

interface ExpeditionOrder {
  id: string;
  sale_id: string;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  customer_name?: string;
  sale_total?: number;
}

interface ExpeditionItem {
  id: string;
  expedition_id: string;
  codigo: string;
  produto: string;
  quantidade_esperada: number;
  quantidade_conferida: number;
  checked: boolean;
  notes: string | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Aguardando', variant: 'secondary', icon: Clock },
  picking: { label: 'Separando', variant: 'outline', icon: Package },
  checked: { label: 'Conferido', variant: 'default', icon: CheckCircle },
  ready: { label: 'Pronto', variant: 'default', icon: PackageCheck },
};

export function ExpeditionManager({ adminUserId }: { adminUserId: string | null }) {
  const [orders, setOrders] = useState<ExpeditionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<ExpeditionItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('expedition_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch sale info for each order
      const saleIds = [...new Set(data.map(d => d.sale_id))];
      const { data: sales } = await supabase
        .from('sales')
        .select('id, customer_name, total')
        .in('id', saleIds);

      const salesMap = new Map(sales?.map(s => [s.id, s]) || []);

      setOrders(data.map(d => ({
        ...d,
        customer_name: salesMap.get(d.sale_id)?.customer_name || 'Cliente não identificado',
        sale_total: salesMap.get(d.sale_id)?.total || 0,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const fetchItems = useCallback(async (expeditionId: string) => {
    setItemsLoading(true);
    const { data } = await supabase
      .from('expedition_items')
      .select('*')
      .eq('expedition_id', expeditionId);
    if (data) setItems(data as ExpeditionItem[]);
    setItemsLoading(false);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setItems([]);
    } else {
      setExpandedId(id);
      fetchItems(id);
    }
  }, [expandedId, fetchItems]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    const updates: Record<string, any> = { status };
    if (status === 'picking') updates.started_at = new Date().toISOString();
    if (status === 'ready') updates.completed_at = new Date().toISOString();

    const { error } = await supabase.from('expedition_orders').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar status'); return; }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    const labels: Record<string, string> = { picking: 'Separação iniciada!', checked: 'Conferência concluída!', ready: 'Pedido pronto para entrega!' };
    toast.success(labels[status] || 'Status atualizado!');
  }, []);

  const toggleItemCheck = useCallback(async (item: ExpeditionItem) => {
    const newChecked = !item.checked;
    const updates = {
      checked: newChecked,
      quantidade_conferida: newChecked ? item.quantidade_esperada : 0,
      checked_at: newChecked ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from('expedition_items').update(updates).eq('id', item.id);
    if (error) { toast.error('Erro ao atualizar item'); return; }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i));
  }, []);

  const createExpeditionFromSale = useCallback(async () => {
    if (!adminUserId) return;

    // Fetch recent completed sales without expedition
    const { data: sales } = await supabase
      .from('sales')
      .select('id, customer_name, total')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!sales?.length) { toast.info('Nenhuma venda recente para expedir'); return; }

    // Check which already have expedition
    const { data: existing } = await supabase
      .from('expedition_orders')
      .select('sale_id')
      .in('sale_id', sales.map(s => s.id));

    const existingIds = new Set(existing?.map(e => e.sale_id) || []);
    const pending = sales.filter(s => !existingIds.has(s.id));

    if (pending.length === 0) { toast.info('Todas as vendas recentes já possuem expedição'); return; }

    // Create expedition for the most recent sale without one
    const sale = pending[0];
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('id, codigo, produto, quantidade')
      .eq('sale_id', sale.id);

    const { data: expedition, error } = await supabase
      .from('expedition_orders')
      .insert({ sale_id: sale.id, user_id: adminUserId, status: 'pending' })
      .select()
      .single();

    if (error || !expedition) { toast.error('Erro ao criar expedição'); return; }

    if (saleItems?.length) {
      await supabase.from('expedition_items').insert(
        saleItems.map(si => ({
          expedition_id: expedition.id,
          sale_item_id: si.id,
          codigo: si.codigo,
          produto: si.produto,
          quantidade_esperada: si.quantidade,
        }))
      );
    }

    toast.success(`Expedição criada para ${sale.customer_name || 'venda'}!`);
    fetchOrders();
  }, [adminUserId, fetchOrders]);

  const printPickingList = useCallback((order: ExpeditionOrder, orderItems: ExpeditionItem[]) => {
    const html = `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Lista de Separação</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; }
        .info { margin: 10px 0; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; }
        .check-col { width: 40px; text-align: center; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>📦 Lista de Separação #${order.id.slice(0, 8)}</h1>
      <div class="info"><strong>Cliente:</strong> ${order.customer_name || '—'}</div>
      <div class="info"><strong>Data:</strong> ${new Date(order.created_at).toLocaleString('pt-BR')}</div>
      <div class="info"><strong>Total:</strong> ${fmt(order.sale_total || 0)}</div>
      <table>
        <thead><tr><th class="check-col">✓</th><th>Código</th><th>Produto</th><th>Qtde</th></tr></thead>
        <tbody>
          ${orderItems.map(item => `
            <tr>
              <td class="check-col">☐</td>
              <td><strong>${item.codigo}</strong></td>
              <td>${item.produto}</td>
              <td>${item.quantidade_esperada}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top:30px;font-size:12px;color:#666">
        Conferido por: __________________ Data: __/__/____
      </div>
      </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  }, []);

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (o.customer_name || '').toLowerCase().includes(q) || o.id.includes(q);
  });

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'picking').length;

  if (loading) return <ListSkeleton count={3} variant="card" />;

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">{pendingCount} pedido(s) aguardando separação</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pending">Aguardando</option>
            <option value="picking">Separando</option>
            <option value="checked">Conferido</option>
            <option value="ready">Pronto</option>
          </select>
          <Button onClick={createExpeditionFromSale} size="sm" className="gap-1 whitespace-nowrap">
            <PackageCheck className="w-4 h-4" /> Nova Expedição
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-2" />
          <p>Nenhuma expedição encontrada</p>
          <p className="text-xs mt-1">Clique em "Nova Expedição" para criar a partir de vendas concluídas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const sc = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = sc.icon;
            const isExpanded = expandedId === order.id;
            const allChecked = items.length > 0 && items.every(i => i.checked) && isExpanded;

            return (
              <Card key={order.id} className="overflow-hidden">
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{order.customer_name}</span>
                      <Badge variant={sc.variant} className="text-[10px] gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {sc.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>#{order.id.slice(0, 8)}</span>
                      {order.assigned_to && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {order.assigned_to}
                        </span>
                      )}
                      <span>{new Date(order.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary text-sm">{fmt(order.sale_total || 0)}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Itens para separação</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => printPickingList(order, items)}
                        disabled={itemsLoading || items.length === 0}
                      >
                        <Printer className="w-3 h-3" /> Imprimir
                      </Button>
                    </div>

                    {itemsLoading ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">Carregando...</div>
                    ) : items.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">Nenhum item cadastrado</div>
                    ) : (
                      <div className="space-y-1">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-2 rounded-md text-sm transition-colors ${item.checked ? 'bg-green-500/10' : 'hover:bg-muted/30'}`}
                          >
                            <Checkbox
                              checked={item.checked}
                              onCheckedChange={() => toggleItemCheck(item)}
                              disabled={order.status === 'ready'}
                            />
                            <div className="flex-1 min-w-0">
                              <span className={`font-medium ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                                {item.codigo}
                              </span>
                              <span className={`ml-2 text-muted-foreground ${item.checked ? 'line-through' : ''}`}>
                                {item.produto}
                              </span>
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap">
                              {item.quantidade_conferida}/{item.quantidade_esperada}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                      {order.status === 'pending' && (
                        <Button size="sm" className="gap-1" onClick={() => updateStatus(order.id, 'picking')}>
                          <PlayCircle className="w-3 h-3" /> Iniciar Separação
                        </Button>
                      )}
                      {order.status === 'picking' && allChecked && (
                        <Button size="sm" className="gap-1" onClick={() => updateStatus(order.id, 'checked')}>
                          <CheckCircle className="w-3 h-3" /> Marcar Conferido
                        </Button>
                      )}
                      {order.status === 'checked' && (
                        <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(order.id, 'ready')}>
                          <PackageCheck className="w-3 h-3" /> Pronto para Entrega
                        </Button>
                      )}
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
