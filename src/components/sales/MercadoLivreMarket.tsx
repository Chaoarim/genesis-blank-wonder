import { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import {
  buscarPecaML,
  calcularMetricasML,
  rankingFornecedoresPorPeca,
  calcularSinaisML,
  type MLMetricas,
  type MLResultItem,
  type FornecedorRanking,
  type SinalMLResult,
} from '@/services/mercadolivreService';
import { MLKpiCards } from './ml/MLKpiCards';
import { MLTopVendidosChart } from './ml/MLTopVendidosChart';
import { MLFornecedorDonut } from './ml/MLFornecedorDonut';
import { MLRegionalTable } from './ml/MLRegionalTable';
import { MLItemModal } from './ml/MLItemModal';

interface MercadoLivreMarketProps {
  adminUserId?: string | null;
}

export function MercadoLivreMarket({ adminUserId }: MercadoLivreMarketProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [metricas, setMetricas] = useState<MLMetricas | null>(null);
  const [ranking, setRanking] = useState<FornecedorRanking[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<MLResultItem | null>(null);

  const sinaisML = useMemo(() => {
    if (!metricas?.resultados?.length) return new Map<string, SinalMLResult>();
    return calcularSinaisML(metricas.resultados, metricas.disponibilidadeRegional);
  }, [metricas]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setMetricas(null);
    setRanking([]);
    try {
      const data = await buscarPecaML(query, { limit: 50 });
      const results = data.results || [];
      const m = calcularMetricasML(results);
      const r = rankingFornecedoresPorPeca(results);
      setMetricas(m);
      setRanking(r);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao buscar no Mercado Livre');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleViewItem = useCallback((item: MLResultItem) => {
    setModalItem(item);
    setModalOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Inteligência de Mercado ML</h2>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar peça no Mercado Livre (ex: pastilha freio gol, filtro oleo civic)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
          Buscar
        </Button>
      </div>

      {/* KPI Cards */}
      {metricas && <MLKpiCards metricas={metricas} />}

      {/* Charts row */}
      {metricas && metricas.resultados.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MLTopVendidosChart resultados={metricas.resultados} onViewItem={handleViewItem} sinaisML={sinaisML} />
          <MLFornecedorDonut ranking={ranking} />
        </div>
      )}

      {/* Regional table */}
      {metricas && <MLRegionalTable query={query} />}

      {/* Empty state */}
      {!metricas && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">Busque uma peça para ver dados de mercado do Mercado Livre</p>
          <p className="text-xs mt-1">Preços, vendas, fornecedores líderes, ranking regional e análise comparativa</p>
        </div>
      )}

      {/* Modal */}
      <MLItemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        items={metricas?.resultados || []}
        pecaNome={query}
        sinaisML={sinaisML}
      />
    </div>
  );
}
