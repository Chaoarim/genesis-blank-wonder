import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, X, Car, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeForSearch } from '@/lib/partsSearchEngine';
import { Card } from '@/components/ui/card';
import type { Part } from '@/hooks/usePartsDatabase';

// Laterality terms that require STRICT word-boundary matching
const LATERALITY_TERMS = new Set([
  'dianteiro', 'dianteira', 'traseiro', 'traseira',
  'esquerdo', 'esquerda', 'direito', 'direita',
  'superior', 'inferior',
]);

// Common abbreviations found in parts catalogs
const ABBREVIATIONS: Record<string, string[]> = {
  'dianteiro': ['diant'],
  'dianteira': ['diant'],
  'traseiro': ['tras'],
  'traseira': ['tras'],
  'esquerdo': ['esq'],
  'esquerda': ['esq'],
  'direito': ['dir'],
  'direita': ['dir'],
  'superior': ['sup'],
  'inferior': ['inf'],
  'amortecedor': ['amort'],
  'embreagem': ['embr'],
  'suspensao': ['susp'],
  'freio': ['freios'],
  'distribuicao': ['distrib'],
};

// Word-boundary match: checks if `term` appears as a whole word in `text`
function wordMatch(text: string, term: string): boolean {
  const regex = new RegExp(`(^|\\s)${term}(\\s|$)`);
  return regex.test(text);
}

function termMatchesText(text: string, term: string, strict = false): boolean {
  if (strict) {
    // Strict mode: word-boundary only (for laterality terms)
    if (wordMatch(text, term)) return true;
    const abbrs = ABBREVIATIONS[term];
    if (abbrs) {
      for (const abbr of abbrs) {
        if (wordMatch(text, abbr)) return true;
      }
    }
    return false;
  }
  // Normal mode: substring match
  if (text.includes(term)) return true;
  const abbrs = ABBREVIATIONS[term];
  if (abbrs) {
    for (const abbr of abbrs) {
      if (text.includes(abbr)) return true;
    }
  }
  for (const [full, abbrList] of Object.entries(ABBREVIATIONS)) {
    if (abbrList.includes(term) && text.includes(full)) return true;
  }
  return false;
}

