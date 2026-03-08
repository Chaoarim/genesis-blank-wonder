import { Part } from '@/hooks/usePartsDatabase';

const LATERALITY_TERMS = new Set([
  'dianteiro', 'dianteira', 'traseiro', 'traseira',
  'esquerdo', 'esquerda', 'direito', 'direita',
]);

const VEHICLE_TERMS = new Set([
  'gol', 'parati', 'saveiro', 'voyage', 'fox', 'polo', 'golf', 'up',
  'corsa', 'celta', 'onix', 'prisma', 'cobalt', 'montana', 'agile', 'spin', 'cruze', 'tracker',
  'uno', 'palio', 'siena', 'strada', 'mobi', 'argo', 'cronos', 'toro', 'fiorino', 'doblo',
  'fiesta', 'ka', 'focus', 'ecosport', 'ranger', 'fusion',
  'civic', 'fit', 'city', 'hrv', 'crv', 'accord',
  'corolla', 'etios', 'yaris', 'hilux', 'camry', 'rav4', 'sw4',
  'hb20', 'tucson', 'creta', 'ix35', 'santa', 'veloster',
  'logan', 'sandero', 'duster', 'kwid', 'captur',
  'kicks', 'versa', 'march', 'sentra', 'frontier', 'livina',
  'amarok', 'tiguan', 'jetta', 'passat', 'tcross', 'taos', 'nivus', 'virtus',
  'astra', 'vectra', 'meriva', 'zafira', 's10', 'blazer', 'trailblazer',
  'pampa', 'escort', 'versailles', 'del', 'rey', 'belina',
  'kombi', 'fusca', 'brasilia', 'variant',
  'punto', 'linea', 'bravo', 'idea', 'weekend',
  'clio', 'megane', 'scenic', 'symbol', 'fluence',
  'picanto', 'cerato', 'sportage', 'sorento', 'soul',
]);

const PRODUCT_PREFIXES_TO_EXCLUDE = ['coxim', 'batente', 'coifa', 'suporte', 'prato', 'base', 'reparo'];

// Synonyms / compound terms mapping for intelligent search
const SYNONYMS: Record<string, string[]> = {
  'kit distribuicao': ['kit correia dentada', 'correia dentada', 'tensor', 'polia', 'distribuicao'],
  'kit embreagem': ['disco embreagem', 'plato', 'rolamento embreagem', 'embreagem'],
  'kit suspensao': ['amortecedor', 'mola', 'batente', 'coxim', 'bandeja', 'bieleta', 'terminal', 'pivo'],
  'kit freio': ['pastilha', 'disco freio', 'lona', 'tambor', 'sapata'],
  'kit corrente': ['corrente motor', 'tensor corrente', 'guia corrente'],
  'kit turbina': ['turbina', 'atuador', 'valvula turbina'],
  'kit direcao': ['terminal direcao', 'barra direcao', 'pivo', 'caixa direcao', 'bomba direcao'],
  'amortecedor': ['amortecedor dianteiro', 'amortecedor traseiro'],
  'vela': ['vela ignicao', 'vela aquecimento'],
  'filtro': ['filtro oleo', 'filtro ar', 'filtro combustivel', 'filtro cabine', 'elemento filtrante'],
  'correia': ['correia poly v', 'correia alternador', 'correia dentada', 'correia acessorio'],
  'jogo': ['kit', 'conjunto'],
  'kit': ['jogo', 'conjunto'],
  'pastilha': ['pastilha freio', 'pastilha dianteira', 'pastilha traseira'],
  'disco': ['disco freio', 'disco dianteiro', 'disco traseiro', 'disco ventilado'],
  'lona': ['lona freio', 'sapata'],
  'sapata': ['lona freio', 'lona'],
  'bomba': ['bomba agua', 'bomba oleo', 'bomba combustivel', 'bomba direcao'],
  'radiador': ['radiador agua', 'radiador oleo'],
  'sensor': ['sensor temperatura', 'sensor rotacao', 'sensor abs', 'sensor oxigenio', 'sonda lambda'],
  'sonda': ['sonda lambda', 'sensor oxigenio'],
  'bobina': ['bobina ignicao', 'modulo ignicao'],
  'bieleta': ['bieleta estabilizadora', 'barra estabilizadora'],
  'bandeja': ['braco suspensao', 'bandeja suspensao'],
  'terminal': ['terminal direcao', 'ponteira direcao'],
  'ponteira': ['terminal direcao', 'ponteira direcao'],
  'pivo': ['pivo suspensao', 'rotula'],
  'rotula': ['pivo suspensao', 'pivo'],
  'rolamento': ['rolamento roda', 'rolamento embreagem'],
  'coxim': ['coxim motor', 'coxim cambio', 'calco motor'],
  'calco': ['coxim motor', 'coxim'],
  'retrovisor': ['espelho retrovisor'],
  'espelho': ['espelho retrovisor', 'retrovisor'],
  'lanterna': ['lanterna traseira', 'lanterna dianteira', 'farol'],
  'farol': ['farol dianteiro', 'farol milha', 'farol neblina'],
  'para choque': ['parachoque'],
  'parachoque': ['para choque'],
  'junta': ['junta cabecote', 'junta motor', 'junta homocinetica'],
  'homocinetica': ['junta homocinetica', 'tulipa', 'trizeta'],
  'tulipa': ['homocinetica'],
  'trizeta': ['homocinetica'],
  'cabo': ['cabo embreagem', 'cabo acelerador', 'cabo freio'],
  'bucha': ['bucha bandeja', 'bucha estabilizadora', 'bucha suspensao'],
};

