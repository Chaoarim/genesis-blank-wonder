import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink, Info } from 'lucide-react';
import type { RadarKPIs } from '@/services/radarMLService';

interface Props { kpis: RadarKPIs }

export function RadarKPICards({ kpis }: Props) {
  const cards = [
    { icon: '📋', label: 'Anúncios Ativos', value: kpis.totalAnuncios.toLocaleString('pt-BR'), sub: 'anúncios ativos agora no ML' },
    { icon: '📦', label: 'Total Vendido', value: kpis.totalVendido.toLocaleString('pt-BR'), sub: 'unidades vendidas (dado público ML)', tooltip: 'Dado aproximado fornecido pela API pública do Mercado Livre.' },
    { icon: '💰', label: 'Faixa de Preço', value: `R$ ${kpis.precoMinimo.toFixed(2)} — R$ ${kpis.precoMaximo.toFixed(2)}`, sub: `Média: R$ ${kpis.precoMedio.toFixed(2)}` },
    { icon: '🏷️', label: 'Melhor Preço', value: kpis.melhorPrecoItem ? `R$ ${kpis.melhorPrecoItem.price.toFixed(2)}` : '—', sub: kpis.melhorPrecoItem?.seller?.nickname || '', link: kpis.melhorPrecoItem?.permalink },
    { icon: '🏆', label: 'Líder de Vendas', value: kpis.liderVendas?.nome || '—', sub: kpis.liderVendas ? `${kpis.liderVendas.vendas} vendas | ${kpis.liderVendas.share}% do mercado` : '' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((c, i) => (
        <Card key={i} className="bg-[#1a1a1a] border-[#2a2a2a] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{c.icon}</span>
            <span className="text-xs text-[#9ca3af] uppercase tracking-wider">{c.label}</span>
            {c.tooltip && (
              <Tooltip>
                <TooltipTrigger asChild><Info className="w-3 h-3 text-[#9ca3af]/60 cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-[200px] text-xs">{c.tooltip}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-xl font-bold text-white truncate">{c.value}</p>
          <div className="flex items-center gap-1 mt-1">
            <p className="text-xs text-[#9ca3af] truncate">{c.sub}</p>
            {c.link && (
              <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
