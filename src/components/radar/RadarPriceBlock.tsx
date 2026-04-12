import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts';
import { getPriceIndication, type RadarMLItem, type RadarPriceRange } from '@/services/radarMLService';

interface Props {
  items: RadarMLItem[];
  priceRanges: RadarPriceRange[];
  precoMedio: number;
}

export function RadarPriceBlock({ items, priceRanges, precoMedio }: Props) {
  const maxRange = Math.max(...priceRanges.map(r => r.quantidade), 1);

  const priceTable = useMemo(() => {
    return [...items]
      .filter(i => i.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 20)
      .map(item => {
        const diff = precoMedio > 0 ? ((item.price - precoMedio) / precoMedio) * 100 : 0;
        const ind = getPriceIndication(item.price, precoMedio);
        return { ...item, diff, indication: ind };
      });
  }, [items, precoMedio]);

  return (
    <div className="space-y-4">
      {/* Price distribution */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a] p-4">
        <h3 className="text-lg font-bold mb-1">💰 Distribuição de Preços</h3>
        <p className="text-sm text-[#9ca3af] mb-4">Quantidade de anúncios por faixa de preço</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priceRanges}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="faixa" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }} />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                {priceRanges.map((r, i) => (
                  <Cell key={i} fill={r.quantidade === Math.max(...priceRanges.map(x => x.quantidade)) ? '#3b82f6' : '#2a2a2a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Price comparison table */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a] overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a]">
          <h3 className="text-lg font-bold">Comparativo de Preços</h3>
          <p className="text-sm text-[#9ca3af]">Top 20 menores preços com indicação de custo-benefício</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                <TableHead className="text-[#9ca3af]">Vendedor</TableHead>
                <TableHead className="text-[#9ca3af] text-right">Preço</TableHead>
                <TableHead className="text-[#9ca3af] text-right">Dif. Média</TableHead>
                <TableHead className="text-[#9ca3af]">Frete</TableHead>
                <TableHead className="text-[#9ca3af]">Parcelas</TableHead>
                <TableHead className="text-[#9ca3af]">Indicação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceTable.map((item, i) => (
                <TableRow key={i} className="border-[#2a2a2a] hover:bg-[#222]">
                  <TableCell className="text-sm truncate max-w-[150px]">{item.seller?.nickname || '—'}</TableCell>
                  <TableCell className="text-right font-bold text-green-400">R$ {item.price.toFixed(2)}</TableCell>
                  <TableCell className={`text-right text-sm ${item.diff < 0 ? 'text-green-400' : item.diff > 10 ? 'text-red-400' : 'text-[#9ca3af]'}`}>
                    {item.diff > 0 ? '+' : ''}{item.diff.toFixed(1)}%
                  </TableCell>
                  <TableCell>{item.shipping?.free_shipping ? '✅' : '💲'}</TableCell>
                  <TableCell className="text-xs">{item.installments ? `${item.installments.quantity}x` : '—'}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${item.indication.cor === 'text-green-500' ? 'bg-green-500/20 text-green-400 border-green-500/30' : item.indication.cor === 'text-red-500' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                      {item.indication.emoji} {item.indication.label}
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
