import { useState, useEffect, useMemo } from 'react';
import { MessageCircle, ShoppingBag, AlertTriangle, Target, BarChart3, Send, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhatsAppNotificationsProps {
  adminUserId: string | null;
  allSales: Array<{
    id: string;
    customer_name: string | null;
    total: number;
    created_at: string;
    status: string;
    paid_at: string | null;
    payment_deadline: string | null;
    seller_name: string | null;
    seller_auth_id: string | null;
  }>;
  sellers: Array<{ id: string; name: string; seller_auth_id: string | null; email: string }>;
  goals: Array<{ id: string; goal_amount: number; month: number; year: number; seller_auth_id: string | null }>;
}

interface NotificationTemplate {
  id: string;
  type: 'new-order' | 'overdue' | 'goal-reached' | 'daily-summary';
  label: string;
  icon: React.ElementType;
  color: string;
  enabled: boolean;
}

const STORAGE_KEY = 'whatsapp-notif-settings';

function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

function formatCurrency(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function WhatsAppNotifications({ adminUserId, allSales, sellers, goals }: WhatsAppNotificationsProps) {
  const [defaultPhone, setDefaultPhone] = useState('');
  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    { id: 'new-order', type: 'new-order', label: 'Novo pedido recebido', icon: ShoppingBag, color: 'text-blue-500', enabled: true },
    { id: 'overdue', type: 'overdue', label: 'Vencimento de cobrança', icon: AlertTriangle, color: 'text-red-500', enabled: true },
    { id: 'goal-reached', type: 'goal-reached', label: 'Meta atingida', icon: Target, color: 'text-green-500', enabled: true },
    { id: 'daily-summary', type: 'daily-summary', label: 'Resumo diário de vendas', icon: BarChart3, color: 'text-primary', enabled: true },
  ]);

  // Persist settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.phone) setDefaultPhone(parsed.phone);
        if (parsed.templates) {
          setTemplates(prev => prev.map(t => {
            const savedT = parsed.templates.find((s: any) => s.id === t.id);
            return savedT ? { ...t, enabled: savedT.enabled } : t;
          }));
        }
      }
    } catch {}
  }, []);

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      phone: defaultPhone,
      templates: templates.map(t => ({ id: t.id, enabled: t.enabled })),
    }));
    toast.success('Configurações salvas!');
  };

  const toggleTemplate = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  // Pending orders
  const [pendingOrders, setPendingOrders] = useState<Array<{ id: string; customer_name: string; total: number; created_at: string }>>([]);
  useEffect(() => {
    if (!adminUserId) return;
    supabase.from('catalog_orders')
      .select('id, customer_name, total, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setPendingOrders(data); });
  }, [adminUserId]);

  // Overdue sales
  const overdueSales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allSales.filter(s =>
      s.status === 'completed' && !s.paid_at && s.payment_deadline && s.payment_deadline <= today
    ).slice(0, 10);
  }, [allSales]);

  // Today stats
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = allSales.filter(s => s.status === 'completed' && s.created_at.startsWith(today));
    return {
      count: todaySales.length,
      total: todaySales.reduce((sum, s) => sum + s.total, 0),
    };
  }, [allSales]);

  // Goal achievement
  const goalStatus = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthSales = allSales.filter(s => {
      if (s.status !== 'completed') return false;
      const d = new Date(s.created_at);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
    const totalSold = monthSales.reduce((sum, s) => sum + s.total, 0);
    const currentGoal = goals.find(g => g.month === month && g.year === year && !g.seller_auth_id);
    return {
      sold: totalSold,
      goal: currentGoal?.goal_amount || 0,
      reached: currentGoal ? totalSold >= currentGoal.goal_amount : false,
      percent: currentGoal && currentGoal.goal_amount > 0 ? Math.round((totalSold / currentGoal.goal_amount) * 100) : 0,
    };
  }, [allSales, goals]);

  // Message generators
  const generateOrderMessage = (order: { customer_name: string; total: number }) => {
    return `🛒 *Novo Pedido Recebido!*\n\nCliente: ${order.customer_name}\nValor: ${formatCurrency(order.total)}\n\nAcesse o sistema para confirmar o pedido.`;
  };

  const generateOverdueMessage = (sale: { customer_name: string | null; total: number; payment_deadline: string | null }) => {
    const deadline = sale.payment_deadline ? new Date(sale.payment_deadline + 'T12:00:00').toLocaleDateString('pt-BR') : '';
    return `⚠️ *Cobrança Vencida!*\n\nCliente: ${sale.customer_name || 'N/A'}\nValor: ${formatCurrency(sale.total)}\nVencimento: ${deadline}\n\nVerifique e entre em contato com o cliente.`;
  };

  const generateGoalMessage = () => {
    return `🎯 *Meta ${goalStatus.reached ? 'Atingida! 🎉' : 'em andamento'}*\n\nProgresso: ${goalStatus.percent}%\nVendido: ${formatCurrency(goalStatus.sold)}\nMeta: ${formatCurrency(goalStatus.goal)}\n\n${goalStatus.reached ? 'Parabéns! Continue assim!' : 'Vamos lá, falta pouco!'}`;
  };

  const generateDailySummary = () => {
    return `📊 *Resumo do Dia — ${new Date().toLocaleDateString('pt-BR')}*\n\n🛒 Vendas: ${todayStats.count}\n💰 Total: ${formatCurrency(todayStats.total)}\n📈 Meta mensal: ${goalStatus.percent}%\n⚠️ Cobranças vencidas: ${overdueSales.length}\n📦 Pedidos pendentes: ${pendingOrders.length}\n\nBom trabalho!`;
  };

  const sendViaWhatsApp = (message: string, phone?: string) => {
    const targetPhone = phone || defaultPhone;
    if (!targetPhone) {
      toast.error('Informe um número de WhatsApp primeiro!');
      return;
    }
    const url = buildWhatsAppLink(targetPhone, message);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          Notificações por WhatsApp
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Envie alertas diretamente pelo WhatsApp para vendedores e gestores
        </p>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configurações</CardTitle>
          <CardDescription>Número padrão e tipos de notificação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="default-phone" className="text-xs">Número WhatsApp padrão (com DDD)</Label>
              <Input
                id="default-phone"
                placeholder="11999999999"
                value={defaultPhone}
                onChange={(e) => setDefaultPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={saveSettings} className="self-end gap-1.5" size="sm">
              Salvar configurações
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-semibold">Tipos de notificação</Label>
            {templates.map(t => {
              const Icon = t.icon;
              return (
                <div key={t.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${t.color}`} />
                    <span className="text-sm">{t.label}</span>
                  </div>
                  <Switch checked={t.enabled} onCheckedChange={() => toggleTemplate(t.id)} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Daily Summary */}
        <Card className="border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Resumo Diário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>🛒 Vendas hoje: <strong>{todayStats.count}</strong></p>
              <p>💰 Total: <strong>{formatCurrency(todayStats.total)}</strong></p>
              <p>📈 Meta mensal: <strong>{goalStatus.percent}%</strong></p>
            </div>
            <Button
              size="sm"
              className="w-full gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => sendViaWhatsApp(generateDailySummary())}
              disabled={!templates.find(t => t.id === 'daily-summary')?.enabled}
            >
              <Send className="w-3.5 h-3.5" />
              Enviar Resumo
            </Button>
          </CardContent>
        </Card>

        {/* Goal Status */}
        <Card className={goalStatus.reached ? 'border-green-500/30' : 'border-amber-500/20'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className={`w-4 h-4 ${goalStatus.reached ? 'text-green-500' : 'text-amber-500'}`} />
              Status da Meta
              {goalStatus.reached && <Badge className="bg-green-500 text-white text-[10px]">Atingida!</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Progresso: <strong>{goalStatus.percent}%</strong></p>
              <p>Vendido: <strong>{formatCurrency(goalStatus.sold)}</strong></p>
              <p>Meta: <strong>{formatCurrency(goalStatus.goal)}</strong></p>
            </div>
            <Button
              size="sm"
              variant={goalStatus.reached ? 'default' : 'outline'}
              className="w-full gap-1.5"
              onClick={() => sendViaWhatsApp(generateGoalMessage())}
              disabled={!templates.find(t => t.id === 'goal-reached')?.enabled}
            >
              <Send className="w-3.5 h-3.5" />
              Enviar Status
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-500" />
              Pedidos Pendentes
              <Badge variant="secondary" className="text-[10px]">{pendingOrders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {pendingOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(order.total)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => sendViaWhatsApp(generateOrderMessage(order))}
                      disabled={!templates.find(t => t.id === 'new-order')?.enabled}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Avisar
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Overdue Payments */}
      {overdueSales.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Cobranças Vencidas
              <Badge variant="destructive" className="text-[10px]">{overdueSales.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {overdueSales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{sale.customer_name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(sale.total)} — venc. {sale.payment_deadline ? new Date(sale.payment_deadline + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => sendViaWhatsApp(generateOverdueMessage(sale))}
                      disabled={!templates.find(t => t.id === 'overdue')?.enabled}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Cobrar
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Bulk send to all sellers */}
      {sellers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Send className="w-4 h-4" />
              Enviar para Vendedores
            </CardTitle>
            <CardDescription className="text-xs">Envie o resumo diário individualmente para cada vendedor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sellers.map(seller => (
                <div key={seller.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm font-medium">{seller.name}</p>
                    <p className="text-xs text-muted-foreground">{seller.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => {
                      // Build seller-specific summary
                      const sellerSales = allSales.filter(s =>
                        s.status === 'completed' && s.seller_auth_id === seller.seller_auth_id && s.created_at.startsWith(new Date().toISOString().split('T')[0])
                      );
                      const sellerTotal = sellerSales.reduce((sum, s) => sum + s.total, 0);
                      const msg = `📊 *Seu Resumo — ${new Date().toLocaleDateString('pt-BR')}*\n\nOlá ${seller.name}!\n\n🛒 Suas vendas hoje: ${sellerSales.length}\n💰 Total: ${formatCurrency(sellerTotal)}\n\nBom trabalho! 💪`;
                      // No phone stored for sellers, open with empty to let user choose
                      sendViaWhatsApp(msg);
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Enviar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
