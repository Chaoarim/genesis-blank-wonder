import { useState, useEffect, useCallback } from 'react';
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

const SYNONYMS: Record<string, string[]> = {
  'kit embreagem': ['disco embreagem', 'plato', 'rolamento embreagem', 'embreagem'],
  'kit distribuicao': ['correia dentada', 'tensor', 'polia', 'distribuicao'],
  'kit suspensao': ['amortecedor', 'mola', 'batente', 'coxim', 'bandeja', 'bieleta'],
  'kit freio': ['pastilha', 'disco freio', 'lona', 'tambor', 'sapata'],
  'embreagem': ['disco embreagem', 'plato', 'rolamento embreagem', 'kit embreagem'],
  'pastilha': ['pastilha freio'],
  'amortecedor': ['amortecedor dianteiro', 'amortecedor traseiro'],
};

function normalizeSearch(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function CatalogSearchInline({ onAddItem }: CatalogSearchInlineProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<CatalogPart | null>(null);
  const [manualPreco, setManualPreco] = useState('');
  const [manualQtd, setManualQtd] = useState('1');

  const doSearch = useCallback(async (q: string) => {
    const normalized = normalizeSearch(q);
    if (normalized.length < 2) { setResults([]); return; }

    const terms = normalized.split(/\s+/).filter(t => t.length >= 2);
    if (terms.length === 0) { setResults([]); return; }

    setLoading(true);

    // Build synonym-expanded search terms for broader DB hits
    const searchTerms = new Set(terms);
    const bigram = terms.length >= 2 ? `${terms[0]} ${terms[1]}` : '';
    if (bigram && SYNONYMS[bigram]) {
      for (const syn of SYNONYMS[bigram]) {
        // Add first word of each synonym phrase
        const firstWord = syn.split(' ')[0];
        if (firstWord.length >= 3) searchTerms.add(firstWord);
      }
    }
    for (const t of terms) {
      if (SYNONYMS[t]) {
        for (const syn of SYNONYMS[t]) {
          const firstWord = syn.split(' ')[0];
          if (firstWord.length >= 3) searchTerms.add(firstWord);
        }
      }
    }

    // Build OR conditions for each search term across columns
    const orConditions = Array.from(searchTerms).flatMap(term => [
      `chave_de_busca.ilike.%${term}%`,
      `codigo_peca.ilike.%${term}%`,
      `descricao.ilike.%${term}%`,
      `marca_veiculo.ilike.%${term}%`,
      `modelo_veiculo.ilike.%${term}%`,
    ]);

    const { data, error } = await supabase
      .from('parts')
      .select('id, fabricante, codigo_peca, descricao, chave_de_busca, marca_veiculo, modelo_veiculo, anos_aplicacao, image_url')
      .or(orConditions.join(','))
      .limit(200);

    setLoading(false);
    if (error || !data) { setResults([]); return; }

    // Score results client-side using all original terms
    const scored = data.map(row => {
      const fullText = normalizeSearch(
        `${row.fabricante || ''} ${row.codigo_peca || ''} ${row.descricao || ''} ${row.chave_de_busca || ''} ${row.marca_veiculo || ''} ${row.modelo_veiculo || ''} ${row.anos_aplicacao || ''}`
      );

      let score = 0;
      let matched = 0;

      for (const term of terms) {
        if (fullText.includes(term)) {
          matched++;
          // Weight by field
          const desc = normalizeSearch(row.descricao || '');
          const code = normalizeSearch(row.codigo_peca || '');
          const fab = normalizeSearch(row.fabricante || '');
          if (code.includes(term)) score += 5;
          if (desc.includes(term)) score += 3;
          if (fab.includes(term)) score += 2;
          score += 1;
        }
      }

      // Require at least 60% of terms to match
      const matchRatio = terms.length > 0 ? matched / terms.length : 0;
      return { row, score, matchRatio, matched };
    });

    const filtered = scored
      .filter(s => s.matchRatio >= 0.6 || s.matched >= 2)
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(s => s.row as CatalogPart);

    setResults(filtered);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        doSearch(query);
        setOpen(true);
      } else {
        setResults([]);
      }
    }, 350);
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
    if (!preco || preco <= 0) return;
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
              <div className="w-9 h-9 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {(item.fabricante || '??').slice(0, 2).toUpperCase()}
              </div>
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

      {pendingItem && (
        <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
              {(pendingItem.fabricante || '??').slice(0, 2).toUpperCase()}
            </div>
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
