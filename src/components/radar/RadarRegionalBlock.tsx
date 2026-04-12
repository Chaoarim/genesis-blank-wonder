import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RadarRegionalData } from '@/services/radarMLService';

interface Props { regional: RadarRegionalData[] }

export function RadarRegionalBlock({ regional }: Props) {
  if (!regional.length) return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a] p-6 text-center text-[#9ca3af]">
      Dados regionais não disponíveis para esta busca.
    </Card>
  );

  const getTendenciaBadge = (t: string) => {
    if (t === 'alta') return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">📈 Alta</Badge>;
    if (t === 'baixa') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">📉 Baixa</Badge>;
    return <Badge className="bg-[#2a2a2a] text-[#9ca3af] text-[10px]">➡️ Estável</Badge>;
  };

  return (
    <Card className="bg-[#1a1a1a] border-[#2a2a2a] overflow-hidden">
      <div className="p-4 border-b border-[#2a2a2a]">
        <h3 className="text-lg font-bold">📍 Onde Mais se Vende Este Produto</h3>
        <p className="text-sm text-[#9ca3af]">Disponibilidade e preços por região do Brasil</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#2a2a2a] hover:bg-transparent">
              <TableHead className="text-[#9ca3af]">Estado</TableHead>
              <TableHead className="text-[#9ca3af] text-right">Anúncios</TableHead>
              <TableHead className="text-[#9ca3af] text-right">Preço Médio</TableHead>
              <TableHead className="text-[#9ca3af] text-right">Menor Preço</TableHead>
              <TableHead className="text-[#9ca3af]">Vendedor Líder</TableHead>
              <TableHead className="text-[#9ca3af]">Tendência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regional.map((r, i) => (
              <TableRow key={i} className="border-[#2a2a2a] hover:bg-[#222]">
                <TableCell className="font-medium">{r.estado}</TableCell>
                <TableCell className="text-right font-bold text-blue-400">{r.totalAnuncios.toLocaleString('pt-BR')}</TableCell>
                <TableCell className="text-right">R$ {r.precoMedio.toFixed(2)}</TableCell>
                <TableCell className="text-right text-green-400">R$ {r.menorPreco.toFixed(2)}</TableCell>
                <TableCell className="text-sm truncate max-w-[150px]">{r.vendedorLider || '—'}</TableCell>
                <TableCell>{getTendenciaBadge(r.tendencia)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
