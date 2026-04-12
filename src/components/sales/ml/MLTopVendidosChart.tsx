import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { MLResultItem, SinalMLResult } from '@/services/mercadolivreService';

interface MLTopVendidosChartProps {
  resultados: MLResultItem[];
  onViewItem?: (item: MLResultItem) => void;
  sinaisML?: Map<string, SinalMLResult>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.85)',
  'hsl(var(--primary) / 0.7)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--primary) / 0.5)',
  'hsl(var(--primary) / 0.42)',
  'hsl(var(--primary) / 0.35)',
  'hsl(var(--primary) / 0.3)',
  'hsl(var(--primary) / 0.25)',
  'hsl(var(--primary) / 0.2)',
];

export function MLTopVendidosChart({ resultados, onViewItem, sinaisML }: MLTopVendidosChartProps) {
  const top10 = resultados
    .sort((a, b) => (b.sold_quantity || 0) - (a.sold_quantity || 0))
    .slice(0, 10)
    .map((item) => {
      const sinal = sinaisML?.get(item.id);
      return {
        name: item.title.length > 30 ? item.title.substring(0, 30) + '…' : item.title,
        vendidos: item.sold_quantity || 0,
        preco: item.price,
        vendedor: item.seller?.nickname || 'N/A',
        permalink: item.permalink,
        sinalEmoji: sinal?.emoji || '',
        sinalLabel: sinal?.label || '',
        sinalMotivo: sinal?.motivo || '',
        item,
      };
    });

  if (!top10.length) return null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm max-w-xs">
        <p className="font-medium text-foreground mb-1">{d.name}</p>
        <p className="text-muted-foreground">Vendidos: <span className="text-foreground font-bold">{d.vendidos.toLocaleString('pt-BR')}</span></p>
        <p className="text-muted-foreground">Preço: <span className="text-green-500 font-bold">R$ {d.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
        <p className="text-muted-foreground">Vendedor: <span className="text-foreground">{d.vendedor}</span></p>
        {d.sinalLabel && (
          <p className="text-muted-foreground mt-1">
            Sinal: <span className="font-bold">{d.sinalEmoji} {d.sinalLabel}</span>
          </p>
        )}
        {d.sinalMotivo && (
          <p className="text-muted-foreground text-xs mt-0.5">{d.sinalMotivo}</p>
        )}
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top 10 Mais Vendidos no ML</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pr-4 pb-4">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={top10} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value, idx) => {
                const entry = top10[idx];
                return entry ? `${entry.sinalEmoji} ${value}` : value;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="vendidos" radius={[0, 4, 4, 0]} cursor="pointer"
              onClick={(data: any) => onViewItem?.(data.item)}>
              {top10.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx] || COLORS[COLORS.length - 1]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
