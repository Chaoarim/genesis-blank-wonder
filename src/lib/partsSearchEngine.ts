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

export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

    // MANDATORY: ALL laterality terms must match in product or vehicle context
    if (lateralityTerms.length > 0) {
      if (!lateralityTerms.every(lt => fullText.includes(lt))) continue;
    }

    // MANDATORY: ALL vehicle terms must match in vehicle-related fields
    if (vehicleTerms.length > 0) {
      if (!vehicleTerms.every(vt => vehicleText.includes(vt) || produto.includes(vt))) continue;
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
      if (chave.includes(term)) termScore += 1;
      if (fornecedor.includes(term)) termScore += 2;

      if (termScore > 0) {
        matchedProduct++;
        score += termScore;
      }
    }

    if (productTerms.length > 0 && matchedProduct / productTerms.length < 0.5) continue;
    if (score <= 0) continue;

    scored.push({ part, score });
  }

  return scored.sort((a, b) => b.score - a.score).map(s => s.part);
}
