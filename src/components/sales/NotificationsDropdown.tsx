import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Bell, BellRing, Package, ShoppingCart, UserCheck, AlertTriangle, Clock, Zap, CheckCheck, Volume2, VolumeX } from 'lucide-react';
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
  isNew?: boolean;
}

interface NotificationsDropdownProps {
  adminUserId: string | null;
  currentAuthId: string | null;
  sales: Array<{ customer_name: string | null; customer_id: string | null; created_at: string; status: string }>;
  customers: Array<{ id: string; name: string }>;
  onNavigate: (tab: string) => void;
}

const REPURCHASE_DAYS = 30;

// Simple notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(900, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Audio not available
  }
}

export function NotificationsDropdown({ adminUserId, currentAuthId, sales, customers, onNavigate }: NotificationsDropdownProps) {
  const [lowStockItems, setLowStockItems] = useState<Array<{ codigo: string; produto: string; qtd_estoque: number }>>([]);
  const [pendingOrders, setPendingOrders] = useState<Array<{ id: string; customer_name: string; total: number; created_at: string }>>([]);
  const [overduePayables, setOverduePayables] = useState<Array<{ id: string; supplier_name: string; amount: number; due_date: string }>>([]);
  const [overdueSales, setOverdueSales] = useState<Array<{ id: string; customer_name: string | null; total: number; payment_deadline: string }>>([]);
  const [realtimeAlerts, setRealtimeAlerts] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('notif-read-ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('notif-sound') !== 'off'; } catch { return true; }
  });
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const prevCountRef = useRef(0);

  // Persist read IDs
  useEffect(() => {
    try { localStorage.setItem('notif-read-ids', JSON.stringify([...readIds])); } catch {}
  }, [readIds]);

  // Persist sound preference
  useEffect(() => {
    try { localStorage.setItem('notif-sound', soundEnabled ? 'on' : 'off'); } catch {}
  }, [soundEnabled]);

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

  useEffect(() => {
    if (!adminUserId) return;
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 120_000);
    return () => clearInterval(interval);
  }, [adminUserId, fetchAlerts]);

  // Supabase Realtime subscriptions
  useEffect(() => {
    if (!adminUserId && !currentAuthId) return;

    const ordersChannel = supabase
      .channel('realtime-catalog-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'catalog_orders' },
        async (payload) => {
          const order = payload.new as any;
          const isAdmin = order.seller_id === adminUserId && currentAuthId === adminUserId;
          
          let isAssignedSeller = false;
          if (currentAuthId && currentAuthId !== adminUserId && order.customer_id) {
            const { data: customer } = await supabase
              .from('customers')
              .select('seller_auth_id')
              .eq('id', order.customer_id)
              .maybeSingle();
            isAssignedSeller = customer?.seller_auth_id === currentAuthId;
          }

          if (!isAdmin && !isAssignedSeller) return;

          const label = isAssignedSeller && !isAdmin ? '🛒 Pedido do seu cliente!' : '🛒 Novo pedido do catálogo!';
          const alert: Notification = {
            id: `rt-order-${order.id}`,
            type: 'new-order',
            title: label,
            description: `${order.customer_name} — R$ ${Number(order.total).toFixed(2)}`,
            icon: ShoppingCart,
            color: 'text-blue-500',
            timestamp: order.created_at,
            isNew: true,
          };
          setRealtimeAlerts(prev => [alert, ...prev.slice(0, 19)]);
          setHasNewAlert(true);
          fetchAlerts();
          if (soundEnabled) playNotificationSound();
          toast.info(`${label} ${order.customer_name} — R$ ${Number(order.total).toFixed(2)}`, {
            duration: 8000,
            action: { label: 'Ver pedido', onClick: () => onNavigate('orders') },
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
          const isAdmin = sale.user_id === adminUserId && currentAuthId === adminUserId;
          const isOwnSale = sale.seller_auth_id === currentAuthId && currentAuthId !== adminUserId;

          if (!isAdmin && !isOwnSale) return;

          const label = isOwnSale && !isAdmin ? '💰 Sua venda foi registrada!' : '💰 Nova venda registrada!';
          const alert: Notification = {
            id: `rt-sale-${sale.id}`,
            type: 'new-sale',
            title: label,
            description: `${sale.customer_name || 'Cliente balcão'} — R$ ${Number(sale.total).toFixed(2)}${sale.seller_name ? ` (${sale.seller_name})` : ''}`,
            icon: Zap,
            color: 'text-green-500',
            timestamp: sale.created_at,
            isNew: true,
          };
          setRealtimeAlerts(prev => [alert, ...prev.slice(0, 19)]);
          setHasNewAlert(true);
          if (soundEnabled) playNotificationSound();
          toast.success(`${label} ${sale.customer_name || 'Cliente balcão'} — R$ ${Number(sale.total).toFixed(2)}`, {
            duration: 8000,
            action: { label: 'Ver histórico', onClick: () => onNavigate('history') },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(salesChannel);
    };
  }, [adminUserId, currentAuthId, fetchAlerts, soundEnabled, onNavigate]);

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
        customerLastPurchase.set(sale.customer_id, { name: sale.customer_name || 'Cliente', lastDate: date });
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

  const notifications: Notification[] = useMemo(() => {
    const items: Notification[] = [];

    // Realtime alerts first (newest)
    items.push(...realtimeAlerts.filter(a => !items.some(i => i.id === a.id)));

    for (const p of overduePayables) {
      items.push({
        id: `payable-${p.id}`,
        type: 'overdue',
        title: 'Conta a pagar vencida',
        description: `${p.supplier_name} — R$ ${Number(p.amount).toFixed(2)} (venc. ${new Date(p.due_date + 'T12:00:00').toLocaleDateString('pt-BR')})`,
        icon: Clock,
        color: 'text-destructive',
      });
    }

    for (const s of overdueSales) {
      items.push({
        id: `sale-overdue-${s.id}`,
        type: 'overdue',
        title: 'Recebimento atrasado',
        description: `${s.customer_name || 'Cliente'} — R$ ${Number(s.total).toFixed(2)} (venc. ${new Date(s.payment_deadline + 'T12:00:00').toLocaleDateString('pt-BR')})`,
        icon: Clock,
        color: 'text-destructive',
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

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  // Detect new notifications for animation
  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      setHasNewAlert(true);
    }
    prevCountRef.current = notifications.length;
  }, [notifications.length]);

  // Clear animation when popover opens
  useEffect(() => {
    if (open) setHasNewAlert(false);
  }, [open]);

  const handleMarkAllRead = () => {
    const allIds = new Set(readIds);
    notifications.forEach(n => allIds.add(n.id));
    setReadIds(allIds);
  };

  const handleClick = (n: Notification) => {
    setReadIds(prev => new Set(prev).add(n.id));
    setOpen(false);
    if (n.type === 'low-stock') onNavigate('low-stock');
    else if (n.type === 'new-order') onNavigate('orders');
    else if (n.type === 'new-sale') onNavigate('history');
    else if (n.type === 'repurchase') onNavigate('repurchase-alerts');
    else if (n.type === 'overdue') {
      if (n.id.startsWith('payable-')) onNavigate('accounts-payable');
      else onNavigate('accounts-receivable');
    }
  };

  const BellIcon = hasNewAlert ? BellRing : Bell;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" title="Notificações">
          <BellIcon className={`w-4 h-4 transition-all ${hasNewAlert ? 'text-primary animate-bounce' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping" />
              <Badge
                className="relative h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground border-0 flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">{unreadCount} nova{unreadCount > 1 ? 's' : ''}</Badge>
            )}
          </h4>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title={soundEnabled ? 'Desativar som' : 'Ativar som'}
              onClick={() => setSoundEnabled(p => !p)}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="w-3 h-3" /> Ler tudo
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Tudo certo! Nenhum alerta no momento.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => {
                const Icon = n.icon;
                const isUnread = !readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left ${
                      isUnread ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className={`mt-0.5 ${n.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        <p className={`text-sm leading-tight ${isUnread ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                      </div>
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