// Known manufacturer/brand names to identify in queries
const KNOWN_BRANDS = new Set([
  'luk', 'sachs', 'valeo', 'ina', 'skf', 'nsk', 'fag', 'timken',
  'bosch', 'delphi', 'denso', 'ngk', 'mahle', 'metal leve',
  'nakata', 'cofap', 'monroe', 'kayaba', 'kyb', 'tokico',
  'fras le', 'cobreq', 'jurid', 'ferodo', 'trw', 'ate',
  'gates', 'dayco', 'continental', 'contitech', 'goodyear',
  'urba', 'marwal', 'brosol', 'weber',
  'mobensani', 'axios', 'sampel', 'viemar', 'perfect',
  'heliar', 'moura', 'acdelco', 'motorcraft', 'genuina',
  'wega', 'tecfil', 'mann', 'fram', 'purolator',
  'syl', 'osram', 'philips', 'hella',
  'mte', 'wahler', 'borg warner', 'garrett',
  'takao', 'gm', 'ford', 'fiat', 'vw', 'volkswagen',
  'honda', 'toyota', 'hyundai', 'renault', 'nissan', 'kia',
  'chevrolet', 'peugeot', 'citroen', 'mitsubishi', 'jeep',
  'nachi', 'koyo', 'zen', 'sku', 'irb', 'axor', 'remanufaturada',
  'fremax', 'hipper', 'eixocar',
]);

  const q = normalizeForSearch(query);
  if (q.length < 2) return [];
  const terms = q.split(' ').filter(t => t.length >= 2);
  if (terms.length === 0) return [];

  // Classify each term: brand, product, or general
  const brandTerms: string[] = [];
  const productTerms: string[] = [];

  for (const term of terms) {
    if (KNOWN_BRANDS.has(term)) {
      brandTerms.push(term);
    } else {
      productTerms.push(term);
    }
  }

  // Also check bigram brands (e.g. "metal leve", "fras le")
  for (let i = 0; i < terms.length - 1; i++) {
    const bigram = `${terms[i]} ${terms[i + 1]}`;
    if (KNOWN_BRANDS.has(bigram)) {
      brandTerms.push(bigram);
      // Remove individual terms from productTerms
      productTerms.splice(productTerms.indexOf(terms[i]), 1);
      const idx2 = productTerms.indexOf(terms[i + 1]);
      if (idx2 >= 0) productTerms.splice(idx2, 1);
    }
  }

  const scored: { part: Part; score: number }[] = [];

  for (const part of parts) {
    const code = normalizeForSearch(part.fabricante);
    const produto = normalizeForSearch(part.produto);
    const fornecedor = normalizeForSearch(part.fornecedor);
    const chave = normalizeForSearch(part.chaveDeBusca);
    const vehicleText = normalizeForSearch(`${part.marca} ${part.modelo} ${part.ano}`);
    const contexto = normalizeForSearch(part.contextoIA || '');
    const similares = normalizeForSearch(part.codigosSimilares || '');

    let score = 0;
    let allMatch = true;

    // BRAND TERMS: must match in fornecedor (manufacturer) field
    for (const bt of brandTerms) {
      if (termMatchesText(fornecedor, bt)) {
        score += 8;
      } else {
        // Also accept if brand is in produto or code (some parts have brand in description)
        if (termMatchesText(produto, bt) || termMatchesText(code, bt)) {
          score += 4;
        } else {
          allMatch = false;
          break;
        }
      }
    }
    if (!allMatch) continue;

    // PRODUCT TERMS: must match in produto, code, or chave fields
    for (const pt of productTerms) {
      let matched = false;

      if (code === pt) { score += 12; matched = true; }
      else if (code.includes(pt)) { score += 6; matched = true; }
      
      if (termMatchesText(produto, pt)) { score += 5; matched = true; }
      if (termMatchesText(chave, pt)) { score += 2; matched = true; }
      if (termMatchesText(contexto, pt)) { score += 1; matched = true; }
      if (termMatchesText(similares, pt)) { score += 3; matched = true; }

      if (!matched) {
        // Last resort: check vehicle text (some terms like model names)
        if (termMatchesText(vehicleText, pt)) {
          score += 2;
          matched = true;
        }
      }

      if (!matched) {
        allMatch = false;
        break;
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
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load all parts once
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let all: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('parts')
          .select('id, fabricante, codigo_peca, descricao, chave_de_busca, marca_veiculo, modelo_veiculo, anos_aplicacao, image_url, codigos_similares, contexto_ia, catalogo')
          .range(from, from + batchSize - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          all = all.concat(data);
          from += batchSize;
          if (data.length < batchSize) hasMore = false;
        }
      }

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
        catalogo: r.catalogo || 'Sem catálogo',
        _dbId: r.id,
      })) as Part[];

      setAllParts(mapped);
      setLoading(false);
    };
    load();
  }, []);

  // Catalog stats
  const catalogStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of allParts) {
      const cat = (p as any).catalogo || 'Sem catálogo';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allParts]);

  const filteredCatalogs = useMemo(() => {
    if (!catalogSearch) return catalogStats;
    const q = catalogSearch.toLowerCase();
    return catalogStats.filter(c => c.name.toLowerCase().includes(q));
  }, [catalogStats, catalogSearch]);

  // Parts for selected catalog
  const catalogParts = useMemo(() => {
    if (!selectedCatalog) return [];
    return allParts.filter(p => (p as any).catalogo === selectedCatalog);
  }, [allParts, selectedCatalog]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      const found = strictFilterParts(catalogParts, value).slice(0, 30);
      setResults(found);
      setOpen(true);
    }, 250);
  }, [catalogParts]);

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

  // Vehicle catalog selection
  if (!selectedCatalog) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Selecione o veículo para consultar peças:</p>
        {catalogStats.length > 6 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar veículo..."
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {filteredCatalogs.map(cat => (
            <Button
              key={cat.name}
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-auto py-2 text-left"
              onClick={() => {
                setSelectedCatalog(cat.name);
                setQuery('');
                setResults([]);
              }}
            >
              <Car className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-medium truncate block">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground">{cat.count} peças</span>
              </div>
            </Button>
          ))}
        </div>
        {filteredCatalogs.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">Nenhum veículo encontrado</p>
        )}
      </div>
    );
  }

  // Search within selected catalog
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setSelectedCatalog(null); setQuery(''); setResults([]); setPendingItem(null); }}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Car className="w-3.5 h-3.5" />
          {selectedCatalog}
        </div>
        <span className="text-[10px] text-muted-foreground">({catalogParts.length} peças)</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar código, descrição, fornecedor..."
            value={query}
            onChange={e => { handleSearch(e.target.value); setOpen(true); }}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="pl-9"
            autoFocus
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
