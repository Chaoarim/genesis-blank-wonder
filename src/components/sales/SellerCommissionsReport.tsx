import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, DollarSign, Users, TrendingUp, Printer, FileDown, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { downloadHtmlAsPdf, printHtml } from '@/lib/htmlToPdf';
import { exportToExcel } from '@/lib/exportExcel';
import type { Sale, SaleItem } from '@/hooks/useSalesData';

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
  seller_auth_id: string | null;
  seller_name: string | null;
}

interface Props {
  sales: Sale[];
  userId: string;
  sellerName?: string | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function SellerCommissionsReport({ sales, userId, sellerName }: Props) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [saleItemsMap, setSaleItemsMap] = useState<Record<string, SaleItem[]>>({});
  const [period, setPeriod] = useState('month');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [loadingItems, setLoadingItems] = useState(false);

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

  // Load sale_items for product/supplier commission calculation
  const hasProductOrSupplierRules = commissions.some(c => c.type === 'product' || c.type === 'supplier');

  useEffect(() => {
    if (!hasProductOrSupplierRules || periodFiltered.length === 0) return;
    const saleIds = periodFiltered.map(s => s.id);
    const missingIds = saleIds.filter(id => !saleItemsMap[id]);
    if (missingIds.length === 0) return;

    setLoadingItems(true);
    const fetchItems = async () => {
      const { data } = await supabase
        .from('sale_items')
        .select('*')
        .in('sale_id', missingIds);
      if (data) {
        const grouped: Record<string, SaleItem[]> = { ...saleItemsMap };
        for (const item of data as SaleItem[]) {
          if (!grouped[item.sale_id]) grouped[item.sale_id] = [];
          grouped[item.sale_id].push(item);
        }
        setSaleItemsMap(grouped);
      }
      setLoadingItems(false);
    };
    fetchItems();
  }, [hasProductOrSupplierRules, periodFiltered.length, period]);

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
    const sellerAuthId = sale.seller_auth_id || null;

    // Helper: get applicable rules - seller-specific first, then global fallback
    const getApplicableRules = (type: string) => {
      const sellerRules = commissions.filter(c => c.type === type && c.seller_auth_id === sellerAuthId && sellerAuthId);
      const globalRules = commissions.filter(c => c.type === type && !c.seller_auth_id);
      // Use seller-specific if any exist for this type, otherwise use global
      return sellerRules.length > 0 ? sellerRules : globalRules;
    };

    // Order-level commissions
    const orderRules = getApplicableRules('order');
    for (const rule of orderRules) {
      total += Number(sale.total) * (Number(rule.commission_percent) / 100) + Number(rule.commission_fixed);
    }

    // Product and supplier-level commissions (per item)
    const items = saleItemsMap[sale.id] || [];
    const productRules = getApplicableRules('product');
    const supplierRules = getApplicableRules('supplier');

    for (const item of items) {
      const itemTotal = Number(item.quantidade) * Number(item.preco_unitario);

      for (const rule of productRules) {
        if (rule.reference && item.codigo.toLowerCase() === rule.reference.toLowerCase()) {
          total += itemTotal * (Number(rule.commission_percent) / 100) + Number(rule.commission_fixed);
        }
      }

      for (const rule of supplierRules) {
        if (rule.reference && item.fornecedor && item.fornecedor.toLowerCase().includes(rule.reference.toLowerCase())) {
          total += itemTotal * (Number(rule.commission_percent) / 100) + Number(rule.commission_fixed);
        }
      }
    }

