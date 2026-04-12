import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DollarSign, TrendingDown, ShoppingCart, Crown, Info } from 'lucide-react';
import type { MLMetricas } from '@/services/mercadolivreService';

interface MLKpiCardsProps {
  metricas: MLMetricas;
}

export function MLKpiCards({ metricas }: MLKpiCardsProps) {
  const cards = [
    {
      title: 'Preço Médio ML',
      value: `R$ ${metricas.precoMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Menor Preço ML',
      value: `R$ ${metricas.menorPreco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingDown,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      title: 'Total Vendido ML',
      value: metricas.totalVendido.toLocaleString('pt-BR'),
      icon: ShoppingCart,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Fornecedor Líder',
      value: metricas.fornecedorLider || '—',
      icon: Crown,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      subtitle: metricas.fornecedorLiderVendas > 0
        ? `${metricas.fornecedorLiderVendas.toLocaleString('pt-BR')} vendidos`
        : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${card.bg}`}>
                <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{card.title}</p>
            </div>
            <p className={`text-lg font-bold ${card.color} truncate`}>{card.value}</p>
            {card.subtitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
