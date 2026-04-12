import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RadarKPIs, RadarSellerProfile, RadarRegionalData, RadarMLItem } from '@/services/radarMLService';

interface Props {
  kpis: RadarKPIs;
  sellers: RadarSellerProfile[];
  regional: RadarRegionalData[];
  items: RadarMLItem[];
}

export function RadarEmpresarioBlock({ kpis, sellers, regional, items }: Props) {
  // Calculate recommendations
  const demandaAlta = kpis.totalVendido > 200;
  const margemEstimada = kpis.precoMaximo > 0 && kpis.precoMinimo > 0
    ? Math.round(((kpis.precoMedio - kpis.precoMinimo) / kpis.precoMinimo) * 100) : 0;
  const mercadoPulverizado = sellers.length > 0 && sellers[0].share < 40;

  const getRecomendacao = () => {
    if (demandaAlta && mercadoPulverizado) return { emoji: '🟢', label: 'INCLUIR NO PORTFÓLIO', cor: 'bg-green-500/20 text-green-400 border-green-500/30' };
    if (demandaAlta) return { emoji: '🟡', label: 'AVALIAR COM CAUTELA', cor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    return { emoji: '🔴', label: 'BAIXO POTENCIAL', cor: 'bg-red-500/20 text-red-400 border-red-500/30' };
  };

  const rec = getRecomendacao();

  // Brand analysis from items
  const brandMap = new Map<string, number>();
  items.forEach(item => {
    const brand = item.attributes?.find(a => a.id === 'BRAND')?.value_name;
    if (brand) brandMap.set(brand, (brandMap.get(brand) || 0) + (item.sold_quantity || 0));
  });
  const topBrand = [...brandMap.entries()].sort((a, b) => b[1] - a[1])[0];

  const topRegiao = regional[0];
  const menosOferta = [...regional].sort((a, b) => a.totalAnuncios - b.totalAnuncios)[0];

  return (
    <div className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden">
      <div className="p-4 border-b border-[#2a2a2a]">
        <h3 className="text-lg font-bold">📋 Painel do Empresário</h3>
        <p className="text-sm text-[#9ca3af]">Informações estratégicas para decisão de compra</p>
      </div>

      <Tabs defaultValue="comprador" className="p-4">
        <TabsList className="bg-[#0f0f0f] border border-[#2a2a2a] mb-4">
          <TabsTrigger value="comprador" className="data-[state=active]:bg-blue-600 text-xs">Comprador</TabsTrigger>
          <TabsTrigger value="dono" className="data-[state=active]:bg-blue-600 text-xs">Dono de Loja</TabsTrigger>
          <TabsTrigger value="vendedor" className="data-[state=active]:bg-blue-600 text-xs">Vendedor</TabsTrigger>
        </TabsList>

        <TabsContent value="comprador" className="space-y-3">
          <InfoRow emoji="✅" label="Marca líder de vendas" value={topBrand ? `${topBrand[0]} (${topBrand[1]} vendas)` : 'Não identificada'} />
          <InfoRow emoji="✅" label="Faixa de preço de revenda" value={`R$ ${kpis.precoMinimo.toFixed(2)} — R$ ${kpis.precoMaximo.toFixed(2)}`} />
          <InfoRow emoji="✅" label="Volume de mercado" value={`${kpis.totalVendido.toLocaleString('pt-BR')} unidades vendidas`} />
          {topRegiao && <InfoRow emoji="✅" label="Região com maior demanda" value={topRegiao.estado} />}
          <div className="pt-3">
            <Badge className={`text-sm px-4 py-2 ${rec.cor}`}>{rec.emoji} {rec.label}</Badge>
          </div>
        </TabsContent>

        <TabsContent value="dono" className="space-y-3">
          <InfoRow emoji="✅" label="Preço de compra estimado (menor ML)" value={`R$ ${kpis.precoMinimo.toFixed(2)}`} />
          <InfoRow emoji="✅" label="Preço de venda praticado (médio)" value={`R$ ${kpis.precoMedio.toFixed(2)}`} />
          <InfoRow emoji="✅" label="Margem estimada de mercado" value={`~${margemEstimada}%`} />
          {topRegiao && <InfoRow emoji="✅" label="Região dos compradores" value={topRegiao.estado} />}
          <InfoRow emoji="✅" label="Concorrentes online" value={sellers.map(s => s.seller?.nickname || '').filter(Boolean).slice(0, 3).join(', ') || '—'} />
          <InfoRow emoji="✅" label="Vale ter em estoque?" value={demandaAlta ? 'SIM — Alta demanda no ML' : 'Avaliar — Demanda moderada/baixa'} />
        </TabsContent>

        <TabsContent value="vendedor" className="space-y-3">
          <InfoRow emoji="✅" label="Preço competitivo para entrar" value={`R$ ${(kpis.precoMedio * 0.95).toFixed(2)} (5% abaixo da média)`} />
          <InfoRow emoji="✅" label="Concorrentes diretos" value={sellers.slice(0, 3).map(s => s.seller?.nickname || '').filter(Boolean).join(', ') || '—'} />
          {menosOferta && <InfoRow emoji="✅" label="Estado com menos oferta" value={`${menosOferta.estado} (${menosOferta.totalAnuncios} anúncios)`} />}
          <InfoRow emoji="✅" label="Espaço para novo vendedor?" value={mercadoPulverizado ? 'SIM — Mercado não concentrado' : 'Difícil — Mercado dominado por poucos'} />
          <InfoRow emoji="✅" label="Diferencial sugerido" value={sellers[0]?.seller?.seller_reputation?.metrics?.delayed_handling_time?.rate && sellers[0].seller.seller_reputation.metrics.delayed_handling_time.rate > 0.05 ? 'Entrega rápida (concorrentes atrasam)' : 'Preço e frete grátis'} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span>{emoji}</span>
      <span className="text-[#9ca3af]">{label}:</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