// Generate bigrams from an array of words
function bigrams(words: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    result.push(`${words[i]} ${words[i + 1]}`);
  }
  return result;
}

export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[b.length][a.length];
}

// Check if term fuzzy-matches any word in text
function fuzzyMatch(text: string, term: string, threshold = 0.25): boolean {
  if (text.includes(term)) return true;
  const words = text.split(' ');
  for (const word of words) {
    if (word.length < 3 || term.length < 3) continue;
    const maxDist = Math.max(1, Math.floor(Math.min(term.length, word.length) * threshold));
    if (levenshtein(term, word) <= maxDist) return true;
    // Prefix match (typing partial words)
    if (word.startsWith(term) || term.startsWith(word)) return true;
  }
  return false;
}

// Expand query terms using synonyms
function expandWithSynonyms(terms: string[]): string[] {
  const expanded = new Set(terms);
  const queryStr = terms.join(' ');
  
  // Check bigrams first (compound terms like "kit distribuição")
  const queryBigrams = bigrams(terms);
  for (const bg of queryBigrams) {
    if (SYNONYMS[bg]) {
      for (const syn of SYNONYMS[bg]) expanded.add(syn);
    }
  }
  
  // Check individual terms
  for (const term of terms) {
    if (SYNONYMS[term]) {
      for (const syn of SYNONYMS[term]) expanded.add(syn);
    }
  }
  
  return Array.from(expanded);
}

export function smartFilterParts(partsSource: Part[], query: string): Part[] {
  const q = normalizeForSearch(query);
  if (q.length < 2) return [];

  const terms = q.split(' ').filter(t => t.length >= 2);
  if (terms.length === 0) return [];

  const productTerms: string[] = [];
  const vehicleTerms: string[] = [];
  const lateralityTerms: string[] = [];

  for (const term of terms) {
    if (LATERALITY_TERMS.has(term)) {
      lateralityTerms.push(term);
    } else if (VEHICLE_TERMS.has(term)) {
      vehicleTerms.push(term);
    } else {
      productTerms.push(term);
    }
  }

  // Expand product terms with synonyms
  const synonymExpanded = expandWithSynonyms(productTerms);

  const scored: { part: Part; score: number }[] = [];

  for (const part of partsSource) {
    const code = normalizeForSearch(part.fabricante);
    const produto = normalizeForSearch(part.produto);
    const chave = normalizeForSearch(part.chaveDeBusca);
    const marca = normalizeForSearch(part.marca || '');
    const modelo = normalizeForSearch(part.modelo || '');
    const ano = normalizeForSearch(part.ano || '');
    const fornecedor = normalizeForSearch(part.fornecedor || '');
    const contexto = normalizeForSearch(part.contextoIA || '');
    const vehicleText = `${chave} ${marca} ${modelo} ${ano} ${contexto}`;
    const fullText = `${produto} ${vehicleText} ${fornecedor}`;

    // MANDATORY: ALL laterality terms must match
    if (lateralityTerms.length > 0) {
      if (!lateralityTerms.every(lt => fuzzyMatch(fullText, lt))) continue;
    }

    // MANDATORY: ALL vehicle terms must match in vehicle-related fields
    if (vehicleTerms.length > 0) {
      const matchesVehicle = (text: string, term: string) => {
        const regex = new RegExp(`(^|\\s)${term}(\\s|$)`);
        return regex.test(text);
      };
      if (!vehicleTerms.every(vt => matchesVehicle(vehicleText, vt) || matchesVehicle(produto, vt))) continue;
    }

    // Product exclusion logic
    if (productTerms.length > 0) {
      let excluded = false;
      for (const term of productTerms) {
        const produtoWords = produto.split(' ').filter(w => w.length >= 2);
        const termIndex = produtoWords.indexOf(term);

        if (termIndex > 0) {
          const precedingWords = produtoWords.slice(0, termIndex);
          if (precedingWords.some(pw => PRODUCT_PREFIXES_TO_EXCLUDE.includes(pw))) {
            excluded = true;
            break;
          }
        }

        if (produto.includes(term)) {
          for (const prefix of PRODUCT_PREFIXES_TO_EXCLUDE) {
            if (produto.startsWith(prefix) && !productTerms.includes(prefix)) {
              excluded = true;
              break;
            }
          }
        }
        if (excluded) break;
      }
      if (excluded) continue;
    }

    let score = 0;
    let matchedProduct = 0;

    // Bonus for matching laterality and vehicle
    score += lateralityTerms.length * 5;
    score += vehicleTerms.length * 4;

    for (const term of productTerms) {
      let termScore = 0;
      if (code === term) termScore += 10;
      else if (code.includes(term)) termScore += 5;
      if (produto.includes(term)) termScore += 3;
      else if (fuzzyMatch(produto, term)) termScore += 1.5;
      if (chave.includes(term)) termScore += 1;
      if (fornecedor.includes(term)) termScore += 2;

      if (termScore > 0) {
        matchedProduct++;
        score += termScore;
      }
    }

    // Also check synonym-expanded terms for additional score
    for (const syn of synonymExpanded) {
      if (!productTerms.includes(syn)) {
        if (fullText.includes(syn)) score += 2;
      }
    }

    if (productTerms.length > 0 && matchedProduct / productTerms.length < 0.5) continue;
    if (score <= 0) continue;

    scored.push({ part, score });
  }

  return scored.sort((a, b) => b.score - a.score).map(s => s.part);
}

