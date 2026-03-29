import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Bell, Package, ShoppingCart, UserCheck, AlertTriangle, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'low-stock' | 'new-order' | 'repurchase' | 'overdue' | 'new-sale';
  title: string;
  description: string;
  icon: typeof Package;
  color: string;
  timestamp?: string;
}

interface NotificationsDropdownProps {
  adminUserId: string | null;
  sales: Array<{ customer_name: string | null; customer_id: string | null; created_at: string; status: string }>;
  customers: Array<{ id: string; name: string }>;
  onNavigate: (tab: string) => void;
}

const REPURCHASE_DAYS = 30;

export function NotificationsDropdown({ adminUserId, sales, customers, onNavigate }: NotificationsDropdownProps) {
  const [lowStockItems, setLowStockItems] = useState<Array<{ codigo: string; produto: string; qtd_estoque: number }>>([]);
  const [pendingOrders, setPendingOrders] = useState<Array<{ id: string; customer_name: string; total: number; created_at: string }>>([]);
  const [overduePayables, setOverduePayables] = useState<Array<{ id: string; supplier_name: string; amount: number; due_date: string }>>([]);
  const [overdueSales, setOverdueSales] = useState<Array<{ id: string; customer_name: string | null; total: number; payment_deadline: string }>>([]);
  const [realtimeAlerts, setRealtimeAlerts] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!adminUserId) return;
    const today = new Date().toISOString().split('T')[0];
    const [stockRes, ordersRes, payablesRes, salesRes] = await Promise.all([
      supabase
        .from('inventory_items')
        .select('codigo, produto, qtd_estoque')
        .lte('qtd_estoque', 3)
        .gt('qtd_estoque', -1)
        .limit(20),
      supabase
        .from('catalog_orders')
        .select('id, customer_name, total, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('accounts_payable')
        .select('id, supplier_name, amount, due_date')
        .eq('status', 'pending')
        .lte('due_date', today)
        .limit(10),
      supabase
        .from('sales')
        .select('id, customer_name, total, payment_deadline')
        .eq('status', 'completed')
        .is('paid_at', null)
        .not('payment_deadline', 'is', null)
        .lte('payment_deadline', today)
        .limit(10),
    ]);

    if (stockRes.data) setLowStockItems(stockRes.data);
    if (ordersRes.data) setPendingOrders(ordersRes.data);
    if (payablesRes.data) setOverduePayables(payablesRes.data);
    if (salesRes.data) setOverdueSales(salesRes.data as any);
  }, [adminUserId]);

  // Initial fetch + polling
  useEffect(() => {
    if (!adminUserId) return;
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 120_000);
    return () => clearInterval(interval);
  }, [adminUserId, fetchAlerts]);

  // Supabase Realtime: new catalog orders
  useEffect(() => {
    if (!adminUserId) return;

    const ordersChannel = supabase
      .channel('realtime-catalog-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'catalog_orders' },
        (payload) => {
          const order = payload.new as any;
          if (order.seller_id !== adminUserId) return;
          const alert: Notification = {
            id: `rt-order-${order.id}`,
            type: 'new-order',
            title: '🛒 Novo pedido do catálogo!',
            description: `${order.customer_name} — R$ ${Number(order.total).toFixed(2)}`,
            icon: ShoppingCart,
            color: 'text-blue-500',
            timestamp: order.created_at,
          };
          setRealtimeAlerts(prev => [alert, ...prev.slice(0, 19)]);
          fetchAlerts(); // refresh pending orders count
          toast.info(`🛒 Novo pedido: ${order.customer_name} — R$ ${Number(order.total).toFixed(2)}`, {
            duration: 6000,
          });
        }
      )
      .subscribe();

    const salesChannel = supabase
      .channel('realtime-sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => {
          const sale = payload.new as any;
          if (sale.user_id !== adminUserId) return;
          const alert: Notification = {
            id: `rt-sale-${sale.id}`,
            type: 'new-sale',
            title: '💰 Nova venda registrada!',
            description: `${sale.customer_name || 'Cliente balcão'} — R$ ${Number(sale.total).toFixed(2)}${sale.seller_name ? ` (${sale.seller_name})` : ''}`,
            icon: Zap,
            color: 'text-green-500',
            timestamp: sale.created_at,
          };
          setRealtimeAlerts(prev => [alert, ...prev.slice(0, 19)]);
          toast.success(`💰 Nova venda: ${sale.customer_name || 'Cliente balcão'} — R$ ${Number(sale.total).toFixed(2)}`, {
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(salesChannel);
    };
  }, [adminUserId, fetchAlerts]);

  // Calculate repurchase alerts from sales data
  const repurchaseAlerts = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - REPURCHASE_DAYS);

    const customerLastPurchase = new Map<string, { name: string; lastDate: Date }>();

    for (const sale of sales) {
      if (sale.status !== 'completed' || !sale.customer_id) continue;
      const date = new Date(sale.created_at);
      const existing = customerLastPurchase.get(sale.customer_id);
      if (!existing || date > existing.lastDate) {
        customerLastPurchase.set(sale.customer_id, {
          name: sale.customer_name || 'Cliente',
          lastDate: date,
        });
      }
    }

    const alerts: Array<{ customerId: string; name: string; daysSince: number }> = [];
    customerLastPurchase.forEach((val, id) => {
      if (val.lastDate < cutoff) {
        const daysSince = Math.floor((now.getTime() - val.lastDate.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({ customerId: id, name: val.name, daysSince });
      }
    });

    return alerts.sort((a, b) => b.daysSince - a.daysSince).slice(0, 10);
  }, [sales]);

  // Build notifications list
  const notifications: Notification[] = useMemo(() => {
    const items: Notification[] = [];

    // Overdue payments (highest priority)
    for (const p of overduePayables) {
      items.push({
        id: `payable-${p.id}`,
        type: 'overdue',
        title: 'Conta a pagar vencida',
        description: `${p.supplier_name} — R$ ${Number(p.amount).toFixed(2)} (venc. ${new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR')})`,
        icon: Clock,
        color: 'text-red-500',
      });
    }

    for (const s of overdueSales) {
      items.push({
        id: `sale-overdue-${s.id}`,
        type: 'overdue',
        title: 'Recebimento atrasado',
        description: `${s.customer_name || 'Cliente'} — R$ ${Number(s.total).toFixed(2)} (venc. ${new Date(s.payment_deadline + 'T12:00:00').toLocaleDateString('pt-BR')})`,
        icon: Clock,
        color: 'text-red-500',
      });
    }

    for (const order of pendingOrders) {
      items.push({
        id: `order-${order.id}`,
        type: 'new-order',
        title: 'Novo pedido do catálogo',
        description: `${order.customer_name} — R$ ${Number(order.total).toFixed(2)}`,
        icon: ShoppingCart,
        color: 'text-blue-500',
        timestamp: order.created_at,
      });
    }

    // Realtime alerts (at the top)
    items.push(...realtimeAlerts.filter(a => !items.some(i => i.id === a.id)));

    if (lowStockItems.length > 0) {
      items.push({
        id: 'low-stock-summary',
        type: 'low-stock',
        title: `${lowStockItems.length} produto${lowStockItems.length > 1 ? 's' : ''} com estoque baixo`,
        description: lowStockItems.slice(0, 3).map(i => `${i.codigo} (${i.qtd_estoque}un)`).join(', '),
        icon: Package,
        color: 'text-amber-500',
      });
    }

    for (const alert of repurchaseAlerts.slice(0, 5)) {
      items.push({
        id: `repurchase-${alert.customerId}`,
        type: 'repurchase',
        title: 'Cliente sem comprar',
        description: `${alert.name} — ${alert.daysSince} dias sem comprar`,
        icon: UserCheck,
        color: 'text-orange-500',
      });
    }

    return items;
  }, [pendingOrders, lowStockItems, repurchaseAlerts, overduePayables, overdueSales, realtimeAlerts]);

  const totalCount = notifications.length;

  const handleClick = (n: Notification) => {
    setOpen(false);
    if (n.type === 'low-stock') onNavigate('low-stock');
    else if (n.type === 'new-order') onNavigate('orders');
    else if (n.type === 'repurchase') onNavigate('repurchase-alerts');
    else if (n.type === 'overdue') {
      if (n.id.startsWith('payable-')) onNavigate('accounts-payable');
      else onNavigate('accounts-receivable');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" title="Notificações">
          <Bell className="w-4 h-4" />
          {totalCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground border-0 flex items-center justify-center"
            >
              {totalCount > 9 ? '9+' : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">{totalCount}</Badge>
            )}
          </h4>
        </div>

        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Tudo certo! Nenhum alerta no momento.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => {
                const Icon = n.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className={`mt-0.5 ${n.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.description}</p>
                      {n.timestamp && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.timestamp).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
