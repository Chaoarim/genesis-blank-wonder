import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { buildRollingYearWindows, buildTrailingYearWindow, formatYearWindowLabel, pickBestWindow, roundTrend, sortYearsAsc, summarizeSeriesWindow } from './fleetTrendUtils';

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
  selectedYear: string;
}

interface ModelTrend {
  model: string;
  years: { year: number; quantity: number; position: number }[];
  latestQty: number;
  latestPos: number;
  growth: number;
  cagr: number;
  trend: 'up' | 'down' | 'stable';
  avgPosition: number;
  bestWindowGrowth: number;
  bestWindowLabel: string;
}

const CHART_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export function MultiYearTrendTab({ rankings, selectedType, selectedYear }: Props) {
  const filtered = useMemo(() => rankings.filter(r => r.vehicle_type === selectedType), [rankings, selectedType]);

  const years = useMemo(() => {
    return sortYearsAsc([...new Set(filtered.map(r => r.year))]);
  }, [filtered]);

  const selectedYearNumber = useMemo(() => {
    const n = Number(selectedYear);
    if (Number.isFinite(n) && years.includes(n)) return n;
    return years[years.length - 1] ?? 0;
  }, [selectedYear, years]);

  // Use ALL available years for growth analysis (full range)
  const currentWindowYears = useMemo(() => years, [years]);
  const currentWindowLabel = useMemo(() => formatYearWindowLabel(currentWindowYears), [currentWindowYears]);
  const rollingWindows = useMemo(() => buildRollingYearWindows(years), [years]);

  const trends = useMemo(() => {
    if (years.length < 2 || currentWindowYears.length < 2) return [];
    const modelMap = new Map<string, { year: number; quantity: number; position: number }[]>();
    filtered.forEach(r => {
      if (!modelMap.has(r.model)) modelMap.set(r.model, []);
      modelMap.get(r.model)!.push({ year: r.year, quantity: r.quantity, position: r.position });
    });

    const results: ModelTrend[] = [];
    modelMap.forEach((data, model) => {
      const sorted = [...data].sort((a, b) => a.year - b.year);
      const quantityByYear = new Map(sorted.map(e => [e.year, e.quantity]));
      const windowSummary = summarizeSeriesWindow(quantityByYear, currentWindowYears);
      const bestWindow = pickBestWindow(quantityByYear, rollingWindows);
      const latestInSelection = sorted.filter(e => e.year <= selectedYearNumber);
      const latest = latestInSelection[latestInSelection.length - 1] ?? sorted[sorted.length - 1];
      const avgPos = sorted.reduce((s, d) => s + d.position, 0) / sorted.length;
      const growth = roundTrend(windowSummary.growthPercent);
      const cagr = roundTrend(windowSummary.cagrPercent);

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (windowSummary.delta > 0 && (windowSummary.growthPercent > 10 || windowSummary.cagrPercent > 3)) trend = 'up';
      else if (windowSummary.delta < 0 && windowSummary.growthPercent < -10) trend = 'down';

      results.push({
          model,
          years: sorted,
          latestQty: latest.quantity,
          latestPos: latest.position,
          growth,
          cagr,
          trend,
          avgPosition: roundTrend(avgPos),
          bestWindowGrowth: roundTrend(bestWindow.growthPercent),
          bestWindowLabel: formatYearWindowLabel(bestWindow.years),
        });
    });

    return results.sort((a, b) => b.growth !== a.growth ? b.growth - a.growth : b.latestQty - a.latestQty);
  }, [filtered, years, currentWindowYears, rollingWindows, selectedYearNumber]);

  const growing = useMemo(() => trends.filter(t => t.trend === 'up').slice(0, 5), [trends]);
  const declining = useMemo(() => [...trends].filter(t => t.trend === 'down').sort((a, b) => a.growth - b.growth).slice(0, 5), [trends]);

  const chartModelsTop = useMemo(() => {
    const positive = trends.filter(t => t.growth > 0).slice(0, 5).map(t => t.model);
    if (positive.length) return positive;
    return [...trends].sort((a, b) => b.latestQty - a.latestQty).slice(0, 5).map(t => t.model);
  }, [trends]);

  const allChartModels = useMemo(() => trends.map(t => t.model), [trends]);

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

  if (years.length < 2 || currentWindowYears.length < 2) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Selecione um ano com pelo menos 2 anos de histórico para ver tendência em janelas de 5 anos.</p>
        <p className="text-xs text-muted-foreground mt-1">Anos disponíveis: {years.join(', ') || 'nenhum'}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">
              Crescimento Período Completo: {currentWindowLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              Analisa o crescimento de todos os anos disponíveis — ideal para planejar investimento em compra de peças.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Evolução histórica dos modelos com maior crescimento</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR')} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {chartModels.map((model, index) => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                stroke={CHART_COLORS[index]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-0 overflow-hidden border-emerald-500/30">
          <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Modelos em Crescimento
            </h3>
            <p className="text-[10px] text-muted-foreground">Janela {currentWindowLabel} — priorizar compra de peças</p>
          </div>
          {growing.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Nenhum modelo com crescimento relevante na janela</div>
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
                    <TableCell className="font-medium text-sm">
                      <div>{t.model}</div>
                      <div className="text-[10px] text-muted-foreground">Melhor: {t.bestWindowLabel}</div>
                    </TableCell>
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

        <Card className="p-0 overflow-hidden border-red-500/30">
          <div className="p-3 bg-red-500/10 border-b border-red-500/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              Modelos em Queda
            </h3>
            <p className="text-[10px] text-muted-foreground">Janela {currentWindowLabel} — comprar com mais cautela</p>
          </div>
          {declining.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Nenhum modelo com queda forte na janela</div>
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
                    <TableCell className="font-medium text-sm">
                      <div>{t.model}</div>
                      <div className="text-[10px] text-muted-foreground">Melhor: {t.bestWindowLabel}</div>
                    </TableCell>
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

      <Card className="p-0 overflow-hidden">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Todos os Modelos — Leitura de Investimento</h3>
        </div>
        <div className="overflow-auto max-h-[50vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Último Ano</TableHead>
                <TableHead className="text-right">Cresc. 5 anos</TableHead>
                <TableHead className="text-right">CAGR</TableHead>
                <TableHead>Melhor janela</TableHead>
                <TableHead>Recomendação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trends.slice(0, 30).map(t => (
                <TableRow key={t.model}>
                  <TableCell className="font-medium text-sm">{t.model}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.latestQty.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">
                    <span className={`text-xs font-mono ${t.growth > 0 ? 'text-emerald-600' : t.growth < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {t.growth > 0 ? '+' : ''}{t.growth}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{t.cagr > 0 ? '+' : ''}{t.cagr}%</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{t.bestWindowLabel} · {t.bestWindowGrowth > 0 ? '+' : ''}{t.bestWindowGrowth}%</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {t.trend === 'up' ? '📈 Investir em peças' : t.trend === 'down' ? '📉 Comprar com cautela' : '➡️ Manter mix'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">💡 Insights de investimento</h3>
        <ul className="text-sm space-y-1.5 text-muted-foreground">
          <li>🗓️ Leitura principal usando janela <strong>{currentWindowLabel}</strong>.</li>
          {growing[0] && <li>🚀 <strong>{growing[0].model}</strong> lidera com <strong>+{growing[0].growth}%</strong> — ótimo para ampliar peças.</li>}
          {growing.length > 1 && <li>🧩 Mix recomendado: <strong>{growing.slice(0, 3).map(g => g.model).join(', ')}</strong>.</li>}
          {declining[0] && <li>⚠️ <strong>{declining[0].model}</strong> em queda — comprar sob demanda.</li>}
        </ul>
      </Card>
    </div>
  );
}
