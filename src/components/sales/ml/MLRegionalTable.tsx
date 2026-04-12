import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, RefreshCw } from 'lucide-react';
import {
  buscarPecaPorRegiao,
  calcularMetricasML,
  rankingFornecedoresPorPeca,
  getIndicadorCompra,
  ML_STATES,
  type MLResultItem,
} from '@/services/mercadolivreService';

interface MLRegionalTableProps {
  query: string;
}

interface RegionalRow {
  state: string;
  stateName: string;
  totalVendido: number;
  fornecedorLider: string;
  precoMedio: number;
  indicador: { label: string; color: string; emoji: string };
}

const TOP_STATES = ML_STATES.slice(0, 10); // Top 10 states for quick analysis

export function MLRegionalTable({ query }: MLRegionalTableProps) {
  const [rows, setRows] = useState<RegionalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState(ML_STATES[0].code);

  const handleAnalyzeAll = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setRows([]);

    const results: RegionalRow[] = [];
    for (const state of TOP_STATES) {
      try {
        const data = await buscarPecaPorRegiao(query, state.code, { limit: 50 });
        const metricas = calcularMetricasML(data.results || [], state.code);
        const indicador = getIndicadorCompra(metricas.totalVendido);
        results.push({
          state: state.code,
          stateName: state.name,
          totalVendido: metricas.totalVendido,
          fornecedorLider: metricas.fornecedorLider,
          precoMedio: metricas.precoMedio,
          indicador,
        });
      } catch {
        results.push({
          state: state.code,
          stateName: state.name,
          totalVendido: 0,
          fornecedorLider: '—',
          precoMedio: 0,
          indicador: { label: 'ERRO', color: 'text-destructive', emoji: '❌' },
        });
      }
    }

    setRows(results.sort((a, b) => b.totalVendido - a.totalVendido));
    setLoading(false);
  }, [query]);

  const handleSingleState = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await buscarPecaPorRegiao(query, selectedState, { limit: 50 });
      const metricas = calcularMetricasML(data.results || [], selectedState);
      const indicador = getIndicadorCompra(metricas.totalVendido);
      const stateName = ML_STATES.find((s) => s.code === selectedState)?.name || selectedState;
      const newRow: RegionalRow = {
        state: selectedState,
        stateName,
        totalVendido: metricas.totalVendido,
        fornecedorLider: metricas.fornecedorLider,
        precoMedio: metricas.precoMedio,
        indicador,
      };
      setRows((prev) => {
        const filtered = prev.filter((r) => r.state !== selectedState);
        return [...filtered, newRow].sort((a, b) => b.totalVendido - a.totalVendido);
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [query, selectedState]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Ranking Regional ML
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ML_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleSingleState} disabled={loading || !query.trim()} className="h-8 text-xs">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Buscar
            </Button>
            <Button size="sm" onClick={handleAnalyzeAll} disabled={loading || !query.trim()} className="h-8 text-xs">
              {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Top 10 Estados
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-muted-foreground font-medium">Estado</th>
                  <th className="px-4 py-2 text-right text-muted-foreground font-medium">Total Vendido</th>
                  <th className="px-4 py-2 text-left text-muted-foreground font-medium">Fornecedor Líder</th>
                  <th className="px-4 py-2 text-right text-muted-foreground font-medium">Preço Médio</th>
                  <th className="px-4 py-2 text-center text-muted-foreground font-medium">Indicador</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.state} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="px-4 py-2.5 font-medium">{row.stateName}</td>
                    <td className="px-4 py-2.5 text-right font-bold">{row.totalVendido.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-2.5 truncate max-w-[160px]">{row.fornecedorLider}</td>
                    <td className="px-4 py-2.5 text-right">
                      {row.precoMedio > 0
                        ? `R$ ${row.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge variant="outline" className={`text-[10px] ${row.indicador.color}`}>
                        {row.indicador.emoji} {row.indicador.label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">
            {query.trim() ? 'Clique em "Top 10 Estados" para analisar regionalmente' : 'Busque uma peça primeiro'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
