import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { FornecedorRanking } from '@/services/mercadolivreService';

interface MLFornecedorDonutProps {
  ranking: FornecedorRanking[];
}

const DONUT_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 71% 45%)',      // green
  'hsl(217 91% 60%)',      // blue
  'hsl(38 92% 50%)',       // amber
  'hsl(280 65% 60%)',      // purple
  'hsl(var(--muted-foreground) / 0.4)', // others
];

export function MLFornecedorDonut({ ranking }: MLFornecedorDonutProps) {
  if (!ranking.length) return null;

  // Top 5 + Others
  const top5 = ranking.slice(0, 5);
  const othersTotal = ranking.slice(5).reduce((s, r) => s + r.totalVendido, 0);
  const othersParticipacao = ranking.slice(5).reduce((s, r) => s + r.participacao, 0);

  const data = [
    ...top5.map((r) => ({
      name: r.fornecedor,
      value: r.totalVendido,
      participacao: r.participacao,
    })),
    ...(othersTotal > 0
      ? [{ name: 'Outros', value: othersTotal, participacao: othersParticipacao }]
      : []),
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium text-foreground">{d.name}</p>
        <p className="text-muted-foreground">Vendidos: <span className="text-foreground font-bold">{d.value.toLocaleString('pt-BR')}</span></p>
        <p className="text-muted-foreground">Participação: <span className="text-foreground font-bold">{d.participacao}%</span></p>
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Fornecedor Dominante por Peça</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              dataKey="value"
              paddingAngle={2}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={DONUT_COLORS[idx] || DONUT_COLORS[DONUT_COLORS.length - 1]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
