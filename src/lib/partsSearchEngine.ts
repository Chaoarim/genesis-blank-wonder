import { Part } from '@/hooks/usePartsDatabase';

// ========== Pre-normalized part index for fast search ==========
export interface NormalizedPart {
  part: Part;
  code: string;
  codeNoSpaces: string;
  produto: string;
  chave: string;
  aplicacao: string;
  marcaModeloAno: string;
  fornecedor: string;
  contexto: string;
  similares: string;
  vehicleText: string;
  fullText: string;
}

const indexCache = new WeakMap<Part[], NormalizedPart[]>();

export function buildNormalizedIndex(parts: Part[]): NormalizedPart[] {
  const cached = indexCache.get(parts);
  if (cached) return cached;

  const index = parts.map(part => {
    const code = normalizeForSearch(part.fabricante || '');
    const produto = normalizeForSearch(part.produto || '');
    const chave = normalizeForSearch(part.chaveDeBusca || '');
    const aplicacao = normalizeForSearch(part.aplicacao || '');
    const marcaModeloAno = normalizeForSearch(`${part.marca || ''} ${part.modelo || ''} ${part.ano || ''}`);
    const fornecedor = normalizeForSearch(part.fornecedor || '');
    const contexto = normalizeForSearch(part.contextoIA || '');
    const similares = normalizeForSearch(part.codigosSimilares || '');
    const vehicleText = `${marcaModeloAno} ${aplicacao} ${chave}`.trim();
    const fullText = `${produto} ${vehicleText} ${fornecedor} ${contexto} ${similares}`.trim();
    return {
      part,
      code,
      codeNoSpaces: code.replace(/\s/g, ''),
      produto,
      chave,
      aplicacao,
      marcaModeloAno,
      fornecedor,
      contexto,
      similares,
      vehicleText,
      fullText,
    };
  });

  indexCache.set(parts, index);
  return index;
}

const STOP_TERMS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
  'de', 'da', 'do', 'das', 'dos', 'd',
  'em', 'no', 'na', 'nos', 'nas',
  'para', 'pra', 'por', 'pelo', 'pela', 'pelos', 'pelas',
  'com', 'sem', 'e', 'ou', 'ao', 'aos', 'qual', 'quais', 'que',
]);