    return total;
  }, [commissions, saleItemsMap]);

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
    : sellerName ? `Relatório — ${sellerName}` : 'Relatório de Comissões por Vendedor';

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

    // Commission rules summary
    const rulesHtml = commissions.length > 0 ? `
      <div style="margin-bottom:16px;padding:12px;background:#f8f9fa;border-radius:6px">
        <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:#333">Regras de Comissão Aplicadas</h3>
        <ul style="font-size:12px;color:#555;margin:0;padding-left:16px">
          ${commissions.map(c => {
            const typeLabel = c.type === 'order' ? 'Por Pedido' : c.type === 'product' ? `Por Produto (${c.reference})` : `Por Fornecedor (${c.reference})`;
            const values = [];
            if (Number(c.commission_percent) > 0) values.push(`${c.commission_percent}%`);
            if (Number(c.commission_fixed) > 0) values.push(`R$ ${Number(c.commission_fixed).toFixed(2)} fixo`);
            return `<li>${typeLabel}: ${values.join(' + ')}</li>`;
          }).join('')}
        </ul>
      </div>
    ` : '';

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Comissões</title>
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
      ${rulesHtml}
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
    downloadHtmlAsPdf(buildReportHtml(), `Relatorio_Comissoes${sellerSuffix}_${periodLabel}_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportExcel = () => {
    const periodLabel = period === 'today' ? 'Hoje' : period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Tudo';
    const sellerSuffix = activeSellerLabel ? `_${activeSellerLabel.replace(/\s+/g, '_')}` : '';
    const showSellerCol = !sellerName && sellerFilter === 'all';

    const rows = filteredSales.map((sale, idx) => {
      const row: Record<string, string | number | null> = {
        '#': idx + 1,
      };
      if (showSellerCol) row['Vendedor'] = sale.seller_name || 'Administrador';
      row['Cliente'] = sale.customer_name || 'Cliente balcão';
      row['Data'] = new Date(sale.created_at).toLocaleDateString('pt-BR');
      row['Hora'] = new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      row['Valor (R$)'] = Number(Number(sale.total).toFixed(2));
      row['Comissão (R$)'] = Number(calcCommission(sale).toFixed(2));
      return row;
    });

    // Add summary row
    rows.push({
      '#': null,
      'Cliente': 'TOTAL',
      'Data': '',
      'Hora': '',
      'Valor (R$)': Number(grandTotal.toFixed(2)),
      'Comissão (R$)': Number(grandCommission.toFixed(2)),
    });

    exportToExcel(rows, `Relatorio_Comissoes${sellerSuffix}_${periodLabel}_${new Date().toISOString().slice(0, 10)}`, 'Comissões');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {sellerName ? `Meu Relatório — ${sellerName}` : reportTitle}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {!sellerName && uniqueSellers.length > 0 && (
            <Select value={sellerFilter} onValueChange={setSellerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Vendedores</SelectItem>
                {uniqueSellers.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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

      {/* Active commission rules info */}
      {commissions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="py-3 px-4">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Regras de Comissão Ativas ({commissions.length})</p>
            <div className="flex flex-wrap gap-2">
              {commissions.map(c => {
                const typeLabel = c.type === 'order' ? 'Pedido' : c.type === 'product' ? `Produto: ${c.reference}` : `Fornec: ${c.reference}`;
                const sellerLabel = c.seller_name ? `[${c.seller_name}]` : '[Global]';
                const values = [];
                if (Number(c.commission_percent) > 0) values.push(`${c.commission_percent}%`);
                if (Number(c.commission_fixed) > 0) values.push(`R$${Number(c.commission_fixed).toFixed(2)}`);
                return (
                  <Badge key={c.id} variant="outline" className="text-xs bg-background">
                    {sellerLabel} {typeLabel} → {values.join(' + ')}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {loadingItems && hasProductOrSupplierRules && (
        <p className="text-xs text-muted-foreground text-center">Calculando comissões por produto/fornecedor...</p>
      )}

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

      {/* Detailed sales list */}
      <Card>
        <CardHeader>
          <CardTitle>{sellerName ? 'Minhas Vendas Detalhadas' : activeSellerLabel ? `Vendas — ${activeSellerLabel}` : 'Todas as Vendas Detalhadas'}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Nenhuma venda no período selecionado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!sellerName && sellerFilter === 'all' && <TableHead>Vendedor</TableHead>}
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map(sale => (
                    <TableRow key={sale.id}>
                      {!sellerName && sellerFilter === 'all' && (
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
