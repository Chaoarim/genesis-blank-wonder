import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRelevantPartsForAIFromList } from '@/features/catalogs/getRelevantPartsForAIFromList';

const STOP_WORDS = new Set([
  'a','o','as','os','um','uma','uns','umas',
  'de','da','do','das','dos','d',
  'em','no','na','nos','nas',
  'para','pra','por','pelo','pela','pelos','pelas',
  'com','sem','e','ou','ao','aos','à','às',
  'qual','quais','que','é','eh','sera','será','tem','tenho','preciso','procuro','gostaria',
  'peça','peca','peças','pecas','código','codigo','cod','ref','referencia','referência',
  'preco','preço','valor'
]);

export interface Part {
  fornecedor: string;
  fabricante: string;
  produto: string;
  aplicacao: string;
  marca: string;
  modelo: string;
  ano: string;
  chaveDeBusca: string;
  contextoIA: string;
  codigosSimilares?: string;
  imageUrl?: string;
}

export function usePartsDatabase() {
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshParts = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        setLoadProgress(10);

        // First, try to load from database
        const { count } = await supabase
          .from('parts')
          .select('*', { count: 'exact', head: true });

        if (count && count > 0) {
          // Load from database in pages (supabase limit is 1000)
          setLoadProgress(20);
          const allParts: Part[] = [];
          const pageSize = 1000;
          const totalPages = Math.ceil(count / pageSize);

          for (let page = 0; page < totalPages; page++) {
            const { data, error: fetchError } = await supabase
              .from('parts')
              .select('*')
              .range(page * pageSize, (page + 1) * pageSize - 1);

            if (fetchError) {
              console.error('Error fetching parts page:', page, fetchError);
              continue;
            }

            if (data) {
              for (const row of data) {
                allParts.push({
                  fornecedor: row.fabricante || '',
                  fabricante: row.codigo_peca || '',
                  produto: row.descricao || '',
                  aplicacao: row.chave_de_busca || '',
                  marca: row.marca_veiculo || '',
                  modelo: row.modelo_veiculo || '',
                  ano: row.anos_aplicacao || '',
                  chaveDeBusca: row.chave_de_busca || '',
                  contextoIA: row.contexto_ia || '',
                  imageUrl: row.image_url || undefined,
                });
              }
            }

            const progress = 20 + Math.floor(((page + 1) / totalPages) * 75);
            setLoadProgress(Math.min(progress, 95));
          }

          setParts(allParts);
          setLoadProgress(100);
          setIsLoading(false);
          const withImages = allParts.filter(p => p.imageUrl).length;
          console.log(`Base de dados carregada do banco: ${allParts.length} peças (${withImages} com imagem)`);
          return;
        }

        // Fallback: load from CSV if database is empty
        console.log('Banco vazio, carregando do CSV...');
        setLoadProgress(30);
        await loadFromCSV();
      } catch (err) {
        console.error('Error loading parts database:', err);
        // Fallback to CSV on any error
        try {
          await loadFromCSV();
        } catch (csvErr) {
          console.error('CSV fallback also failed:', csvErr);
          setError('Erro ao carregar base de dados');
          setIsLoading(false);
        }
      }
    };

    const loadFromCSV = async () => {
      const csvResponse = await fetch('/data/parts-database.csv');
      if (!csvResponse.ok) {
        throw new Error('Arquivo de base de dados não encontrado');
      }

      const text = await csvResponse.text();
      setLoadProgress(50);

      await new Promise(resolve => setTimeout(resolve, 0));

      const lines = text.split('\n');

      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const header = parseCSVLine(lines[0]);
      const normalizeHeader = (h: string) => h.replace(/^\uFEFF/, '').trim().toUpperCase();
      const normalizedHeader = header.map(normalizeHeader);

      const fabricanteIdx = Math.max(normalizedHeader.indexOf('FABRICANTE'), 0);
      const codigoIdx = Math.max(normalizedHeader.indexOf('CODIGO_PECA'), 1);
      const descricaoIdx = Math.max(normalizedHeader.indexOf('DESCRICAO'), 2);
      const chaveIdx = Math.max(normalizedHeader.indexOf('CHAVE_DE_BUSCA'), 3);
      const marcaVeiculoIdx = Math.max(normalizedHeader.indexOf('MARCA_VEICULO'), 4);
      const modeloVeiculoIdx = Math.max(normalizedHeader.indexOf('MODELO_VEICULO'), 5);
      const anosAplicacaoIdx = Math.max(normalizedHeader.indexOf('ANOS_APLICACAO'), 6);
      const contextoIAIdx = Math.max(normalizedHeader.indexOf('CONTEXTO_IA'), 7);

      setLoadProgress(60);

      const parsedParts: Part[] = [];
      const batchSize = 5000;
      const dataLines = lines.slice(1);

      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = dataLines.slice(i, i + batchSize);
        for (const line of batch) {
          if (!line.trim()) continue;
          const values = parseCSVLine(line);
          if (values.length >= 4) {
            parsedParts.push({
              fornecedor: (values[fabricanteIdx] || '').trim(),
              fabricante: (values[codigoIdx] || '').trim(),
              produto: (values[descricaoIdx] || '').trim(),
              aplicacao: (values[chaveIdx] || '').trim(),
              marca: (values[marcaVeiculoIdx] || '').trim(),
              modelo: (values[modeloVeiculoIdx] || '').trim(),
              ano: (values[anosAplicacaoIdx] || '').trim(),
              chaveDeBusca: (values[chaveIdx] || '').trim(),
              contextoIA: (values[contextoIAIdx] || '').trim(),
            });
          }
        }
        const progress = 60 + Math.floor((i / dataLines.length) * 35);
        setLoadProgress(Math.min(progress, 95));
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      setParts(parsedParts);
      setLoadProgress(100);
      setIsLoading(false);
      console.log(`Base de dados carregada do CSV (fallback): ${parsedParts.length} peças`);
    };

    loadDatabase();
  }, [refreshKey]);

  const normalizeForSearch = useCallback((text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9./\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\bmantana\b/g, 'montana')
      .trim();
  }, []);

  const searchParts = useCallback((query: string): Part[] => {
    const normalizedQuery = normalizeForSearch(query);
    if (!normalizedQuery) return [];

    const terms = normalizedQuery
      .split(' ')
      .map(t => t.trim())
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));

    if (terms.length === 0) return [];

    const scored = parts.map(part => {
      const searchText = normalizeForSearch(part.chaveDeBusca);
      let score = 0;
      let matchedTerms = 0;

      for (const term of terms) {
        if (searchText.includes(term)) {
          score += 1;
          matchedTerms += 1;
          if (normalizeForSearch(part.fabricante).includes(term)) score += 3;
          if (normalizeForSearch(part.produto).includes(term)) score += 2;
        }
      }

      const matchRatio = matchedTerms / terms.length;
      const isRelevant = matchRatio >= 0.6 || matchedTerms >= 2;
      return { part, score, isRelevant, matchedTerms };
    });

    return scored
      .filter(r => r.isRelevant && r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(r => r.part)
      .slice(0, 100);
  }, [parts, normalizeForSearch]);

  const getRelevantPartsForAI = useCallback((query: string): string => {
    console.log('[getRelevantPartsForAI] base carregada:', parts.length, 'peças');
    if (!parts.length) {
      console.warn('[getRelevantPartsForAI] Base vazia! Retornando string vazia.');
      return '';
    }

    const normalizedQuery = normalizeForSearch(query);
    const compactQuery = normalizedQuery.replace(/[\s./-]+/g, '');

    const possibleCode = (
      normalizedQuery.match(/\b[a-z]{2,}\d{1,}[a-z0-9-]*\b/i)?.[0] ??
      compactQuery.match(/[a-z]{2,}\d{1,}[a-z0-9-]*/i)?.[0] ??
      normalizedQuery.match(/\b\d{5,}\b/)?.[0] ??
      ''
    ).toUpperCase();

    const normalizeCode = (text: string) => normalizeForSearch(text).replace(/[\s./-]+/g, '');

    if (possibleCode) {
      const codeToken = normalizeCode(possibleCode);
      const codeHits = parts.filter((p) => {
        const code = normalizeCode(p.fabricante);
        if (code === codeToken || code.includes(codeToken)) return true;
        const produto = normalizeCode(p.produto);
        if (produto && (produto === codeToken || produto.includes(codeToken))) return true;
        const chave = normalizeCode(p.chaveDeBusca || p.aplicacao);
        return chave && chave.includes(codeToken);
      });

      if (codeHits.length > 0) {
        return codeHits
          .slice(0, 120)
          .map((p) => {
            const app = (p.chaveDeBusca || p.aplicacao || '').trim();
            const ctx = (p.contextoIA || '').trim();
            return `${p.fornecedor}|${p.fabricante}|${p.produto}|${app}|${ctx}`;
          })
          .join('\n');
      }
    }

    return getRelevantPartsForAIFromList(parts, query, 120);
  }, [parts, normalizeForSearch]);

  return {
    parts,
    isLoading,
    error,
    loadProgress,
    totalParts: parts.length,
    searchParts,
    getRelevantPartsForAI,
    refreshParts,
  };
}
