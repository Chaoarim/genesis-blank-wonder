import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeForSearch } from '@/lib/partsSearchEngine';
import type { Part } from '@/hooks/usePartsDatabase';

const SYNONYMS: Record<string, string[]> = {
  'embreagem': ['disco', 'plato', 'rolamento'],
  'kit': ['jogo', 'conjunto'],
  'suspensao': ['amortecedor', 'mola', 'bandeja', 'bieleta'],
  'freio': ['pastilha', 'disco', 'lona', 'sapata'],
  'distribuicao': ['correia', 'tensor', 'polia'],
};

/** Strict search: ALL query terms must match somewhere in the part text */
function strictFilterParts(parts: Part[], query: string): Part[] {
  const q = normalizeForSearch(query);
  if (q.length < 2) return [];
  const terms = q.split(' ').filter(t => t.length >= 2);
  if (terms.length === 0) return [];

  const scored: { part: Part; score: number }[] = [];

  for (const part of parts) {
    const fullText = normalizeForSearch(
      `${part.fabricante} ${part.produto} ${part.chaveDeBusca} ${part.marca} ${part.modelo} ${part.ano} ${part.fornecedor} ${part.contextoIA || ''} ${part.codigosSimilares || ''}`
    );

    // ALL terms must be present (exact substring or synonym match)
    let allMatch = true;
    let score = 0;

    for (const term of terms) {
      if (fullText.includes(term)) {
        // Direct match — score by field
        const prod = normalizeForSearch(part.produto);
        const code = normalizeForSearch(part.fabricante);
        if (code.includes(term)) score += 5;
        if (prod.includes(term)) score += 3;
        score += 1;
      } else {
        // Check if any synonym of this term matches
        const syns = SYNONYMS[term];
        let synFound = false;
        if (syns) {
          for (const syn of syns) {
            if (fullText.includes(syn)) { synFound = true; score += 1; break; }
          }
        }
        if (!synFound) { allMatch = false; break; }
      }
    }

    if (!allMatch || score <= 0) continue;
    scored.push({ part, score });
  }

  return scored.sort((a, b) => b.score - a.score).map(s => s.part);
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
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [results, setResults] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<Part | null>(null);
  const [manualPreco, setManualPreco] = useState('');
  const [manualQtd, setManualQtd] = useState('1');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load all parts once (they are shared/global catalog)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Fetch in batches to bypass the 1000-row limit
      let all: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('parts')
          .select('id, fabricante, codigo_peca, descricao, chave_de_busca, marca_veiculo, modelo_veiculo, anos_aplicacao, image_url, codigos_similares, contexto_ia')
          .range(from, from + batchSize - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          all = all.concat(data);
          from += batchSize;
          if (data.length < batchSize) hasMore = false;
        }
      }

      // Map DB rows to Part interface used by smartFilterParts
      const mapped: Part[] = all.map((r: any) => ({
        fabricante: r.codigo_peca || r.fabricante || '',
        produto: r.descricao || '',
        chaveDeBusca: r.chave_de_busca || '',
        marca: r.marca_veiculo || '',
        modelo: r.modelo_veiculo || '',
        ano: r.anos_aplicacao || '',
        fornecedor: r.fabricante || '',
        contextoIA: r.contexto_ia || '',
        codigosSimilares: r.codigos_similares || '',
        imageUrl: r.image_url || '',
        aplicacao: `${r.marca_veiculo || ''} ${r.modelo_veiculo || ''} ${r.anos_aplicacao || ''}`.trim(),
        _dbId: r.id,
      })) as Part[];

      setAllParts(mapped);
      setLoading(false);
    };
    load();
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      const found = smartFilterParts(allParts, value).slice(0, 30);
      setResults(found);
      setOpen(true);
    }, 250);
  }, [allParts]);

  const handleSelect = (item: Part) => {
    setPendingItem(item);
    setManualPreco('');
    setManualQtd('1');
    setOpen(false);
  };

  const handleConfirmAdd = () => {
    if (!pendingItem) return;
    const preco = parseFloat(manualPreco);
    const qtd = parseInt(manualQtd) || 1;
    if (!preco || preco <= 0) return;
    onAddItem({
      codigo: pendingItem.fabricante || '',
      produto: pendingItem.produto || '',
      fornecedor: pendingItem.fornecedor || '',
      aplicacao: `${pendingItem.marca || ''} ${pendingItem.modelo || ''} ${pendingItem.ano || ''}`.trim(),
      preco_unitario: Math.round(preco * 100) / 100,
      quantidade: qtd,
    });
    setPendingItem(null);
    setQuery('');
    setResults([]);
  };

  if (loading) return <p className="text-xs text-muted-foreground">Carregando catálogo de fornecedores...</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no catálogo por código, descrição, veículo..."
            value={query}
            onChange={e => { handleSearch(e.target.value); setOpen(true); }}
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
          {results.map((item, idx) => (
            <div
              key={`${(item as any)._dbId || item.fabricante}-${idx}`}
              className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 border-b border-border last:border-b-0 cursor-pointer group"
              onClick={() => handleSelect(item)}
            >
              <div className="w-9 h-9 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {(item.fornecedor || '??').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-primary">{item.fabricante}</span>
                  <span className="text-xs text-muted-foreground truncate">{item.fornecedor}</span>
                </div>
                <p className="text-sm truncate">{item.produto}</p>
                {(item.marca || item.modelo) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.marca} {item.modelo} {item.ano}
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

      {pendingItem && (
        <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
              {(pendingItem.fornecedor || '??').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono font-bold text-primary">{pendingItem.fabricante}</p>
              <p className="text-sm truncate">{pendingItem.produto}</p>
              <p className="text-xs text-muted-foreground">{pendingItem.fornecedor}</p>
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
