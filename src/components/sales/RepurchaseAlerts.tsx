import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, BellRing, MessageCircle, Clock } from 'lucide-react';
import { Sale, Customer } from '@/hooks/useSalesData';

interface RepurchaseAlertsProps {
  sales: Sale[];
  customers: Customer[];
}

export function RepurchaseAlerts({ sales, customers }: RepurchaseAlertsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [daysFilter, setDaysFilter] = useState('30');

  // Logic: Find customers whose last purchase was exactly around X days ago, or who haven't bought in X days
  const alerts = useMemo(() => {
    const thresholdDays = parseInt(daysFilter, 10);
    const now = new Date();
    
    // Get last purchase date per customer
    const lastPurchaseByCustomer = new Map<string, Date>();
    
    sales.forEach(sale => {
      if (sale.status !== 'completed') return;
      if (!sale.customer_id) return;
      
      const saleDate = new Date(sale.created_at);
      const currentLast = lastPurchaseByCustomer.get(sale.customer_id);
      
      if (!currentLast || saleDate > currentLast) {
        lastPurchaseByCustomer.set(sale.customer_id, saleDate);
      }
    });

    const alertsList = [];

    lastPurchaseByCustomer.forEach((lastDate, customerId) => {
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= thresholdDays) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          alertsList.push({
            customer,
            daysSinceLastPurchase: diffDays,
            lastPurchaseDate: lastDate
          });
        }
      }
    });

    // Sort by days since last purchase (descending)
    alertsList.sort((a, b) => b.daysSinceLastPurchase - a.daysSinceLastPurchase);

    return alertsList.filter(alert => 
      alert.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alert.customer.phone && alert.customer.phone.includes(searchTerm))
    );
  }, [sales, customers, daysFilter, searchTerm]);

  const handleWhatsApp = (customer: Customer, days: number) => {
    const text = `Olá ${customer.name}, tudo bem? Notamos que sua última compra conosco foi há ${days} dias. Precisando de alguma peça ou cotação para hoje? Estamos à disposição!`;
    window.open(`https://wa.me/${customer.phone?.replace(/\D/g, '') || customer.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" />
            Alertas de Recompra
          </h2>
          <p className="text-muted-foreground">
            Acompanhe clientes inativos e sugira novas compras.
          </p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/20 pb-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={daysFilter} onValueChange={setDaysFilter}>
                <SelectTrigger>
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground"/>
                  <SelectValue placeholder="Inativos há..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">+15 dias sem comprar</SelectItem>
                  <SelectItem value="30">+30 dias sem comprar</SelectItem>
                  <SelectItem value="60">+60 dias sem comprar</SelectItem>
                  <SelectItem value="90">+90 dias sem comprar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Última Compra</TableHead>
                  <TableHead>Inatividade</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum cliente encontrado com este filtro de inatividade.
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{alert.customer.name}</TableCell>
                      <TableCell>{alert.customer.phone || alert.customer.whatsapp || 'Sem contato'}</TableCell>
                      <TableCell>
                        {alert.lastPurchaseDate.toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.daysSinceLastPurchase > 60 ? "destructive" : "secondary"}>
                          {alert.daysSinceLastPurchase} dias
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                          onClick={() => handleWhatsApp(alert.customer, alert.daysSinceLastPurchase)}
                          disabled={!alert.customer.phone && !alert.customer.whatsapp}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Cobrar Recompra
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
