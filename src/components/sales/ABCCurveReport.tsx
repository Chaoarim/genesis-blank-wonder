import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Download, TrendingUp, Package, Filter } from "lucide-react";

interface SaleItem {
  codigo: string;
  produto: string;
  fornecedor?: string | null;
  preco_unitario: number;
  quantidade: number;
}

interface Sale {
  id: string;
  created_at: string;
  status: string;
}

interface ABCCurveReportProps {
  sales: Sale[];
  getSaleItems: (saleId: string) => Promise<SaleItem[]>;
}

interface ABCProduct {
  codigo: string;
  produto: string;
  fornecedor: string;
  totalRevenue: number;
  totalQty: number;
  percentRevenue: number;
  cumulativePercent: number;
  classification: "A" | "B" | "C";
}

const CLASS_COLORS: Record<string, string> = {
  A: "hsl(var(--chart-1))",
  B: "hsl(var(--chart-2))",
  C: "hsl(var(--chart-3))",
};

const CLASS_BADGE: Record<string, string> = {
  A: "bg-green-500/15 text-green-600 border-green-500/30",
  B: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  C: "bg-red-500/15 text-red-600 border-red-500/30",
};

export function ABCCurveReport({ sales, getSaleItems }: ABCCurveReportProps) {
  const [items, setItems] = useState<ABCProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [periodMonths, setPeriodMonths] = useState("3");
  const [filterClass, setFilterClass] = useState<"all" | "A" | "B" | "C">("all");

  const filteredSales = useMemo(() => {
    const months = parseInt(periodMonths);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return sales.filter(
      (s) => s.status === "completed" && new Date(s.created_at) >= cutoff
    );
  }, [sales, periodMonths]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allItems: SaleItem[] = [];
      // Fetch items in batches of 10
      for (let i = 0; i < filteredSales.length; i += 10) {
        const batch = filteredSales.slice(i, i + 10);
        const results = await Promise.all(batch.map((s) => getSaleItems(s.id)));
        results.forEach((r) => allItems.push(...r));
      }

      // Aggregate by product code
      const map = new Map<string, { produto: string; fornecedor: string; revenue: number; qty: number }>();
      for (const item of allItems) {
        const key = item.codigo.toUpperCase().trim();
        const existing = map.get(key);
        const revenue = item.preco_unitario * item.quantidade;
        if (existing) {
          existing.revenue += revenue;
          existing.qty += item.quantidade;
        } else {
          map.set(key, {
            produto: item.produto,
            fornecedor: item.fornecedor || "—",
            revenue,
            qty: item.quantidade,
          });
        }
      }

      // Sort by revenue descending
      const sorted = Array.from(map.entries())
        .map(([codigo, data]) => ({
          codigo,
          produto: data.produto,
          fornecedor: data.fornecedor,
          totalRevenue: data.revenue,
          totalQty: data.qty,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      const totalRevenue = sorted.reduce((s, p) => s + p.totalRevenue, 0);
      let cumulative = 0;

      const classified: ABCProduct[] = sorted.map((p) => {
        const pct = totalRevenue > 0 ? (p.totalRevenue / totalRevenue) * 100 : 0;
        cumulative += pct;
        let classification: "A" | "B" | "C" = "C";
        if (cumulative <= 80) classification = "A";
        else if (cumulative <= 95) classification = "B";

        return {
          ...p,
          percentRevenue: pct,
          cumulativePercent: cumulative,
          classification,
        };
      });

      setItems(classified);
      setLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const a = items.filter((i) => i.classification === "A");
    const b = items.filter((i) => i.classification === "B");
    const c = items.filter((i) => i.classification === "C");
    const total = items.reduce((s, i) => s + i.totalRevenue, 0);
    return { a, b, c, total };
  }, [items]);

  const pieData = useMemo(() => {
    if (!loaded) return [];
    return [
      { name: "A — 80% receita", value: summary.a.length, fill: CLASS_COLORS.A },
      { name: "B — 15% receita", value: summary.b.length, fill: CLASS_COLORS.B },
      { name: "C — 5% receita", value: summary.c.length, fill: CLASS_COLORS.C },
    ];
  }, [loaded, summary]);

  const topBarData = useMemo(() => {
    return items.slice(0, 15).map((p) => ({
      name: p.codigo.length > 10 ? p.codigo.slice(0, 10) + "…" : p.codigo,
      receita: p.totalRevenue,
      classification: p.classification,
    }));
  }, [items]);

  const displayItems = filterClass === "all" ? items : items.filter((i) => i.classification === filterClass);

  const exportCSV = () => {
    const header = "Código,Produto,Fornecedor,Receita,Qtd,% Receita,% Acumulado,Classe\n";
    const rows = items
      .map(
        (i) =>
          `"${i.codigo}","${i.produto}","${i.fornecedor}",${i.totalRevenue.toFixed(2)},${i.totalQty},${i.percentRevenue.toFixed(2)},${i.cumulativePercent.toFixed(2)},${i.classification}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curva-abc.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Curva ABC de Produtos
          </h2>
          <p className="text-sm text-muted-foreground">
            Classifique seus produtos por faturamento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={periodMonths} onValueChange={(v) => { setPeriodMonths(v); setLoaded(false); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Último mês</SelectItem>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadData} disabled={loading}>
            {loading ? "Analisando..." : loaded ? "Atualizar" : "Gerar Relatório"}
          </Button>
        </div>
      </div>

      {!loaded && !loading && (
        <Card className="p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Relatório Curva ABC</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Selecione o período e clique em "Gerar Relatório" para classificar seus
            produtos em A (80% da receita), B (15%) e C (5%).
          </p>
        </Card>
      )}

      {loaded && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { cls: "A" as const, label: "Classe A — 80% receita", items: summary.a, color: "text-green-600" },
              { cls: "B" as const, label: "Classe B — 15% receita", items: summary.b, color: "text-amber-600" },
              { cls: "C" as const, label: "Classe C — 5% receita", items: summary.c, color: "text-red-600" },
            ].map(({ cls, label, items: clsItems, color }) => (
              <Card key={cls} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterClass(filterClass === cls ? "all" : cls)}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{clsItems.length} itens</p>
                <p className="text-sm text-muted-foreground">
                  {fmt(clsItems.reduce((s, i) => s + i.totalRevenue, 0))}
                </p>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Top 15 Produtos por Receita</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topBarData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                    {topBarData.map((entry, idx) => (
                      <Cell key={idx} fill={CLASS_COLORS[entry.classification]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Distribuição de Itens</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Filter & Export */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtrar:</span>
              {(["all", "A", "B", "C"] as const).map((cls) => (
                <Button
                  key={cls}
                  variant={filterClass === cls ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterClass(cls)}
                >
                  {cls === "all" ? "Todos" : `Classe ${cls}`}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Código</th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">Produto</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Fornecedor</th>
                    <th className="text-right p-3 font-medium">Receita</th>
                    <th className="text-right p-3 font-medium hidden sm:table-cell">Qtd</th>
                    <th className="text-right p-3 font-medium">%</th>
                    <th className="text-right p-3 font-medium hidden sm:table-cell">Acum.</th>
                    <th className="text-center p-3 font-medium">Classe</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.slice(0, 100).map((item, idx) => (
                    <tr key={item.codigo} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 font-mono text-xs">{item.codigo}</td>
                      <td className="p-3 hidden sm:table-cell truncate max-w-[200px]">{item.produto}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{item.fornecedor}</td>
                      <td className="p-3 text-right font-medium">{fmt(item.totalRevenue)}</td>
                      <td className="p-3 text-right hidden sm:table-cell">{item.totalQty}</td>
                      <td className="p-3 text-right">{item.percentRevenue.toFixed(1)}%</td>
                      <td className="p-3 text-right hidden sm:table-cell">{item.cumulativePercent.toFixed(1)}%</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className={CLASS_BADGE[item.classification]}>
                          {item.classification}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {displayItems.length > 100 && (
              <div className="p-3 text-center text-xs text-muted-foreground border-t">
                Mostrando 100 de {displayItems.length} itens. Exporte o CSV para ver todos.
              </div>
            )}
            {displayItems.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum item encontrado para este filtro.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
