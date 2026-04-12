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
import { MLFilters, INITIAL_FILTERS, type MLFilterValues } from './ml/MLFilters';

interface MercadoLivreMarketProps {
  adminUserId?: string | null;
}

export function MercadoLivreMarket({ adminUserId }: MercadoLivreMarketProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [rawResults, setRawResults] = useState<MLResultItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<MLResultItem | null>(null);
  const [filters, setFilters] = useState<MLFilterValues>(INITIAL_FILTERS);

  const maxPrice = useMemo(() => {
    if (!rawResults.length) return 1000;
    return Math.ceil(Math.max(...rawResults.map((r) => r.price)) / 10) * 10;
  }, [rawResults]);

  // Apply client-side filters
  const filteredResults = useMemo(() => {
    let items = rawResults;

    if (filters.estado !== 'all') {
      const stateName = (
        items[0]?.address?.state_name
          ? undefined
          : undefined
      );
      // Filter by state name in address
      items = items.filter((r) => {
        const sn = r.address?.state_name?.toLowerCase() || '';
        const code = filters.estado.replace('BR-', '').toLowerCase();
        return sn.includes(code) || sn === '';
      });
    }

    if (filters.modelo.trim()) {
      const term = filters.modelo.toLowerCase();
      items = items.filter((r) => r.title.toLowerCase().includes(term));
    }

    if (filters.fabricante.trim()) {
      const term = filters.fabricante.toLowerCase();
      items = items.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          r.seller?.nickname?.toLowerCase().includes(term)
      );
    }

    if (filters.precoMin > 0 || filters.precoMax < maxPrice) {
      items = items.filter(
        (r) => r.price >= filters.precoMin && r.price <= filters.precoMax
      );
    }

    // Reputação filter approximation based on sold_quantity thresholds
    if (filters.reputacao !== 'all') {
      items = items.filter((r) => {
        const vendidos = r.sold_quantity || 0;
        if (filters.reputacao === 'green') return vendidos > 50;
        if (filters.reputacao === 'yellow') return vendidos >= 10 && vendidos <= 50;
        if (filters.reputacao === 'red') return vendidos < 10;
        return true;
      });
    }

    return items;
  }, [rawResults, filters, maxPrice]);

  const metricas = useMemo(() => {
    if (!filteredResults.length) return null;
    return calcularMetricasML(filteredResults);
  }, [filteredResults]);

  const ranking = useMemo(() => {
    if (!filteredResults.length) return [];
    return rankingFornecedoresPorPeca(filteredResults);
  }, [filteredResults]);

  const sinaisML = useMemo(() => {
    if (!metricas?.resultados?.length) return new Map<string, SinalMLResult>();
    return calcularSinaisML(metricas.resultados, metricas.disponibilidadeRegional);
  }, [metricas]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setRawResults([]);
    setFilters((prev) => ({ ...prev, precoMin: 0, precoMax: 99999 }));
    try {
      const data = await buscarPecaML(query, { limit: 50 });
      const results = data.results || [];
      setRawResults(results);
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

  const hasResults = rawResults.length > 0;

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

      {/* Filters */}
      {hasResults && (
        <MLFilters
          filters={filters}
          onChange={setFilters}
          maxPrice={maxPrice}
        />
      )}

      {/* KPI Cards */}
      {metricas && <MLKpiCards metricas={metricas} />}

      {/* Charts row */}
      {metricas && filteredResults.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MLTopVendidosChart resultados={filteredResults} onViewItem={handleViewItem} sinaisML={sinaisML} />
          <MLFornecedorDonut ranking={ranking} />
        </div>
      )}

      {/* Filtered empty state */}
      {hasResults && filteredResults.length === 0 && !loading && (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-sm font-medium">Nenhum resultado com os filtros atuais</p>
          <p className="text-xs mt-1">Tente ajustar os filtros acima</p>
        </div>
      )}

      {/* Regional table */}
      {metricas && <MLRegionalTable query={query} />}

      {/* Empty state */}
      {!hasResults && !loading && (
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
        items={filteredResults}
        pecaNome={query}
        sinaisML={sinaisML}
      />
    </div>
  );
}
