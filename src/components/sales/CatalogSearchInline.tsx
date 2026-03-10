import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PartThumbnail } from '@/components/PartThumbnail';

interface CatalogPart {
  id: string;
  fabricante: string;
  codigo_peca: string;
  descricao: string;
  chave_de_busca: string;
  marca_veiculo: string;
  modelo_veiculo: string;
  anos_aplicacao: string;
  image_url?: string;
}

interface CatalogSearchInlineProps {
  onAddItem: (item: {
    codigo: string;
    produto: string;
    fornecedor: string;
    aplicacao: string;
    preco_unitario: number;
    quantidade: number;
  }) => void;
}

export function CatalogSearchInline({ onAddItem }: CatalogSearchInlineProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<CatalogPart | null>(null);
  const [manualPreco, setManualPreco] = useState('');
  const [manualQtd, setManualQtd] = useState('1');

  const normalizeSearch = (text: string) =>
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim();

  const doSearch = useCallback(async (q: string) => {
    const normalized = normalizeSearch(q);
    if (normalized.length < 2) { setResults([]); return; }

    setLoading(true);
    const terms = normalized.split(/\s+/).filter(t => t.length >= 2);
    
    // Search using ilike on chave_de_busca or codigo_peca
    let queryBuilder = supabase
      .from('parts')
      .select('id, fabricante, codigo_peca, descricao, chave_de_busca, marca_veiculo, modelo_veiculo, anos_aplicacao, image_url')
      .limit(30);

    // Use the first meaningful term for a broad filter, then filter client-side
    const primaryTerm = terms[0];
    queryBuilder = queryBuilder.or(
      `chave_de_busca.ilike.%${primaryTerm}%,codigo_peca.ilike.%${primaryTerm}%,descricao.ilike.%${primaryTerm}%`
    );

    const { data, error } = await queryBuilder;
    setLoading(false);

    if (error || !data) { setResults([]); return; }

    // Client-side refinement with all terms
    const filtered = data.filter(row => {
      const searchText = normalizeSearch(
        `${row.fabricante || ''} ${row.codigo_peca || ''} ${row.descricao || ''} ${row.chave_de_busca || ''} ${row.marca_veiculo || ''} ${row.modelo_veiculo || ''}`
      );
      return terms.every(t => searchText.includes(t));
    });

    setResults(filtered.slice(0, 20) as CatalogPart[]);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        doSearch(query);
        setOpen(true);
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const handleSelect = (item: CatalogPart) => {
    setPendingItem(item);
    setManualPreco('');
    setManualQtd('1');
    setOpen(false);
  };

  const handleConfirmAdd = () => {
    if (!pendingItem) return;
    const preco = parseFloat(manualPreco);
    const qtd = parseInt(manualQtd) || 1;
    if (!preco || preco <= 0) {
      return;
    }
    onAddItem({
      codigo: pendingItem.codigo_peca || '',
      produto: pendingItem.descricao || '',
      fornecedor: pendingItem.fabricante || '',
      aplicacao: `${pendingItem.marca_veiculo || ''} ${pendingItem.modelo_veiculo || ''} ${pendingItem.anos_aplicacao || ''}`.trim(),
      preco_unitario: Math.round(preco * 100) / 100,
      quantidade: qtd,
    });
    setPendingItem(null);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no catálogo por código, descrição, veículo..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="pl-9"
          />
        </div>
        {query && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setQuery(''); setResults([]); setPendingItem(null); }}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {open && results.length > 0 && !pendingItem && (
        <div className="border border-border rounded-lg max-h-72 overflow-y-auto bg-card shadow-lg">
          {results.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 border-b border-border last:border-b-0 cursor-pointer group"
              onClick={() => handleSelect(item)}
            >
              <PartThumbnail imageUrl={item.image_url} alt={`${item.codigo_peca} - ${item.descricao}`} className="w-9 h-9" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-primary">{item.codigo_peca}</span>
                  <span className="text-xs text-muted-foreground truncate">{item.fabricante}</span>
                </div>
                <p className="text-sm truncate">{item.descricao}</p>
                {(item.marca_veiculo || item.modelo_veiculo) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.marca_veiculo} {item.modelo_veiculo} {item.anos_aplicacao}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-green-600 shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhuma peça encontrada no catálogo</p>
      )}

      {loading && (
        <p className="text-xs text-muted-foreground text-center py-2">Buscando...</p>
      )}

      {/* Manual price/qty input after selection */}
      {pendingItem && (
        <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
          <div className="flex items-center gap-2">
            <PartThumbnail imageUrl={pendingItem.image_url} alt={pendingItem.descricao || ''} className="w-8 h-8" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-bold text-primary">{pendingItem.codigo_peca}</p>
              <p className="text-sm truncate">{pendingItem.descricao}</p>
              <p className="text-xs text-muted-foreground">{pendingItem.fabricante}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPendingItem(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Preço de Venda (R$)</label>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                placeholder="0,00"
                value={manualPreco}
                onChange={e => setManualPreco(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-muted-foreground">Qtde</label>
              <Input
                type="number"
                min={1}
                value={manualQtd}
                onChange={e => setManualQtd(e.target.value)}
                className="h-8 text-sm text-center"
              />
            </div>
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={handleConfirmAdd}
              disabled={!manualPreco || parseFloat(manualPreco) <= 0}
            >
              <Plus className="w-3 h-3" /> Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
