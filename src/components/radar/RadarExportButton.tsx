import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { RadarCompleteResult } from '@/services/radarMLService';

interface Props { result: RadarCompleteResult }

export function RadarExportButton({ result }: Props) {
  const handleExport = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Aba 1: Resumo
      const resumo = [
        ['Radar de Mercado ML — Relatório'],
        [`Busca: ${result.searchTerm}`, `Data: ${new Date(result.searchDate).toLocaleString('pt-BR')}`],
        [],
        ['KPI', 'Valor'],
        ['Anúncios Ativos', result.kpis.totalAnuncios],
        ['Total Vendido', result.kpis.totalVendido],
        ['Preço Mínimo', result.kpis.precoMinimo],
        ['Preço Médio', result.kpis.precoMedio],
        ['Preço Máximo', result.kpis.precoMaximo],
        ['Líder de Vendas', result.kpis.liderVendas?.nome || '—'],
        [],
        ['INSIGHTS'],
        ...result.insights.map(i => [`${i.emoji} ${i.titulo}`, i.descricao]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), 'Resumo');

      // Aba 2: Top 30
      const top30Data = result.items.slice(0, 30).map((item, i) => ({
        '#': i + 1,
        'Produto': item.title,
        'Preço': item.price,
        'Vendidos': item.sold_quantity || 0,
        'Vendedor': item.seller?.nickname || '',
        'Estado': item.address?.state_name || '',
        'Frete Grátis': item.shipping?.free_shipping ? 'Sim' : 'Não',
        'Condição': item.condition === 'new' ? 'Novo' : 'Usado',
        'Link': item.permalink,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(top30Data), 'Top 30');

      // Aba 3: Vendedores
      const sellersData = result.sellers.map((s, i) => ({
        '#': i + 1,
        'Vendedor': s.seller?.nickname || '',
        'Vendas': s.vendas,
        'Market Share %': s.share,
        'Preço Médio': s.precoMedio,
        'Estado': s.seller?.address?.state || '',
        'Vendas Totais ML': s.seller?.seller_reputation?.transactions?.completed || '',
        'Avaliação Positiva %': s.seller?.seller_reputation?.transactions?.ratings ? Math.round((s.seller.seller_reputation.transactions.ratings.positive / Math.max(s.seller.seller_reputation.transactions.ratings.positive + s.seller.seller_reputation.transactions.ratings.negative + s.seller.seller_reputation.transactions.ratings.neutral, 1)) * 100) : '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sellersData), 'Vendedores');

      // Aba 4: Regional
      const regionalData = result.regional.map(r => ({
        'Estado': r.estado,
        'Anúncios': r.totalAnuncios,
        'Preço Médio': r.precoMedio,
        'Menor Preço': r.menorPreco,
        'Vendedor Líder': r.vendedorLider,
        'Tendência': r.tendencia,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(regionalData), 'Regional');

      // Aba 5: Preços
      const precosData = result.items.filter(i => i.price > 0).sort((a, b) => a.price - b.price).map(item => ({
        'Vendedor': item.seller?.nickname || '',
        'Preço': item.price,
        'Dif. Média %': result.kpis.precoMedio > 0 ? Math.round(((item.price - result.kpis.precoMedio) / result.kpis.precoMedio) * 100) : 0,
        'Frete Grátis': item.shipping?.free_shipping ? 'Sim' : 'Não',
        'Vendidos': item.sold_quantity || 0,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(precosData), 'Preços');

      XLSX.writeFile(wb, `Radar_ML_${result.searchTerm.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Relatório exportado com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar relatório');
    }
  };

  return (
    <div className="flex justify-center">
      <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 h-auto text-base">
        <FileDown className="w-5 h-5 mr-2" /> Exportar Relatório Completo
      </Button>
    </div>
  );
}