// ============================================================
// Universal smart search for inventory items (used by InventorySearch,
// InventorySearchInline, CatalogB2B, etc.)
// ============================================================
export interface SearchableItem {
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  [key: string]: any;
}

export function smartFilterInventory<T extends SearchableItem>(items: T[], query: string): T[] {
  const q = normalizeForSearch(query);
  if (q.length < 2) return [];

  const terms = q.split(' ').filter(t => t.length >= 2);
  if (terms.length === 0) return [];

  // Separate vehicle terms, laterality terms, and product terms
  const productTerms: string[] = [];
  const vehicleTerms: string[] = [];
  const lateralityTerms: string[] = [];
  for (const term of terms) {
    if (LATERALITY_TERMS.has(term)) lateralityTerms.push(term);
    else if (VEHICLE_TERMS.has(term)) vehicleTerms.push(term);
    else productTerms.push(term);
  }

  // Expand with synonyms
  const synonymExpanded = expandWithSynonyms(productTerms);

  const scored: { item: T; score: number }[] = [];

  for (const item of items) {
    const codigo = normalizeForSearch(item.codigo);
    const produto = normalizeForSearch(item.produto);
    const fornecedor = normalizeForSearch(item.fornecedor);
    const aplicacao = normalizeForSearch(item.aplicacao);
    const fullText = `${codigo} ${produto} ${fornecedor} ${aplicacao}`;

    // MANDATORY: ALL laterality terms must match
    if (lateralityTerms.length > 0) {
      if (!lateralityTerms.every(lt => fuzzyMatch(fullText, lt))) continue;
    }

    // Vehicle terms must match in aplicacao or produto (using word boundary)
    if (vehicleTerms.length > 0) {
      const matchesVehicle = (text: string, term: string) => {
        const regex = new RegExp(`(^|\\s)${term}(\\s|$)`);
        return regex.test(text);
      };
      if (!vehicleTerms.every(vt => matchesVehicle(aplicacao, vt) || matchesVehicle(produto, vt))) continue;
    }

    let score = 0;
    let matched = 0;
    const totalRequired = productTerms.length;

    // Vehicle and laterality bonuses
    score += vehicleTerms.length * 4;
    score += lateralityTerms.length * 5;

    // Score product terms
    for (const term of productTerms) {
      let ts = 0;
      if (codigo === term) ts += 10;
      else if (codigo.includes(term)) ts += 6;
      if (produto.includes(term)) ts += 4;
      else if (fuzzyMatch(produto, term)) ts += 2;
      if (fornecedor.includes(term)) ts += 2;
      if (aplicacao.includes(term)) ts += 1;
      else if (fuzzyMatch(aplicacao, term)) ts += 0.5;
      if (ts > 0) { matched++; score += ts; }
    }

    // Synonym bonus
    for (const syn of synonymExpanded) {
      if (!productTerms.includes(syn)) {
        if (fullText.includes(syn)) { score += 2; matched = Math.max(matched, 1); }
      }
    }

    if (vehicleTerms.length > 0) matched = Math.max(matched, 1);

    // At least half of product terms must match
    if (totalRequired > 0 && matched / totalRequired < 0.5) continue;
    if (score <= 0 && vehicleTerms.length === 0) continue;

    scored.push({ item, score });
  }

  return scored.sort((a, b) => b.score - a.score).map(s => s.item);
}