const LATERALITY_TERMS = new Set([
  'dianteiro', 'dianteira', 'traseiro', 'traseira',
  'esquerdo', 'esquerda', 'direito', 'direita',
  'superior', 'inferior',
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

const KNOWN_BRANDS = new Set([
  'luk', 'sachs', 'valeo', 'ina', 'skf', 'nsk', 'fag', 'timken',
  'bosch', 'delphi', 'denso', 'ngk', 'mahle', 'metal leve',
  'nakata', 'cofap', 'monroe', 'kayaba', 'kyb', 'tokico',
  'fras le', 'cobreq', 'jurid', 'ferodo', 'trw', 'ate',
  'gates', 'dayco', 'continental', 'contitech', 'goodyear',
  'urba', 'marwal', 'brosol', 'weber', 'viemar', 'perfect',
  'mobensani', 'axios', 'sampel', 'moura', 'acdelco', 'motorcraft',
  'wega', 'tecfil', 'mann', 'fram', 'purolator',
  'osram', 'philips', 'hella', 'mte', 'wahler', 'garrett',
  'takao', 'zen', 'koyo', 'nachi', 'irb', 'axor',
  'fremax', 'hipper', 'eixocar', 'gm', 'ford', 'fiat', 'vw', 'volkswagen',
  'honda', 'toyota', 'hyundai', 'renault', 'nissan', 'kia',
  'chevrolet', 'peugeot', 'citroen', 'mitsubishi', 'jeep',
]);

const PRODUCT_PREFIXES_TO_EXCLUDE = [
  'kit', 'jogo', 'jg', 'par',
  'coxim', 'batente', 'coifa', 'suporte', 'prato', 'base', 'reparo', 'calco',
];

const ABBREVIATIONS: Record<string, string[]> = {
  dianteiro: ['diant'],
  dianteira: ['diant'],
  traseiro: ['tras'],
  traseira: ['tras'],
  esquerdo: ['esq'],
  esquerda: ['esq'],
  direito: ['dir'],
  direita: ['dir'],
  superior: ['sup'],
  inferior: ['inf'],
  amortecedor: ['amort'],
  embreagem: ['embr'],
  suspensao: ['susp'],
  distribuicao: ['distrib'],
};

interface SearchBuckets {
  brandTerms: string[];
  lateralityTerms: string[];
  productTerms: string[];
  vehicleTerms: string[];
}

function bigrams(words: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    result.push(`${words[i]} ${words[i + 1]}`);
  }
  return result;
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
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

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokenizeQuery(query: string): string[] {
  return normalizeForSearch(query)
    .split(' ')
    .filter(term => term.length >= 2 && !STOP_TERMS.has(term));
}

function wordBoundaryMatch(text: string, term: string): boolean {
  if (!text || !term) return false;
  const regex = new RegExp(`(^|\\s)${escapeRegExp(term)}(\\s|$)`);
  return regex.test(text);
}

function getEquivalentTerms(term: string): string[] {
  const normalizedTerm = normalizeForSearch(term);
  const equivalents = new Set([normalizedTerm]);

  const directAbbreviations = ABBREVIATIONS[normalizedTerm] || [];
  directAbbreviations.forEach(abbr => equivalents.add(abbr));

  for (const [fullTerm, abbreviations] of Object.entries(ABBREVIATIONS)) {
    if (abbreviations.includes(normalizedTerm)) {
      equivalents.add(fullTerm);
    }
  }

  return Array.from(equivalents);
}

function findCanonicalLaterality(term: string): string | null {
  if (LATERALITY_TERMS.has(term)) return term;

  for (const laterality of LATERALITY_TERMS) {
    if ((ABBREVIATIONS[laterality] || []).includes(term)) {
      return laterality;
    }
  }

  return null;
}

/** Match term against ALREADY-NORMALIZED text (skip re-normalizing) */
function termMatchesNormalized(normalizedText: string, term: string, strictWord = false): boolean {
  if (!normalizedText) return false;

  for (const candidate of getEquivalentTerms(term)) {
    if (wordBoundaryMatch(normalizedText, candidate)) return true;

    if (!strictWord && candidate.length >= 3) {
      if (normalizedText.includes(candidate)) return true;
    }

    if (!strictWord && candidate.includes(' ') && normalizedText.includes(candidate)) {
      return true;
    }

    if (candidate.length >= 4 && /\d/.test(candidate)) {
      const textNoSpaces = normalizedText.replace(/\s/g, '');
      if (textNoSpaces.includes(candidate.replace(/\s/g, ''))) return true;
    }
  }

  return false;
}

function codeMatchesNormalized(normalizedCode: string, codeNoSpaces: string, term: string): boolean {
  const normalizedTerm = normalizeForSearch(term);
  if (!normalizedCode || !normalizedTerm) return false;
  if (normalizedCode === normalizedTerm || normalizedCode.startsWith(normalizedTerm) || normalizedCode.includes(normalizedTerm)) {
    return true;
  }
  const termNoSpaces = normalizedTerm.replace(/\s/g, '');
  return codeNoSpaces === termNoSpaces || codeNoSpaces.startsWith(termNoSpaces) || codeNoSpaces.includes(termNoSpaces);
}

function codeMatches(code: string, term: string): boolean {
  const normalizedCode = normalizeForSearch(code);
  const normalizedTerm = normalizeForSearch(term);

  if (!normalizedCode || !normalizedTerm) return false;

  // Direct comparison
  if (normalizedCode === normalizedTerm || normalizedCode.startsWith(normalizedTerm) || normalizedCode.includes(normalizedTerm)) {
    return true;
  }

  // Compare without spaces (handles "VKBA 4529A" vs "VKBA4529A")
  const codeNoSpaces = normalizedCode.replace(/\s/g, '');
  const termNoSpaces = normalizedTerm.replace(/\s/g, '');

  return codeNoSpaces === termNoSpaces || codeNoSpaces.startsWith(termNoSpaces) || codeNoSpaces.includes(termNoSpaces);
}

function isLikelyPartCode(term: string): boolean {
  const normalizedTerm = normalizeForSearch(term).replace(/\s/g, '');
  return /^(?=.*\d)[a-z0-9-]{4,}$/i.test(normalizedTerm);
}

function hasConflictingProductPrefix(productText: string, requestedProductTerms: string[]): boolean {
  if (requestedProductTerms.length === 0) return false;
  if (requestedProductTerms.some(isLikelyPartCode)) return false;

  const productWords = tokenizeQuery(productText);
  if (productWords.length === 0) return false;

  const requestedWords = new Set(requestedProductTerms.flatMap(term => term.split(' ')));

  for (const prefix of PRODUCT_PREFIXES_TO_EXCLUDE) {
    if (productWords[0] !== prefix) continue;
    if (!requestedWords.has(prefix)) return true;
  }

  return false;
}

function parseSearchBuckets(query: string): SearchBuckets {
  const terms = tokenizeQuery(query);
  const consumedIndexes = new Set<number>();
  const brandTerms: string[] = [];
  const lateralityTerms: string[] = [];
  const productTerms: string[] = [];
  const vehicleTerms: string[] = [];

  const queryBigrams = bigrams(terms);
  queryBigrams.forEach((bigram, index) => {
    if (KNOWN_BRANDS.has(bigram)) {
      brandTerms.push(bigram);
      consumedIndexes.add(index);
      consumedIndexes.add(index + 1);
    }
  });

  terms.forEach((term, index) => {
    if (consumedIndexes.has(index)) return;

    const canonicalLaterality = findCanonicalLaterality(term);
    if (canonicalLaterality) {
      lateralityTerms.push(canonicalLaterality);
      return;
    }

    if (KNOWN_BRANDS.has(term)) {
      brandTerms.push(term);
      return;
    }

    if (VEHICLE_TERMS.has(term)) {
      vehicleTerms.push(term);
      return;
    }

    productTerms.push(term);
  });

  return {
    brandTerms: unique(brandTerms),
    lateralityTerms: unique(lateralityTerms),
    productTerms: unique(productTerms),
    vehicleTerms: unique(vehicleTerms),
  };
}

export function smartFilterParts(partsSource: Part[], query: string): Part[] {
  const q = normalizeForSearch(query);
  if (q.length < 2) return [];

  const { brandTerms, lateralityTerms, productTerms, vehicleTerms } = parseSearchBuckets(query);
  if (brandTerms.length === 0 && lateralityTerms.length === 0 && productTerms.length === 0 && vehicleTerms.length === 0) {
    return [];
  }

  // Use pre-normalized index for speed
  const index = buildNormalizedIndex(partsSource);
  const scored: { part: Part; score: number }[] = [];

  for (const np of index) {
    if (lateralityTerms.length > 0 && !lateralityTerms.every(term => termMatchesNormalized(np.fullText, term, true))) {
      continue;
    }

    if (vehicleTerms.length > 0 && !vehicleTerms.every(term => termMatchesNormalized(np.vehicleText, term, true) || termMatchesNormalized(np.produto, term, true))) {
      continue;
    }

    if (brandTerms.length > 0 && !brandTerms.every(term => termMatchesNormalized(np.fornecedor, term) || termMatchesNormalized(np.produto, term) || codeMatchesNormalized(np.code, np.codeNoSpaces, term))) {
      continue;
    }

    if (hasConflictingProductPrefix(np.produto, productTerms)) {
      continue;
    }

    let score = lateralityTerms.length * 8 + vehicleTerms.length * 6 + brandTerms.length * 7;
    let matchedProductTerms = 0;

    for (const term of productTerms) {
      let matched = false;

      if (codeMatchesNormalized(np.code, np.codeNoSpaces, term)) {
        score += np.code === normalizeForSearch(term) ? 14 : 9;
        matched = true;
      }

      if (termMatchesNormalized(np.produto, term)) {
        score += 7;
        matched = true;
      }

      if (termMatchesNormalized(np.chave, term, true)) {
        score += 4;
        matched = true;
      }

      if (termMatchesNormalized(np.aplicacao, term, true)) {
        score += 3;
        matched = true;
      }

      if (termMatchesNormalized(np.contexto, term, true)) {
        score += 2;
        matched = true;
      }

      if (termMatchesNormalized(np.similares, term)) {
        score += 1;
        matched = true;
      }

      if (!matched) break;
      matchedProductTerms++;
    }

    if (productTerms.length > 0 && matchedProductTerms < productTerms.length) {
      continue;
    }

    if (score <= 0) continue;
    scored.push({ part: np.part, score });
  }

  return scored.sort((a, b) => b.score - a.score).map(entry => entry.part);
}

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

  const { brandTerms, lateralityTerms, productTerms, vehicleTerms } = parseSearchBuckets(query);
  if (brandTerms.length === 0 && lateralityTerms.length === 0 && productTerms.length === 0 && vehicleTerms.length === 0) {
    return [];
  }

  const scored: { item: T; score: number }[] = [];

  for (const item of items) {
    const codigo = normalizeForSearch(item.codigo || '');
    const codigoNoSpaces = codigo.replace(/\s/g, '');
    const produto = normalizeForSearch(item.produto || '');
    const fornecedor = normalizeForSearch(item.fornecedor || '');
    const aplicacao = normalizeForSearch(item.aplicacao || '');
    const fullText = `${codigo} ${produto} ${fornecedor} ${aplicacao}`.trim();

    if (lateralityTerms.length > 0 && !lateralityTerms.every(term => termMatchesNormalized(fullText, term, true))) {
      continue;
    }

    if (vehicleTerms.length > 0 && !vehicleTerms.every(term => termMatchesNormalized(aplicacao, term, true) || termMatchesNormalized(produto, term, true))) {
      continue;
    }

    if (brandTerms.length > 0 && !brandTerms.every(term => termMatchesNormalized(fornecedor, term) || termMatchesNormalized(produto, term) || codeMatchesNormalized(codigo, codigoNoSpaces, term))) {
      continue;
    }

    if (hasConflictingProductPrefix(produto, productTerms)) {
      continue;
    }

    let score = lateralityTerms.length * 8 + vehicleTerms.length * 6 + brandTerms.length * 7;
    let matchedProductTerms = 0;

    for (const term of productTerms) {
      let matched = false;

      if (codeMatchesNormalized(codigo, codigoNoSpaces, term)) {
        score += codigo === normalizeForSearch(term) ? 14 : 9;
        matched = true;
      }

      if (termMatchesNormalized(produto, term)) {
        score += 7;
        matched = true;
      }

      if (termMatchesNormalized(fornecedor, term)) {
        score += 3;
        matched = true;
      }

      if (termMatchesNormalized(aplicacao, term, true)) {
        score += 4;
        matched = true;
      }

      if (!matched) break;
      matchedProductTerms++;
    }

    if (productTerms.length > 0 && matchedProductTerms < productTerms.length) {
      continue;
    }

    if (score <= 0) continue;
    scored.push({ item, score });
  }

  return scored.sort((a, b) => b.score - a.score).map(entry => entry.item);
}
