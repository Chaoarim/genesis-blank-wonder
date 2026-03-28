import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, BellRing, MessageCircle, Clock, AlertTriangle, AlertCircle, Info, TrendingDown, Users, DollarSign } from 'lucide-react';
import { Sale, Customer } from '@/hooks/useSalesData';

interface RepurchaseAlertsProps {
  sales: Sale[];
  customers: Customer[];
}

interface AlertItem {
  customer: Customer;
  daysSinceLastPurchase: number;
  lastPurchaseDate: Date;
  totalPurchases: number;
  totalSpent: number;
  avgInterval: number; // average days between purchases
  urgency: 'critical' | 'high' | 'medium' | 'low';
  overdueDays: number; // how many days past their avg interval
}

const URGENCY_CONFIG = {
  critical: { label: 'Crítico', color: 'bg-red-500/15 text-red-600 border-red-500/30', icon: AlertTriangle, dotColor: 'bg-red-500' },
  high: { label: 'Alto', color: 'bg-orange-500/15 text-orange-600 border-orange-500/30', icon: AlertCircle, dotColor: 'bg-orange-500' },
  medium: { label: 'Médio', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30', icon: Clock, dotColor: 'bg-amber-500' },
  low: { label: 'Baixo', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: Info, dotColor: 'bg-blue-500' },
};

const MESSAGE_TEMPLATES = [
  { id: 'friendly', label: '🤝 Amigável', template: (name: string, days: number) => `Olá ${name}, tudo bem? Faz ${days} dias desde sua última compra conosco. Precisando de alguma peça? Estamos à disposição! 😊` },
  { id: 'promo', label: '🏷️ Promoção', template: (name: string, days: number) => `Olá ${name}! Sentimos sua falta 😄 Temos condições especiais para clientes fiéis como você. Quer saber mais? Faz ${days} dias que não nos vemos!` },
  { id: 'direct', label: '🎯 Direto', template: (name: string, days: number) => `${name}, boa tarde! Vi que sua última compra foi há ${days} dias. Precisa de alguma cotação ou reposição de peças? Posso ajudar agora!` },
  { id: 'urgency', label: '⚡ Urgência', template: (name: string, days: number) => `Oi ${name}! Notei que faz ${days} dias desde seu último pedido. Algum veículo precisando de manutenção? Temos estoque pronto para entrega hoje!` },
];

export function RepurchaseAlerts({ sales, customers }: RepurchaseAlertsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [daysFilter, setDaysFilter] = useState('auto');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [messageTemplate, setMessageTemplate] = useState('friendly');

  const alerts = useMemo(() => {
    const now = new Date();

    // Build purchase history per customer
    const historyByCustomer = new Map<string, { dates: Date[]; totalSpent: number }>();

    sales.forEach(sale => {
      if (sale.status !== 'completed' || !sale.customer_id) return;
      const entry = historyByCustomer.get(sale.customer_id) || { dates: [], totalSpent: 0 };
      entry.dates.push(new Date(sale.created_at));
      entry.totalSpent += sale.total;
      historyByCustomer.set(sale.customer_id, entry);
    });

    const alertsList: AlertItem[] = [];

    historyByCustomer.forEach((history, customerId) => {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const sortedDates = history.dates.sort((a, b) => a.getTime() - b.getTime());
      const lastDate = sortedDates[sortedDates.length - 1];
      const diffDays = Math.ceil((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalPurchases = sortedDates.length;

      // Calculate average interval between purchases
      let avgInterval = 30; // default
      if (sortedDates.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < sortedDates.length; i++) {
          intervals.push(Math.ceil((sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)));
        }
        avgInterval = Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length);
      }

      // In "auto" mode, use personalized threshold (1.5x avg interval)
      const threshold = daysFilter === 'auto' ? Math.max(avgInterval * 1.5, 15) : parseInt(daysFilter, 10);
      if (diffDays < threshold) return;

      const overdueDays = Math.max(0, diffDays - avgInterval);

      // Determine urgency based on how overdue relative to their pattern
      let urgency: AlertItem['urgency'] = 'low';
      if (overdueDays > avgInterval * 2) urgency = 'critical';
      else if (overdueDays > avgInterval) urgency = 'high';
      else if (overdueDays > avgInterval * 0.5) urgency = 'medium';

      alertsList.push({
        customer,
        daysSinceLastPurchase: diffDays,
        lastPurchaseDate: lastDate,
        totalPurchases,
        totalSpent: history.totalSpent,
        avgInterval,
        urgency,
        overdueDays,
      });
    });

    // Sort by urgency then by overdue days
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alertsList.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || b.overdueDays - a.overdueDays);

    return alertsList.filter(alert => {
      const matchSearch = alert.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (alert.customer.phone?.includes(searchTerm)) ||
        (alert.customer.whatsapp?.includes(searchTerm));
      const matchUrgency = urgencyFilter === 'all' || alert.urgency === urgencyFilter;
      return matchSearch && matchUrgency;
    });
  }, [sales, customers, daysFilter, searchTerm, urgencyFilter]);

  // Summary counts
  const summary = useMemo(() => {
    const all = alerts;
    return {
      total: all.length,
      critical: all.filter(a => a.urgency === 'critical').length,
      high: all.filter(a => a.urgency === 'high').length,
      medium: all.filter(a => a.urgency === 'medium').length,
      totalRevenue: all.reduce((s, a) => s + a.totalSpent, 0),
    };
  }, [alerts]);

  const handleWhatsApp = (customer: Customer, days: number) => {
    const tmpl = MESSAGE_TEMPLATES.find(t => t.id === messageTemplate) || MESSAGE_TEMPLATES[0];
    const text = tmpl.template(customer.name, days);
    const phone = customer.whatsapp?.replace(/\D/g, '') || customer.phone?.replace(/\D/g, '') || '';
    if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          Alertas de Recompra Inteligentes
        </h2>
        <p className="text-sm text-muted-foreground">
          Detecta automaticamente clientes inativos baseado no padrão de compra individual
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setUrgencyFilter('all')}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="text-2xl font-bold">{summary.total}</p>
        </Card>
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setUrgencyFilter('critical')}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Críticos</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
        </Card>
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setUrgencyFilter('high')}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs text-muted-foreground">Alto</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
        </Card>
        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setUrgencyFilter(urgencyFilter === 'medium' ? 'all' : 'medium')}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Receita em risco</span>
          </div>
          <p className="text-lg font-bold">{fmt(summary.totalRevenue)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardHeader className="pb-0 pt-4 px-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={daysFilter} onValueChange={setDaysFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">🤖 Automático (IA)</SelectItem>
                <SelectItem value="15">+15 dias</SelectItem>
                <SelectItem value="30">+30 dias</SelectItem>
                <SelectItem value="60">+60 dias</SelectItem>
                <SelectItem value="90">+90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={messageTemplate} onValueChange={setMessageTemplate}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {daysFilter === 'auto' && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              Modo automático: alerta quando o cliente ultrapassa 1.5× seu intervalo médio de compras
            </p>
          )}
        </CardHeader>

        <CardContent className="p-0 mt-3">
          {alerts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <BellRing className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum alerta encontrado</p>
              <p className="text-sm">Todos os clientes estão dentro do padrão de compra!</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-2 p-4 md:hidden">
                {alerts.map((alert, idx) => {
                  const cfg = URGENCY_CONFIG[alert.urgency];
                  return (
                    <div key={idx} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{alert.customer.name}</span>
                        <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground">{alert.daysSinceLastPurchase}d</p>
                          <p>Inativo</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{alert.totalPurchases}x</p>
                          <p>Compras</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">~{alert.avgInterval}d</p>
                          <p>Intervalo</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{fmt(alert.totalSpent)} total</span>
                        <span>{alert.lastPurchaseDate.toLocaleDateString('pt-BR')}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5"
                        onClick={() => handleWhatsApp(alert.customer, alert.daysSinceLastPurchase)}
                        disabled={!alert.customer.phone && !alert.customer.whatsapp}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Enviar WhatsApp
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Urgência</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Inatividade</TableHead>
                      <TableHead>Intervalo Médio</TableHead>
                      <TableHead>Compras</TableHead>
                      <TableHead>Total Gasto</TableHead>
                      <TableHead>Última Compra</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert, idx) => {
                      const cfg = URGENCY_CONFIG[alert.urgency];
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="outline" className={cfg.color}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} mr-1.5`} />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{alert.customer.name}</TableCell>
                          <TableCell>
                            <span className="font-mono">{alert.daysSinceLastPurchase} dias</span>
                            {alert.overdueDays > 0 && (
                              <span className="text-xs text-red-500 ml-1">(+{alert.overdueDays}d)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">~{alert.avgInterval} dias</TableCell>
                          <TableCell>{alert.totalPurchases}x</TableCell>
                          <TableCell className="font-medium">{fmt(alert.totalSpent)}</TableCell>
                          <TableCell className="text-muted-foreground">{alert.lastPurchaseDate.toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => handleWhatsApp(alert.customer, alert.daysSinceLastPurchase)}
                              disabled={!alert.customer.phone && !alert.customer.whatsapp}
                            >
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
