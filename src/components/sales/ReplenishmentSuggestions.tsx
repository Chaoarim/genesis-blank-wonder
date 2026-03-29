import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, Search, Download, TrendingUp, Package, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';

interface InventoryItem {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string | null;
  preco: number;
  qtd_estoque: number;
}

interface SaleItem {
  codigo: string;
  quantidade: number;
  created_at: string;
}

interface ReplenishmentRow {
  codigo: string;
  produto: string;
  fornecedor: string;
  qtd_estoque: number;
  preco: number;
  totalSold: number;
  avgMonthlySales: number;
  turnoverDays: number;
  abcClass: 'A' | 'B' | 'C';
  suggestedQty: number;
  daysUntilStockout: number;
  urgency: 'critical' | 'warning' | 'ok';
  revenue: number;
}

interface Props {
  adminUserId: string | null;
}

export function ReplenishmentSuggestions({ adminUserId }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAbc, setFilterAbc] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [sortField, setSortField] = useState<'urgency' | 'abcClass' | 'suggestedQty' | 'daysUntilStockout'>('urgency');
  const [sortAsc, setSortAsc] = useState(true);
  const [period, setPeriod] = useState('3');

  const fetchData = useCallback(async () => {
    if (!adminUserId) return;
    setLoading(true);

    const months = parseInt(period);
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const [invRes, siRes] = await Promise.all([
      supabase.from('inventory_items').select('id, codigo, produto, fornecedor, preco, qtd_estoque'),
      supabase.from('sale_items').select('codigo, quantidade, created_at').gte('created_at', since.toISOString()),
    ]);

    if (invRes.data) setInventory(invRes.data as InventoryItem[]);
    if (siRes.data) setSaleItems(siRes.data as SaleItem[]);
    setLoading(false);
  }, [adminUserId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = useMemo(() => {
    const months = parseInt(period);

    // Aggregate sales by codigo
    const salesMap = new Map<string, number>();
    saleItems.forEach(si => {
      salesMap.set(si.codigo, (salesMap.get(si.codigo) || 0) + si.quantidade);
    });

    // Build rows
    const raw: ReplenishmentRow[] = inventory.map(item => {
      const totalSold = salesMap.get(item.codigo) || 0;
      const avgMonthlySales = totalSold / months;
      const avgDailySales = avgMonthlySales / 30;
      const daysUntilStockout = avgDailySales > 0 ? Math.round(item.qtd_estoque / avgDailySales) : 999;
      const turnoverDays = avgDailySales > 0 ? Math.round(1 / avgDailySales) : 999;
      const revenue = totalSold * item.preco;

      // Suggested qty: enough for 2 months of sales minus current stock
      const suggestedQty = Math.max(0, Math.ceil(avgMonthlySales * 2) - item.qtd_estoque);

      let urgency: 'critical' | 'warning' | 'ok' = 'ok';
      if (daysUntilStockout <= 7 && avgMonthlySales > 0) urgency = 'critical';
      else if (daysUntilStockout <= 21 && avgMonthlySales > 0) urgency = 'warning';

      return {
        codigo: item.codigo,
        produto: item.produto,
        fornecedor: item.fornecedor || '',
        qtd_estoque: item.qtd_estoque,
        preco: item.preco,
        totalSold,
        avgMonthlySales,
        turnoverDays,
        abcClass: 'C' as 'A' | 'B' | 'C',
        suggestedQty,
        daysUntilStockout,
        urgency,
        revenue,
      };
    });

    // ABC classification by revenue
    const sorted = [...raw].sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = sorted.reduce((s, r) => s + r.revenue, 0);
    let cumulative = 0;
    sorted.forEach(r => {
      cumulative += r.revenue;
      const pct = totalRevenue > 0 ? cumulative / totalRevenue : 1;
      if (pct <= 0.8) r.abcClass = 'A';
      else if (pct <= 0.95) r.abcClass = 'B';
      else r.abcClass = 'C';
    });

    return sorted;
  }, [inventory, saleItems, period]);

  const filtered = useMemo(() => {
    let result = rows.filter(r => r.suggestedQty > 0 || filterUrgency !== 'all' || filterAbc !== 'all');

    // By default only show items needing replenishment
    if (filterUrgency === 'all' && filterAbc === 'all' && !search) {
      result = rows.filter(r => r.suggestedQty > 0);
    }

    if (filterAbc !== 'all') result = result.filter(r => r.abcClass === filterAbc);
    if (filterUrgency !== 'all') result = result.filter(r => r.urgency === filterUrgency);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => r.codigo.toLowerCase().includes(s) || r.produto.toLowerCase().includes(s) || r.fornecedor.toLowerCase().includes(s));
    }

    // Sort
    const urgencyOrder = { critical: 0, warning: 1, ok: 2 };
    const abcOrder = { A: 0, B: 1, C: 2 };
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'urgency') cmp = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      else if (sortField === 'abcClass') cmp = abcOrder[a.abcClass] - abcOrder[b.abcClass];
      else if (sortField === 'suggestedQty') cmp = b.suggestedQty - a.suggestedQty;
      else if (sortField === 'daysUntilStockout') cmp = a.daysUntilStockout - b.daysUntilStockout;
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [rows, search, filterAbc, filterUrgency, sortField, sortAsc]);

  const handleExport = () => {
    const data = filtered.map(r => ({
      Código: r.codigo,
      Produto: r.produto,
      Fornecedor: r.fornecedor,
      'Estoque Atual': r.qtd_estoque,
      'Vendas/Mês': Math.round(r.avgMonthlySales * 10) / 10,
      'Curva ABC': r.abcClass,
      'Dias até Zerar': r.daysUntilStockout >= 999 ? 'N/A' : r.daysUntilStockout,
      'Sugestão Repor': r.suggestedQty,
      Urgência: r.urgency === 'critical' ? 'CRÍTICO' : r.urgency === 'warning' ? 'ATENÇÃO' : 'OK',
    }));
    exportToExcel(data, 'sugestao-reposicao');
    toast.success('Excel exportado!');
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const criticalCount = rows.filter(r => r.urgency === 'critical').length;
  const warningCount = rows.filter(r => r.urgency === 'warning').length;
  const needReplenishment = rows.filter(r => r.suggestedQty > 0).length;

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" /> Sugestão de Reposição
          </h2>
          <p className="text-sm text-muted-foreground">Baseada na curva ABC e velocidade de giro</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
          <Download className="w-4 h-4" /> Exportar Excel
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-destructive/30">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
            <p className="text-[10px] text-muted-foreground">Críticos (&le; 7 dias)</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-600" />
            <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
            <p className="text-[10px] text-muted-foreground">Atenção (&le; 21 dias)</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <Package className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{needReplenishment}</p>
            <p className="text-[10px] text-muted-foreground">Precisam Reposição</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{rows.filter(r => r.abcClass === 'A').length}</p>
            <p className="text-[10px] text-muted-foreground">Itens Curva A</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Buscar código/produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 max-w-xs" />
        </div>
        <Select value={filterAbc} onValueChange={setFilterAbc}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Curvas</SelectItem>
            <SelectItem value="A">Curva A</SelectItem>
            <SelectItem value="B">Curva B</SelectItem>
            <SelectItem value="C">Curva C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUrgency} onValueChange={setFilterUrgency}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Urgências</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="warning">Atenção</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 mês</SelectItem>
            <SelectItem value="3">3 meses</SelectItem>
            <SelectItem value="6">6 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhum item precisa de reposição no momento</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Vendas/Mês</TableHead>
                    <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('abcClass')}>
                      <span className="flex items-center justify-center gap-1">ABC <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('daysUntilStockout')}>
                      <span className="flex items-center justify-end gap-1">Dias p/ Zerar <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => toggleSort('suggestedQty')}>
                      <span className="flex items-center justify-end gap-1">Repor <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer" onClick={() => toggleSort('urgency')}>
                      <span className="flex items-center justify-center gap-1">Urgência <ArrowUpDown className="w-3 h-3" /></span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map(r => (
                    <TableRow key={r.codigo}>
                      <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{r.produto}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.fornecedor || '—'}</TableCell>
                      <TableCell className="text-right">{r.qtd_estoque}</TableCell>
                      <TableCell className="text-right">{r.avgMonthlySales.toFixed(1)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`border-0 ${
                          r.abcClass === 'A' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                          r.abcClass === 'B' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                          'bg-muted text-muted-foreground'
                        }`}>{r.abcClass}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{r.daysUntilStockout >= 999 ? '—' : r.daysUntilStockout}</TableCell>
                      <TableCell className="text-right font-bold">{r.suggestedQty}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`border-0 ${
                          r.urgency === 'critical' ? 'bg-destructive/10 text-destructive' :
                          r.urgency === 'warning' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {r.urgency === 'critical' ? 'CRÍTICO' : r.urgency === 'warning' ? 'ATENÇÃO' : 'OK'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 100 && <p className="text-xs text-center text-muted-foreground py-2">Mostrando 100 de {filtered.length}</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
