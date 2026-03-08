import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, DollarSign, Users, TrendingUp, Printer, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { downloadHtmlAsPdf, printHtml } from '@/lib/htmlToPdf';
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
  sellerName?: string | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function SellerCommissionsReport({ sales, userId, sellerName }: Props) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [period, setPeriod] = useState('month');
  const [sellerFilter, setSellerFilter] = useState('all');

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
  const periodFiltered = sales.filter(s => {
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

  // Apply seller filter (admin only)
  const filteredSales = !sellerName && sellerFilter !== 'all'
    ? periodFiltered.filter(s => (s.seller_auth_id || '__admin__') === sellerFilter)
    : periodFiltered;

  // Unique sellers list for filter dropdown
  const uniqueSellers = !sellerName ? Array.from(
    new Map(periodFiltered.map(s => [s.seller_auth_id || '__admin__', s.seller_name || 'Administrador'])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1])) : [];

  const activeSellerLabel = sellerFilter !== 'all'
    ? uniqueSellers.find(([id]) => id === sellerFilter)?.[1] || ''
    : '';

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

  const reportTitle = !sellerName && activeSellerLabel
    ? `Relatório — ${activeSellerLabel}`
    : sellerName ? `Relatório — ${sellerName}` : 'Relatório de Vendas por Vendedor';

  const buildReportHtml = () => {
    const periodLabel = period === 'today' ? 'Hoje' : period === 'week' ? 'Esta Semana' : period === 'month' ? 'Este Mês' : 'Tudo';
    const showSellerCol = !sellerName && sellerFilter === 'all';
    const rows = filteredSales.map((sale, idx) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${idx + 1}</td>
        ${showSellerCol ? `<td style="padding:6px 8px;border-bottom:1px solid #eee">${sale.seller_name || 'Administrador'}</td>` : ''}
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${sale.customer_name || 'Cliente balcão'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${new Date(sale.created_at).toLocaleDateString('pt-BR')} ${new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(Number(sale.total))}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${fmt(calcCommission(sale))}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Vendas</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:32px;max-width:900px;margin:auto}
      h1{font-size:20px;margin-bottom:4px}
      .meta{color:#666;font-size:13px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{text-align:left;padding:8px;border-bottom:2px solid #333;font-size:11px;text-transform:uppercase;color:#555}
      .summary{text-align:right;margin-top:8px;font-size:14px}
      .summary .total{font-size:18px;font-weight:700}
      .footer{margin-top:24px;text-align:center;font-size:11px;color:#999}
      @media print{body{padding:16px}}</style></head><body>
      <h1>${reportTitle}</h1>
      <div class="meta"><p><strong>Período:</strong> ${periodLabel}</p><p><strong>Total de vendas:</strong> ${filteredSales.length}</p></div>
      <table><thead><tr>
        <th>#</th>
        ${showSellerCol ? '<th>Vendedor</th>' : ''}
        <th>Cliente</th><th>Data</th><th style="text-align:right">Valor</th><th style="text-align:right">Comissão</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <div class="summary">
        <p>Total Vendido: ${fmt(grandTotal)}</p>
        <p class="total">Total Comissões: ${fmt(grandCommission)}</p>
      </div>
      <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')}</div></body></html>`;
  };

  const handlePrint = () => {
    printHtml(buildReportHtml());
  };

  const handleDownloadPdf = () => {
    const periodLabel = period === 'today' ? 'Hoje' : period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Tudo';
    const sellerSuffix = activeSellerLabel ? `_${activeSellerLabel.replace(/\s+/g, '_')}` : '';
    downloadHtmlAsPdf(buildReportHtml(), `Relatorio_Vendas${sellerSuffix}_${periodLabel}_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {sellerName ? `Meu Relatório — ${sellerName}` : 'Relatório de Vendas por Vendedor'}
        </h2>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={filteredSales.length === 0}>
            <Printer className="w-4 h-4 mr-1" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={filteredSales.length === 0}>
            <FileDown className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>
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

      {/* Seller summary table */}
      {!sellerName && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Vendedor</CardTitle>
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
      )}

      {/* Detailed sales list with customer and date */}
      <Card>
        <CardHeader>
          <CardTitle>{sellerName ? 'Minhas Vendas Detalhadas' : 'Todas as Vendas Detalhadas'}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Nenhuma venda no período selecionado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!sellerName && <TableHead>Vendedor</TableHead>}
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map(sale => (
                    <TableRow key={sale.id}>
                      {!sellerName && (
                        <TableCell>
                          <span className="font-medium text-sm">{sale.seller_name || 'Administrador'}</span>
                        </TableCell>
                      )}
                      <TableCell>
                        <span className="text-sm">{sale.customer_name || 'Cliente balcão'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(sale.created_at).toLocaleDateString('pt-BR')} {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">{fmt(Number(sale.total))}</TableCell>
                      <TableCell className="text-right text-sm text-amber-600">{fmt(calcCommission(sale))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
