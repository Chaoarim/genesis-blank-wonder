import { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Loader2, TrendingUp, Package, Medal, Crown, DollarSign, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { downloadHtmlAsPdf } from '@/lib/htmlToPdf';
import type { Sale } from '@/hooks/useSalesData';

interface Props {
  allSales: Sale[];
  getSaleItems: (saleId: string) => Promise<any[]>;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function MonthlyReport({ allSales, getSaleItems }: Props) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [topProducts, setTopProducts] = useState<{ produto: string; total: number; qtd: number }[]>([]);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Month sales
  const monthSales = useMemo(() =>
    allSales.filter(s => s.status === 'completed' &&
      new Date(s.created_at).getMonth() === selectedMonth &&
      new Date(s.created_at).getFullYear() === selectedYear
    ), [allSales, selectedMonth, selectedYear]);

  const totalRevenue = monthSales.reduce((s, v) => s + Number(v.total), 0);
  const totalSalesCount = monthSales.length;
  const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  const totalDiscount = monthSales.reduce((s, v) => s + Number(v.discount), 0);

  // Daily breakdown
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayTotal = monthSales
        .filter(s => new Date(s.created_at).getDate() === day)
        .reduce((sum, s) => sum + Number(s.total), 0);
      return { day: String(day), total: dayTotal };
    });
  }, [monthSales, selectedMonth, selectedYear]);

  // Seller ranking
  const sellerRanking = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    monthSales.forEach(s => {
      const name = s.seller_name || 'Dono';
      const prev = map.get(name) || { name, total: 0, count: 0 };
      prev.total += Number(s.total);
      prev.count += 1;
      map.set(name, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [monthSales]);

  // Customer ranking
  const customerRanking = useMemo(() => {
    const map = new Map<string, number>();
    monthSales.forEach(s => {
      const name = s.customer_name || 'Cliente balcão';
      map.set(name, (map.get(name) || 0) + Number(s.total));
    });
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [monthSales]);

  // Channel breakdown
  const channelData = useMemo(() => {
    const map = new Map<string, number>();
    monthSales.forEach(s => {
      const ch = s.channel === 'whatsapp' ? 'WhatsApp' : s.channel === 'catalogo_b2b' ? 'Catálogo B2B' : 'Balcão';
      map.set(ch, (map.get(ch) || 0) + Number(s.total));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [monthSales]);

  // Payment method breakdown
  const paymentData = useMemo(() => {
    const labels: Record<string, string> = { dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', boleto: 'Boleto', prazo: 'A Prazo', a_combinar: 'A Combinar' };
    const map = new Map<string, number>();
    monthSales.forEach(s => {
      const label = labels[s.payment_method] || s.payment_method;
      map.set(label, (map.get(label) || 0) + Number(s.total));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [monthSales]);

  // Load top products
  useEffect(() => {
    const load = async () => {
      const saleIds = monthSales.map(s => s.id);
      if (saleIds.length === 0) { setTopProducts([]); return; }

      const { data: items } = await supabase
        .from('sale_items')
        .select('produto, quantidade, preco_unitario')
        .in('sale_id', saleIds.slice(0, 200));

      if (!items) { setTopProducts([]); return; }

      const prodMap = new Map<string, { total: number; qtd: number }>();
      items.forEach(i => {
        const prev = prodMap.get(i.produto) || { total: 0, qtd: 0 };
        prev.total += Number(i.preco_unitario) * Number(i.quantidade);
        prev.qtd += Number(i.quantidade);
        prodMap.set(i.produto, prev);
      });

      setTopProducts(
        Array.from(prodMap.entries())
          .map(([produto, v]) => ({ produto, ...v }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10)
      );
    };
    load();
  }, [monthSales]);

  // Month options
  const monthOptions = useMemo(() => {
    const options: { month: number; year: number; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({ month: d.getMonth(), year: d.getFullYear(), label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
    }
    return options;
  }, []);

  const handleExportPDF = async () => {
    setGenerating(true);
    const html = buildReportHtml();
    downloadHtmlAsPdf(html, `relatorio-${MONTH_NAMES[selectedMonth].toLowerCase()}-${selectedYear}`);
    setTimeout(() => setGenerating(false), 2000);
  };

  const buildReportHtml = () => {
    const title = `Relatório de Vendas — ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    return `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;padding:20px;color:#333">
        <h1 style="text-align:center;color:#1a1a2e;margin-bottom:5px">${title}</h1>
        <p style="text-align:center;color:#888;font-size:12px">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        <hr style="margin:15px 0;border-color:#eee"/>
        
        <div style="display:flex;gap:10px;margin-bottom:20px">
          <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:12px;text-align:center">
            <p style="font-size:11px;color:#666;margin:0">Faturamento</p>
            <p style="font-size:22px;font-weight:bold;color:#16a34a;margin:5px 0">${fmt(totalRevenue)}</p>
          </div>
          <div style="flex:1;background:#eff6ff;border-radius:8px;padding:12px;text-align:center">
            <p style="font-size:11px;color:#666;margin:0">Vendas</p>
            <p style="font-size:22px;font-weight:bold;color:#2563eb;margin:5px 0">${totalSalesCount}</p>
          </div>
          <div style="flex:1;background:#fefce8;border-radius:8px;padding:12px;text-align:center">
            <p style="font-size:11px;color:#666;margin:0">Ticket Médio</p>
            <p style="font-size:22px;font-weight:bold;color:#d97706;margin:5px 0">${fmt(avgTicket)}</p>
          </div>
        </div>

        ${totalDiscount > 0 ? `<p style="font-size:12px;color:#dc2626;text-align:right">Total em descontos: ${fmt(totalDiscount)}</p>` : ''}

        <h3 style="margin-top:20px;color:#1a1a2e">🏆 Top 10 Produtos</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:2px solid #ddd;background:#f9fafb">
            <th style="text-align:left;padding:8px">#</th>
            <th style="text-align:left;padding:8px">Produto</th>
            <th style="text-align:right;padding:8px">Qtd</th>
            <th style="text-align:right;padding:8px">Faturamento</th>
          </tr></thead>
          <tbody>
            ${topProducts.map((p, i) => `<tr style="border-bottom:1px solid #eee">
              <td style="padding:6px 8px;font-weight:bold">${i + 1}</td>
              <td style="padding:6px 8px">${p.produto}</td>
              <td style="text-align:right;padding:6px 8px">${p.qtd}</td>
              <td style="text-align:right;padding:6px 8px;font-weight:bold">${fmt(p.total)}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        ${sellerRanking.length > 0 ? `
        <h3 style="margin-top:20px;color:#1a1a2e">🥇 Ranking de Vendedores</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:2px solid #ddd;background:#f9fafb">
            <th style="text-align:left;padding:8px">#</th>
            <th style="text-align:left;padding:8px">Vendedor</th>
            <th style="text-align:right;padding:8px">Vendas</th>
            <th style="text-align:right;padding:8px">Faturamento</th>
          </tr></thead>
          <tbody>
            ${sellerRanking.map((s, i) => `<tr style="border-bottom:1px solid #eee">
              <td style="padding:6px 8px;font-weight:bold">${i + 1}</td>
              <td style="padding:6px 8px">${s.name}</td>
              <td style="text-align:right;padding:6px 8px">${s.count}</td>
              <td style="text-align:right;padding:6px 8px;font-weight:bold">${fmt(s.total)}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}

        <h3 style="margin-top:20px;color:#1a1a2e">👑 Top 10 Clientes</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:2px solid #ddd;background:#f9fafb">
            <th style="text-align:left;padding:8px">#</th>
            <th style="text-align:left;padding:8px">Cliente</th>
            <th style="text-align:right;padding:8px">Faturamento</th>
          </tr></thead>
          <tbody>
            ${customerRanking.map((c, i) => `<tr style="border-bottom:1px solid #eee">
              <td style="padding:6px 8px;font-weight:bold">${i + 1}</td>
              <td style="padding:6px 8px">${c.name}</td>
              <td style="text-align:right;padding:6px 8px;font-weight:bold">${fmt(c.total)}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <h3 style="margin-top:20px;color:#1a1a2e">📊 Por Canal de Venda</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:2px solid #ddd;background:#f9fafb">
            <th style="text-align:left;padding:8px">Canal</th>
            <th style="text-align:right;padding:8px">Faturamento</th>
          </tr></thead>
          <tbody>
            ${channelData.map(c => `<tr style="border-bottom:1px solid #eee">
              <td style="padding:6px 8px">${c.name}</td>
              <td style="text-align:right;padding:6px 8px;font-weight:bold">${fmt(c.value)}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <h3 style="margin-top:20px;color:#1a1a2e">💳 Por Forma de Pagamento</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:2px solid #ddd;background:#f9fafb">
            <th style="text-align:left;padding:8px">Pagamento</th>
            <th style="text-align:right;padding:8px">Faturamento</th>
          </tr></thead>
          <tbody>
            ${paymentData.map(p => `<tr style="border-bottom:1px solid #eee">
              <td style="padding:6px 8px">${p.name}</td>
              <td style="text-align:right;padding:6px 8px;font-weight:bold">${fmt(p.value)}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <p style="text-align:center;margin-top:30px;color:#999;font-size:11px">Relatório gerado automaticamente pelo sistema</p>
      </div>
    `;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Relatório Mensal</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={`${selectedMonth}-${selectedYear}`}
            onValueChange={v => {
              const [m, y] = v.split('-');
              setSelectedMonth(Number(m));
              setSelectedYear(Number(y));
            }}
          >
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportPDF} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-green-500" /><span className="text-xs text-muted-foreground">Faturamento</span></div>
          <p className="text-xl font-bold">{fmt(totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">Vendas</span></div>
          <p className="text-xl font-bold">{totalSalesCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-amber-500" /><span className="text-xs text-muted-foreground">Ticket Médio</span></div>
          <p className="text-xl font-bold">{fmt(avgTicket)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-purple-500" /><span className="text-xs text-muted-foreground">Descontos</span></div>
          <p className="text-xl font-bold">{fmt(totalDiscount)}</p>
        </Card>
      </div>

      {/* Daily chart */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Vendas por Dia</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={l => `Dia ${l}`} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top products */}
      {topProducts.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Top 10 Produtos
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.slice(0, 5)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="produto" tick={{ fontSize: 10 }} width={130} tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + '…' : v} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {topProducts.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.produto} className="flex items-center gap-2 text-sm">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-xs">{p.produto}</p>
                    <p className="text-xs text-muted-foreground">{p.qtd} un.</p>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">{fmt(p.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Seller ranking */}
      {sellerRanking.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Medal className="w-4 h-4 text-primary" /> Ranking de Vendedores
          </h3>
          <div className="space-y-2">
            {sellerRanking.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}º</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.count} vendas</p>
                </div>
                <span className="text-sm font-bold text-primary">{fmt(s.total)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Customer ranking */}
      {customerRanking.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" /> Top 10 Clientes
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={customerRanking.slice(0, 5)} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                    {customerRanking.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {customerRanking.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between p-2 rounded-lg border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ backgroundColor: COLORS[i % COLORS.length] }}>{i + 1}</span>
                    <span className="text-sm font-medium truncate">{c.name}</span>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">{fmt(c.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Channel & payment breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {channelData.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Por Canal</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        {paymentData.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Por Pagamento</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
