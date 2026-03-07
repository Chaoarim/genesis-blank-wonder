import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, DollarSign, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Sale } from '@/hooks/useSalesData';

interface SellerSummary {
  sellerAuthId: string | null;
  sellerName: string;
  totalSales: number;
  totalAmount: number;
  commissionAmount: number;
}

interface Commission {
  id: string;
  type: string;
  reference: string | null;
  commission_percent: number;
  commission_fixed: number;
}

interface Props {
  sales: Sale[];
  userId: string;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function SellerCommissionsReport({ sales, userId }: Props) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('sales_commissions')
        .select('*')
        .eq('user_id', userId);
      setCommissions((data || []) as Commission[]);
    };
    load();
  }, [userId]);

  const now = new Date();
  const filteredSales = sales.filter(s => {
    if (s.status !== 'completed') return false;
    const d = new Date(s.created_at);
    if (period === 'today') return d.toDateString() === now.toDateString();
    if (period === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return d >= weekStart;
    }
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const calcCommission = useCallback((sale: Sale): number => {
    if (commissions.length === 0) return 0;
    let total = 0;
    // Order-level commissions
    const orderRules = commissions.filter(c => c.type === 'order');
    for (const rule of orderRules) {
      total += Number(sale.total) * (Number(rule.commission_percent) / 100) + Number(rule.commission_fixed);
    }
    return total;
  }, [commissions]);

  // Group by seller
  const sellerMap = new Map<string, SellerSummary>();
  for (const sale of filteredSales) {
    const key = sale.seller_auth_id || '__admin__';
    const existing = sellerMap.get(key);
    const comm = calcCommission(sale);
    if (existing) {
      existing.totalSales += 1;
      existing.totalAmount += Number(sale.total);
      existing.commissionAmount += comm;
    } else {
      sellerMap.set(key, {
        sellerAuthId: sale.seller_auth_id,
        sellerName: sale.seller_name || 'Administrador',
        totalSales: 1,
        totalAmount: Number(sale.total),
        commissionAmount: comm,
      });
    }
  }

  const sellers = Array.from(sellerMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  const grandTotal = sellers.reduce((s, v) => s + v.totalAmount, 0);
  const grandCommission = sellers.reduce((s, v) => s + v.commissionAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Relatório de Vendas por Vendedor
        </h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Vendedores</span>
          </div>
          <p className="text-xl font-bold">{sellers.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Total Vendas</span>
          </div>
          <p className="text-xl font-bold">{filteredSales.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Faturamento</span>
          </div>
          <p className="text-xl font-bold">{fmt(grandTotal)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Comissões</span>
          </div>
          <p className="text-xl font-bold">{fmt(grandCommission)}</p>
        </Card>
      </div>

      {/* Seller table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          {sellers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Nenhuma venda no período selecionado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Vendas</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map(s => (
                  <TableRow key={s.sellerAuthId || 'admin'}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.sellerName}</span>
                        {!s.sellerAuthId && <Badge variant="secondary" className="text-[10px]">Admin</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{s.totalSales}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(s.totalAmount)}</TableCell>
                    <TableCell className="text-right font-medium text-amber-600">{fmt(s.commissionAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
