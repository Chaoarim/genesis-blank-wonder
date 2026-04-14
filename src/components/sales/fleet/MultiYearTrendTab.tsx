import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

interface FleetRanking {
  id: string;
  year: number;
  position: number;
  model: string;
  quantity: number;
  vehicle_type: string;
}

interface Props {
  rankings: FleetRanking[];
  selectedType: string;
}

interface ModelTrend {
  model: string;
  years: { year: number; quantity: number; position: number }[];
  latestQty: number;
  latestPos: number;
  growth: number; // percent change from first to last year
  trend: 'up' | 'down' | 'stable';
  avgPosition: number;
}

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export function MultiYearTrendTab({ rankings, selectedType }: Props) {
  const filtered = useMemo(() => rankings.filter(r => r.vehicle_type === selectedType), [rankings, selectedType]);

  const years = useMemo(() => {
    return [...new Set(filtered.map(r => r.year))].sort((a, b) => a - b);
  }, [filtered]);

  const trends = useMemo(() => {
    if (years.length < 2) return [];

    // Group by model
    const modelMap = new Map<string, { year: number; quantity: number; position: number }[]>();
    filtered.forEach(r => {
      if (!modelMap.has(r.model)) modelMap.set(r.model, []);
      modelMap.get(r.model)!.push({ year: r.year, quantity: r.quantity, position: r.position });
    });

    const results: ModelTrend[] = [];
    modelMap.forEach((data, model) => {
      const sorted = data.sort((a, b) => a.year - b.year);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const growth = first.quantity > 0 ? ((last.quantity - first.quantity) / first.quantity) * 100 : 0;
      const avgPos = sorted.reduce((s, d) => s + d.position, 0) / sorted.length;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (growth > 10) trend = 'up';
      else if (growth < -10) trend = 'down';

      // Only include models present in top positions
      if (avgPos <= 20) {
        results.push({
          model,
          years: sorted,
          latestQty: last.quantity,
          latestPos: last.position,
          growth: Math.round(growth * 10) / 10,
          trend,
          avgPosition: Math.round(avgPos * 10) / 10,
        });
      }
    });

    return results.sort((a, b) => b.growth - a.growth);
  }, [filtered, years]);

  // Top 5 growing and top 5 declining
  const growing = useMemo(() => trends.filter(t => t.trend === 'up').slice(0, 5), [trends]);
  const declining = useMemo(() => trends.filter(t => t.trend === 'down').slice(-5).reverse(), [trends]);

  // Chart data: top 5 models by latest quantity across years
  const chartModels = useMemo(() => {
    return [...trends].sort((a, b) => b.latestQty - a.latestQty).slice(0, 5).map(t => t.model);
  }, [trends]);

  const chartData = useMemo(() => {
    return years.map(year => {
      const point: Record<string, number | string> = { year: String(year) };
      chartModels.forEach(model => {
        const entry = filtered.find(r => r.year === year && r.model === model);
        point[model] = entry ? entry.quantity : 0;
      });
      return point;
    });
  }, [years, chartModels, filtered]);

  if (years.length < 2) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Importe dados de pelo menos 2 anos diferentes para ver a tendência multi-ano.</p>
        <p className="text-xs text-muted-foreground mt-1">Anos disponíveis: {years.join(', ') || 'nenhum'}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period info */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">
              Análise de Tendência: {years[0]} → {years[years.length - 1]}
            </p>
            <p className="text-xs text-muted-foreground">
              Comparando {years.length} anos de dados para identificar modelos em crescimento ou queda de demanda.
            </p>
          </div>
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Evolução dos Top 5 Modelos</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => (v / 1000).toFixed(0) + 'k'} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {chartModels.map((model, i) => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                stroke={CHART_COLORS[i]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Growing + Declining side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Growing */}
        <Card className="p-0 overflow-hidden border-emerald-500/30">
          <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Modelos em Crescimento
            </h3>
            <p className="text-[10px] text-muted-foreground">Investir em peças para estes modelos — demanda crescente</p>
          </div>
          {growing.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Nenhum modelo com crescimento &gt;10%</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Crescimento</TableHead>
                  <TableHead className="text-right">Pos. Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {growing.map(t => (
                  <TableRow key={t.model}>
                    <TableCell className="font-medium text-sm">{t.model}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        ↑ {t.growth}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{t.latestPos}°</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Declining */}
        <Card className="p-0 overflow-hidden border-red-500/30">
          <div className="p-3 bg-red-500/10 border-b border-red-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              Modelos em Queda
            </h3>
            <p className="text-[10px] text-muted-foreground">Reduzir estoque gradualmente — demanda em declínio</p>
          </div>
          {declining.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Nenhum modelo com queda &gt;10%</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                  <TableHead className="text-right">Pos. Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {declining.map(t => (
                  <TableRow key={t.model}>
                    <TableCell className="font-medium text-sm">{t.model}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="border-0 bg-red-500/10 text-red-700 dark:text-red-400">
                        ↓ {Math.abs(t.growth)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{t.latestPos}°</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Full trend table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Todos os Modelos — Análise Completa</h3>
        </div>
        <div className="overflow-auto max-h-[50vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Último Ano</TableHead>
                <TableHead className="text-right">Pos. Média</TableHead>
                <TableHead className="text-right">Variação</TableHead>
                <TableHead>Tendência</TableHead>
                <TableHead>Recomendação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trends.slice(0, 30).map(t => (
                <TableRow key={t.model}>
                  <TableCell className="font-medium text-sm">{t.model}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.latestQty.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.avgPosition}°</TableCell>
                  <TableCell className="text-right">
                    <span className={`text-xs font-mono ${t.growth > 0 ? 'text-emerald-600' : t.growth < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {t.growth > 0 ? '+' : ''}{t.growth}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {t.trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                    {t.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    {t.trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {t.trend === 'up' ? '📈 Investir' : t.trend === 'down' ? '📉 Reduzir' : '➡️ Manter'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
