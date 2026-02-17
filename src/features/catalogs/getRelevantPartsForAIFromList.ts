import type { Part } from "@/hooks/usePartsDatabase";

const STOP_WORDS = new Set([
  "a","o","as","os","um","uma","uns","umas",
  "de","da","do","das","dos","d",
  "em","no","na","nos","nas",
  "para","pra","por","pelo","pela","pelos","pelas",
  "com","sem","e","ou","ao","aos","à","às",
  "qual","quais","que","é","eh","sera","será","tem","tenho","preciso","procuro","gostaria",
  "peça","peca","peças","pecas","código","codigo","cod","ref","referencia","referência",
  "preco","preço","valor","ano",
  // verbos/comandos comuns (não ajudam a identificar a peça)
  "mostre","mostrar","mostra","liste","listar","lista","todas","todos","tudo","me",
  // restritores comuns
  "somente","so","apenas",
  // categorias amplas (não costumam aparecer como texto literal no CSV)
  "suspensao","suspensão",
  // termos de pergunta (não ajudam a filtrar)
  "aplicacao","aplicação",
  // siglas comuns
  "vw",

]);

const PRODUCT_TERMS = new Set([
   // === CONJUNTOS / KITS ===
   "kit", "jogo", "conjunto",
 
   // === SUSPENSÃO ===
   "amortecedor", "mola", "coxim", "coxins", "batente", "coifa",
   "pivo", "pivô", "bucha", "buchas", "bandeja", "bandejas", "oscilante",
   "braco", "bracos", "braço", "braços", "bieleta", "bieletas",
   "terminal", "terminais", "axial", "axiais", "ponteira", "ponteiras",
   "barra", "estabilizador", "estabilizadora", "tensor", "tensores",
 
   // === ROLAMENTOS / CUBOS ===
   "rolamento", "rolamentos", "rol", "rolam", "rolament",
   "cubo", "cubos", "mancal", "mancais",
 
   // === MOTOR ===
   "bomba", "valvula", "válvula", "junta", "juntas", "motor",
   "correia", "correias", "polia", "polias",
   "bronzina", "bronzinas", "biela", "bielas",
   "pistao", "pistão", "pistoes", "pistões",
   "anel", "aneis", "anéis", "oring", "o-ring",
   "retentor", "retentores", "vedacao", "vedação",
   "virabrequim", "comando", "balancim", "tucho",
   "coletor", "escapamento", "admissao", "admissão",
   // Tipos/códigos de motor (evita que sejam tratados como veículo obrigatório)
   "ap", "zetec", "sigma", "endura", "fire", "evo", "rocam", "power",
   "flexpower", "totalflex", "mpi", "efi", "spi", "tsi", "gdi", "turbo",
   "diesel", "gasolina", "flex", "alcool", "álcool", "etanol",
 
   // === ARREFECIMENTO ===
   "radiador", "radiadores", "mangueira", "mangueiras",
   "reservatorio", "reservatório", "expansao", "expansão",
   "tampa", "tampas", "termostatica", "termostática", "termostatico", "termostático",
   "ventoinha", "eletroventilador", "interruptor",
 
   // === EMBREAGEM / TRANSMISSÃO ===
   "embreagem", "atuador", "acionador",
   "homocinetica", "homocinética", "semieixo", "semi-eixo",
   "cardan", "cruzeta", "diferencial", "cambio", "câmbio",
 
   // === FREIO ===
   "freio", "freios", "disco", "discos",
   "pastilha", "pastilhas", "lona", "lonas",
   "tambor", "tambores", "cilindro", "cilindros",
   "pinca", "pinça", "pinças", "flexivel", "flexível",
   "solido", "sólido", "ventilado", "ventilada",
 
   // === DIREÇÃO ===
   "direcao", "direção", "hidraulica", "hidráulica", "hidraulico", "hidráulico",
   "cremalheira", "caixa", "coluna",
 
   // === ELÉTRICA / IGNIÇÃO ===
   "vela", "velas", "cabo", "cabos", "bobina", "bobinas",
   "sensor", "sensores", "modulo", "módulo",
   "ignicao", "ignição", "alternador", "motor partida",
   "bateria", "chave", "comutador",
 
   // === FILTROS ===
   "filtro", "filtros",
   "ar", "cabine", "condicionado", "polen", "pólen",
   "combustivel", "combustível", "lubrificante",
 
   // === CORREIAS (qualificadores) ===
   "dentada", "dentadas", "polyv", "poly-v", "micro-v", "alt",
 
   // === RODA ===
   "roda", "rodas", "pneu", "pneus", "parafuso", "porca",
 
   // === CARROCERIA / ACESSÓRIOS ===
   "lavador", "parabrisa", "pára-brisa", "limpador", "palheta",
   "retrovisor", "espelho", "vidro", "macaneta", "maçaneta",
   "lanterna", "farol", "lampada", "lâmpada",
 
   // === FLUIDOS (qualificadores) ===
   "agua", "água", "dagua", "d'agua", "oleo", "óleo",
]);

// Termos de medida/especificação que NÃO devem ser tratados como veículo.
const SIZE_TOKENS = new Set(["std", "standard"]);

function isSizeToken(term: string): boolean {
  return SIZE_TOKENS.has(term);
}

// Mapa de exclusões: se o usuário buscar X, excluir produtos que contenham Y
// Isso evita trazer "coxim amortecedor" quando o usuário quer apenas "amortecedor"
const PRODUCT_EXCLUSIONS: Record<string, string[]> = {
  "amortecedor": ["coxim", "cubo", "mola", "batente", "coifa", "prato", "suporte", "base"],
  "rolamento": ["cubo", "coxim"],
  "cubo": ["coxim"],
  "bomba": ["mangueira", "cano", "duto"],
  "disco": ["pastilha", "lona"],
  "pastilha": ["disco"],
  // bronzinas: evita misturar biela vs mancal
  "biela": ["mancal"],
  "mancal": ["biela"],
  // ignição: vela vs cabo vela - quando buscar "vela" sozinha, excluir "cabo"
  "vela": ["cabo"],
  // tampa vs reservatório: "tampa reservatorio" NÃO deve retornar reservatórios sem tampa
  // e "reservatorio" (sem "tampa") NÃO deve retornar tampas
  "tampa": [],  // tampa: não exclui nada sozinha (precisa ser combinada com reservatorio)
  "reservatorio": [], // reservatorio: não exclui nada sozinho, mas veremos lógica abaixo
  // filtros: separar por tipo (ar, cabine, óleo, combustível)
  "ar": ["cabine", "condicionado", "polen", "oleo", "lubrificante", "combustivel"],
  "cabine": ["motor", "combustivel", "oleo", "lubrificante", "ar"],
  "condicionado": ["motor", "combustivel", "oleo", "lubrificante"],
  "polen": ["motor", "combustivel", "oleo", "lubrificante"],
  "combustivel": ["ar", "cabine", "condicionado", "polen", "oleo", "lubrificante"],
  "oleo": ["ar", "cabine", "condicionado", "polen", "combustivel"],
  "lubrificante": ["ar", "cabine", "condicionado", "polen", "combustivel"],
};

// Sinônimos de produto para matching: quando o usuário busca um termo,
// aceitar também termos equivalentes no produto/chaveDeBusca.
// Ex: "correia alternador" deve encontrar "CORREIA POLY-V" e vice-versa.
const PRODUCT_SYNONYMS: Record<string, string[]> = {
  // Correia alternador ↔ Correia POLY-V ↔ Correia micro-v
  "alternador": ["poly-v", "polyv", "alt", "micro-v", "microv"],
  "alt": ["poly-v", "polyv", "alternador", "micro-v", "microv"],
  "polyv": ["alternador", "alt", "poly-v", "micro-v", "microv"],
  "poly-v": ["alternador", "alt", "polyv", "micro-v", "microv"],
  "micro-v": ["alternador", "alt", "polyv", "poly-v", "microv"],
  "microv": ["alternador", "alt", "polyv", "poly-v", "micro-v"],
  // Bandeja ↔ Braço oscilante
  "bandeja": ["braco", "bracos", "braço", "braços", "oscilante"],
  "braco": ["bandeja", "bandejas", "oscilante"],
  "oscilante": ["bandeja", "braco"],
  // Homocinetica ↔ Junta homocinética ↔ Tulipa
  "homocinetica": ["tulipa", "semieixo", "semi-eixo", "tripoide"],
  "tulipa": ["homocinetica", "semieixo"],
  "tripoide": ["homocinetica", "semieixo"],
  // Bomba d'água ↔ Bomba água
  "dagua": ["agua", "d'agua"],
  "agua": ["dagua", "d'agua"],
  // Virabrequim ↔ Girabrequim
  "virabrequim": ["girabrequim"],
  "girabrequim": ["virabrequim"],
  // Coxim ↔ Calço do motor (NÃO usar sinônimos multi-palavra - causa bug de classificação como veículo)
  "coxim": ["calco", "calço"],
  "calco": ["coxim"],
  // Palheta ↔ Limpador ↔ Escova
  "palheta": ["limpador", "escova"],
  "limpador": ["palheta", "escova"],
  // Cabeçote ↔ Tampa de válvulas (contexto diferente, mas frequente)
  "termostatica": ["termostatico"],
  "termostatico": ["termostatica"],
  // Bieleta ↔ Estabilizador (NÃO usar "link estabilizador" multi-palavra)
  "bieleta": ["estabilizador"],
  // Pivô ↔ Terminal de direção (não confundir)
  // Cruzeta ↔ Junta universal
  "cruzeta": ["universal", "cardan"],
};

const KIT_LIKE_TERMS = new Set(["kit", "jogo", "conjunto"]);

// Categorias de kits mutuamente exclusivas
const KIT_CATEGORIES: { terms: string[]; excludeIfNotRequested: string[] }[] = [
  {
    // Kit rolamento / roda
    terms: ["rolamento", "roda", "cubo"],
    excludeIfNotRequested: ["distribuicao", "corrente", "correia", "sincronizador", "embreagem"],
  },
  {
    // Kit distribuição / corrente / correia
    terms: ["distribuicao", "corrente", "correia", "sincronizador"],
    excludeIfNotRequested: ["rolamento", "roda", "cubo", "embreagem"],
  },
  {
    // Kit embreagem
    terms: ["embreagem"],
    excludeIfNotRequested: ["distribuicao", "corrente", "correia", "rolamento", "roda"],
  },
];

const DIRECTION_STEMS = ["traseir","dianteir","frent","tras","direit","esquerd","superior","inferior"];

// Fornecedores conhecidos para busca flexível (ordem das palavras não importa)
const KNOWN_SUPPLIERS = new Set([
  "cofap","skf","nakata","monroe","kyb","sachs","luk","valeo","bosch","delphi",
  "denso","ngk","mahle","mann","wega","fram","continental","contitech","gates","dayco",
  "goodyear","pirelli","firestone","sampel","axios","perfect","hipper","fremax",
  "trw","ate","fras-le","cobreq","jurid","bendix","lonaflex","varga","sabo","sabó",
   "ina","fag","nsk","ntn","koyo","timken","snr","urba","marcon","viemar",
   "mobensani","riosulense","sp","fortlub","formabras","authomix",
   // Fornecedores compostos (duas palavras)
   "magneti","marelli",
]);

function isDirectionTerm(term: string): boolean {
  return DIRECTION_STEMS.some((s) => term.startsWith(s));
}

function isNumericToken(term: string): boolean {
  return /^\d+(?:[./]\d+)?$/.test(term);
}

// Detecta qual categoria de kit foi solicitada na query
function detectKitCategory(normalizedQuery: string): { terms: string[]; excludeIfNotRequested: string[] } | null {
  for (const category of KIT_CATEGORIES) {
    if (category.terms.some((t) => normalizedQuery.includes(t))) {
      return category;
    }
  }
  return null;
}

function isWeakVehicleHardFilterToken(term: string): boolean {
  // Ex.: geração/plataforma (g5, g6...) costuma não estar escrita assim na aplicação
  if (/^[a-z]\d+$/i.test(term)) return true;
  // Ex.: versões curtas (8v, 16v)
  if (/^\d{1,2}v$/i.test(term)) return true;
  return false;
}

function pickRequiredVehicleTerms(vehicleTerms: string[]): string[] {
  const unique = Array.from(new Set(vehicleTerms));
  const strong = unique.filter((t) => !isWeakVehicleHardFilterToken(t));
  if (!strong.length) return [];
  // Retorna TODOS os termos de veículo fortes para filtro rigoroso
  // Isso garante que "PISTÃO COM ANEL GOL" só retorne peças para GOL
  return strong;
}

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9./\s-]/g, " ")
    .replace(/\s+/g, " ")
    // corrige typo comum: "kir" → "kit"
    .replace(/\bkir\b/g, "kit")
    // corrige typo comum: "somenente" → "somente"
    .replace(/\bsomenente\b/g, "somente")
    // corrige typo comum: "fucus" → "focus"
    .replace(/\bfucus\b/g, "focus")
    // corrige typo comum: "mantana" → "montana"
    .replace(/\bmantana\b/g, "montana")
    .trim();
}

// Verifica se um termo existe como palavra inteira no texto (evita GOL casar com GOLF)
function hasWholeWord(text: string, term: string): boolean {
  // Escapa caracteres especiais de regex no termo
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Usa word boundary mais robusto que funciona com texto normalizado
  // Verifica se o termo está cercado por espaço, início/fim de string, ou pontuação
  const regex = new RegExp(`(?:^|[\\s.,;:/\\-])${escaped}(?:[\\s.,;:/\\-]|$)`, "i");
  return regex.test(text);
}

// Filtra o campo de aplicação para mostrar apenas veículos relevantes à consulta
function filterApplicationByVehicle(application: string, vehicleTerms: string[]): string {
  if (vehicleTerms.length === 0) return application;
  
  const normalized = normalizeForSearch(application);
  
  // Divide a aplicação por separadores comuns (/, vírgula, ponto-e-vírgula)
  const segments = application.split(/[,;/]+/).map(s => s.trim()).filter(s => s.length > 0);
  
  // Se só tem um segmento, retorna como está
  if (segments.length <= 1) return application;
  
  // Filtra segmentos que contêm pelo menos um termo de veículo
  const relevantSegments = segments.filter(segment => {
    const normalizedSegment = normalizeForSearch(segment);
    return vehicleTerms.some(term => hasWholeWord(normalizedSegment, term));
  });
  
  // Se encontrou segmentos relevantes, retorna apenas eles
  if (relevantSegments.length > 0) {
    return relevantSegments.join(", ");
  }
  
  // Fallback: retorna aplicação original
  return application;
}

// Extrai e normaliza anos (ex: "ano 93" → "93", "1993" → "93")
function extractYears(text: string): string[] {
  const normalized = normalizeForSearch(text);
  const years: string[] = [];
  
  const anoPattern = /\bano\s*(\d{2,4})\b/gi;
  let match;
  while ((match = anoPattern.exec(normalized)) !== null) {
    const year = match[1].length === 4 ? match[1].slice(2) : match[1];
    years.push(year);
  }
  
  const yearPattern = /\b(19\d{2}|20\d{2}|\d{2})(?=[/\s]|$)/g;
  while ((match = yearPattern.exec(normalized)) !== null) {
    const year = match[1].length === 4 ? match[1].slice(2) : match[1];
    if (!years.includes(year)) years.push(year);
  }
  
  return years;
}

function extractTerms(query: string): string[] {
  const normalized = normalizeForSearch(query);
  if (!normalized) return [];

  const raw = normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  const expanded = new Set<string>();

  // Sinônimos/termos equivalentes para evitar "zero resultados" por variação de nomenclatura na base.
  const addSynonyms = (t: string) => {
    const syns = PRODUCT_SYNONYMS[t];
    if (syns) {
      for (const s of syns) expanded.add(s);
    }
  };

  for (const t of raw) {
    expanded.add(t);
    addSynonyms(t);

    // plurais irregulares comuns
    if (t === "mancais") {
      expanded.add("mancal");
    }

    // Normalização de plural (sem quebrar nomes de veículos, ex: "focus" -> "focu")
    // Só adiciona o singular se ele existir como termo conhecido de produto/fornecedor.
    const addIfKnown = (candidate: string) => {
      const c = candidate.trim();
      if (!c || c.length < 2) return;
      if (PRODUCT_TERMS.has(c) || KNOWN_SUPPLIERS.has(c) || KIT_LIKE_TERMS.has(c)) {
        expanded.add(c);
        addSynonyms(c);
      }
    };

    if (t.length >= 4) {
      // terminais -> terminal, axiais -> axial
      if (t.endsWith("ais")) addIfKnown(`${t.slice(0, -3)}al`);
      // aneis -> anel
      if (t.endsWith("eis")) addIfKnown(`${t.slice(0, -3)}el`);
      // paineis -> painel (genérico), ois -> ol (pouco usado, mas seguro por whitelist)
      if (t.endsWith("ois")) addIfKnown(`${t.slice(0, -3)}ol`);
      // pistoes -> pistao
      if (t.endsWith("oes")) addIfKnown(`${t.slice(0, -3)}ao`);
      if (t.endsWith("aes")) addIfKnown(`${t.slice(0, -3)}ao`);
      // coxins -> coxim
      if (t.endsWith("ns")) addIfKnown(`${t.slice(0, -2)}m`);
      // sensores -> sensor
      if (t.endsWith("es")) addIfKnown(t.slice(0, -2));
      // buchas -> bucha, tampas -> tampa
      if (t.endsWith("s")) addIfKnown(t.slice(0, -1));
    }
  }
  return Array.from(expanded);
}

// Extrai tokens por categoria para busca flexível (ordem não importa)
function extractFlexibleSearchTokens(query: string): {
  supplierTokens: string[];
  productTokens: string[];
  directionTokens: string[];
  sizeTokens: string[];
  vehicleTokens: string[];
  yearTokens: string[];
} {
  const terms = extractTerms(query);
  const years = extractYears(query);
  
  const supplierTokens: string[] = [];
  const productTokens: string[] = [];
  const directionTokens: string[] = [];
  const sizeTokens: string[] = [];
  const vehicleTokens: string[] = [];
  
  for (const term of terms) {
    // SEGURANÇA: ignorar sinônimos multi-palavra que vazaram do extractTerms
    // (sinônimos com espaço são classificados incorretamente como veículo)
    if (term.includes(' ')) continue;
    
    if (isSizeToken(term)) {
      sizeTokens.push(term);
      continue;
    }
    if (KNOWN_SUPPLIERS.has(term)) {
      supplierTokens.push(term);
    } else if (PRODUCT_TERMS.has(term)) {
      productTokens.push(term);
    } else if (!isDirectionTerm(term) && !isNumericToken(term)) {
      vehicleTokens.push(term);
    } else if (isDirectionTerm(term)) {
      directionTokens.push(term);
    }
  }
  
  return { supplierTokens, productTokens, directionTokens, sizeTokens, vehicleTokens, yearTokens: years };
}

function extractVehicleAndIntentTerms(allTerms: string[]): {
  vehicleTerms: string[];
  intentTerms: string[];
} {
  const vehicleTerms = allTerms.filter((t) => {
    if (isNumericToken(t)) return false;
    if (isDirectionTerm(t)) return false;
    if (PRODUCT_TERMS.has(t)) return false;
    if (t.length >= 3) return true;
    if (t.length === 2 && /\d/.test(t)) return true;
    return false;
  });

  const vehicleSet = new Set(vehicleTerms);
  const intentTerms = allTerms.filter((t) => {
    if (vehicleSet.has(t)) return false;
    if (KIT_LIKE_TERMS.has(t)) return false;
    if (isDirectionTerm(t)) return false;
    return true;
  });

  return { vehicleTerms, intentTerms };
}

export function getRelevantPartsForAIFromList(
  parts: Part[],
  query: string,
  limit = 50,
): string {
  const terms = extractTerms(query);
  if (terms.length === 0) return "";

  const normalizedQuery = normalizeForSearch(query);
  const queryHasTampaReservatorio =
    normalizedQuery.includes("tampa") && normalizedQuery.includes("reservatorio");

  // Busca flexível - extrai tokens por categoria
  const { supplierTokens, productTokens, sizeTokens, vehicleTokens, yearTokens } =
    extractFlexibleSearchTokens(query);

  // Regras de precisão específicas: quando o usuário pede "pivo", não queremos retornar itens
  // cujo produto é "BANDEJA/BRACO" (mesmo que mencionem pivo no contexto "S/PIVO").
  const queryWantsPivo = productTokens.includes("pivo");
  const queryWantsBandejaOrBraco = productTokens.includes("bandeja") || productTokens.includes("braco");
  const queryAllowsWithoutPivo =
    normalizedQuery.includes("s/pivo") ||
    normalizedQuery.includes("sem pivo") ||
    normalizedQuery.includes("s pivo");

  const explicitlyWantsKitLike = Array.from(KIT_LIKE_TERMS).some((t) =>
    normalizedQuery.includes(t),
  );
  // Muitos itens de rolamento de roda vêm descritos como "KIT ROLAMENTO" no CSV.
  // Se a pessoa pedir "rolamento" + "roda/cubo", não devemos excluir kits, mesmo sem a palavra "kit".
  const impliedWheelBearingKit =
    normalizedQuery.includes("rolamento") &&
    (normalizedQuery.includes("roda") || normalizedQuery.includes("cubo"));

  const wantsKitLike = explicitlyWantsKitLike || impliedWheelBearingKit;
  // Só exigir a palavra "kit/jogo/conjunto" no produto quando o usuário pediu explicitamente.
  const enforceKitWord = explicitlyWantsKitLike;

  // Termos de produto que NÃO devem ser misturados (são itens distintos, não sinônimos)
  const DISTINCT_PRODUCT_TERMS = new Set([
    "pivo", "pivô", "bandeja", "braco", "braço",
    "bieleta", "bucha", "terminal", "axial", "ponteira",
    "amortecedor", "mola", "coxim", "batente",
    "disco", "pastilha", "tambor", "lona",
    "rolamento", "cubo", "mancal",
    "correia", "tensor", "polia",
    "bomba", "radiador", "mangueira",
    "filtro", "vela", "cabo", "sensor",
  ]);

  // Identifica termos de produto distintos na query (ex: "pivo" na busca "pivo nakata palio")
  const queryDistinctProducts = productTokens.filter((t) => DISTINCT_PRODUCT_TERMS.has(t));

  // Intenção composta: "cabo de vela" deve priorizar cabos e evitar retornar "vela" (vela de ignição).
  // Ex.: "cabo de vela ngk corsa" não pode trazer BKR6... (vela) quando existem SCG.. (cabo vela).
  const wantsSparkPlugCable = productTokens.includes("cabo") && productTokens.includes("vela");

  // Lógica de exclusão mútua: "tampa reservatorio" vs "reservatorio" (sem tampa)
  // Se o usuário pede "tampa reservatorio", deve retornar APENAS tampas (não reservatórios sem tampa)
  // Se o usuário pede "reservatorio" SEM "tampa", deve retornar APENAS reservatórios (não tampas)
  const queryWantsTampa = productTokens.includes("tampa");
  const queryWantsReservatorio = productTokens.includes("reservatorio") || normalizedQuery.includes("reservatorio");
  const queryWantsExpansao = productTokens.includes("expansao") || normalizedQuery.includes("expansao");

  // Exclusão mútua: reservatório EXPANSÃO vs reservatório LAVADOR PARABRISA
  // São categorias completamente diferentes (arrefecimento vs limpeza)
  const queryWantsLavador = normalizedQuery.includes("lavador") || normalizedQuery.includes("parabrisa");
  // Se pediu "expansao" → excluir "lavador/parabrisa"
  // Se pediu "lavador/parabrisa" → excluir "expansao"
  
  const queryMentionsClutch = normalizedQuery.includes("embreagem");
  const queryWantsActuator =
    normalizedQuery.includes("atuador") || normalizedQuery.includes("acionador");
  // Detecta um possível CÓDIGO de peça na consulta.
  // Motivo: códigos como "BPR6EYD" (apenas 1 dígito) estavam sendo classificados como termo de veículo,
  // causando falsos negativos e retornando "Não encontrei" mesmo existindo na base.
  // Regra: sequência com pelo menos 2 letras + ao menos 1 dígito (ex: TC6550, BPR6EYD, BKR6E), ou
  // código numérico longo (ex: 110377).
  const possibleCode = (
    normalizedQuery.match(/\b[a-z]{2,}\d{1,}[a-z0-9-]*\b/i)?.[0] ??
    // códigos numéricos puros (ex: 110377)
    normalizedQuery.match(/\b\d{5,}\b/)?.[0] ??
    ""
  ).toUpperCase();

  // 🔒 Atalho: se a consulta contém um código, priorizar match DIRETO pelo código.
  // Motivo: evita que heurísticas de “veículo/produto” derrubem consultas por código (ex: BPR6EYD).
  // Isso deve sempre retornar algo quando o código existe no CSV.
  if (possibleCode) {
    const codeToken = normalizeForSearch(possibleCode);
    const codeHits = parts.filter((p) => {
      const code = normalizeForSearch(p.fabricante);
      return code === codeToken || code.includes(codeToken);
    });

    if (codeHits.length > 0) {
      return codeHits
        .slice(0, limit)
        .map((p) => {
          const app = (p.chaveDeBusca || p.aplicacao || "").trim();
          const ctx = (p.contextoIA || "").trim();
          return `${p.fornecedor}|${p.fabricante}|${p.produto}|${app}|${ctx}`;
        })
        .join("\n");
    }
  }

  // Detecção de lateralidade (mais robusta - inclui variações)
  const wantsRear = /\b(traseir|tras)\b/.test(normalizedQuery) || normalizedQuery.includes("traseiro") || normalizedQuery.includes("traseira");
  const wantsFront = /\b(dianteir|frent)\b/.test(normalizedQuery) || normalizedQuery.includes("dianteiro") || normalizedQuery.includes("dianteira");
  const wantsStd = sizeTokens.some((t) => t === "std" || t === "standard") || /\bstd\b/.test(normalizedQuery);
  // Se pediu AMBOS (dianteira E traseira), não aplicar filtro restritivo
  const wantsBothDirections = wantsRear && wantsFront;
  const hasDirectionFilter = (wantsRear || wantsFront) && !wantsBothDirections;
  const excludeKits = !wantsKitLike;

  // Detecta categoria específica de kit para filtrar cruzamentos (ex: kit rolamento vs kit distribuição)
  const kitCategory = wantsKitLike ? detectKitCategory(normalizedQuery) : null;

  const requiredVehicleTerms = pickRequiredVehicleTerms(vehicleTokens);
  const requiredProductTerms = productTokens;

  const scored = parts.map((p) => {
    const forn = normalizeForSearch(p.fornecedor);
    const f = normalizeForSearch(p.fabricante);
    const prod = normalizeForSearch(p.produto);
    // CHAVE_DE_BUSCA contém informações valiosas como "VOLKSWAGEN GOL 1.0/1.6/16V 93/"
    // que podem não estar em APLICACAO_COMPLETA. Incluímos na busca para melhorar matching.
    const chaveBusca = normalizeForSearch(p.chaveDeBusca || "");
    // Importante: na base (Excel), o veículo pode estar em colunas separadas (MARCA/MODELO/ANO)
    // e nem sempre aparece em APLICACAO_COMPLETA. Para não "zerar" buscas por modelo (ex: KICKS),
    // usamos um texto de aplicação completo para filtros e ranking, incluindo CHAVE_DE_BUSCA.
    const app = normalizeForSearch(`${p.aplicacao} ${p.marca} ${p.modelo} ${p.ano} ${p.chaveDeBusca || ""} ${p.contextoIA || ""}`);

    let score = 0;
    let matched = 0;

    const isExactCodeMatch =
      Boolean(possibleCode) && p.fabricante.toUpperCase().includes(possibleCode);

    // ══════════════════════════════════════════════════════════════════
    // FILTROS DUROS (PRECISÃO EXATA)
    // ══════════════════════════════════════════════════════════════════
    if (!isExactCodeMatch) {
      // 1. Se pediu (ou implicou) kit → aplicar filtros de kit.
      // Só exigimos a palavra "kit/jogo/conjunto" quando o usuário pediu explicitamente.
      if (wantsKitLike) {
        if (enforceKitWord) {
          const kitOk = Array.from(KIT_LIKE_TERMS).some((t) => prod.includes(t));
          if (!kitOk) {
            return { part: p, score: -9999, isRelevant: false };
          }
        }

        if (queryMentionsClutch && !queryWantsActuator) {
          const actuatorInProd = prod.includes("atuador") || prod.includes("acionador");
          if (actuatorInProd) {
            return { part: p, score: -9999, isRelevant: false };
          }
        }

        // Filtro de categoria de kit (ex: kit rolamento não inclui kit distribuição)
        if (kitCategory) {
          const hasExcludedTerm = kitCategory.excludeIfNotRequested.some((t) => prod.includes(t));
          if (hasExcludedTerm) {
            return { part: p, score: -9999, isRelevant: false };
          }
        }
      }

      // 2. Se NÃO pediu kit → EXCLUIR kits
      if (excludeKits) {
        const productIsKit = Array.from(KIT_LIKE_TERMS).some((t) => prod.includes(t));
        if (productIsKit) {
          return { part: p, score: -9999, isRelevant: false };
        }
      }

      // 3. Lateralidade estrita — se pediu traseiro, EXIGIR traseiro no produto (e vice-versa)
      if (hasDirectionFilter) {
        const productIsRear = /traseir/.test(prod) || prod.includes("tras.");
        const productIsFront = /dianteir/.test(prod) || prod.includes("diant.");
        
        // Se pediu traseiro, o produto DEVE ter "traseiro/traseira" (não apenas "não ser dianteiro")
        if (wantsRear && !productIsRear) {
          return { part: p, score: -9999, isRelevant: false };
        }
        // Se pediu dianteiro, o produto DEVE ter "dianteiro/dianteira"
        if (wantsFront && !productIsFront) {
          return { part: p, score: -9999, isRelevant: false };
        }
      }

      // 3.1 Medida STD — se o usuário pedir STD, o código precisa ser STD.
      // Isso evita retornar variações (0,50 / 0,75 / 1,00 etc) quando a pergunta é "STD".
      if (wantsStd) {
        const codeHasStd = f.includes("std") || prod.includes("std");
        if (!codeHasStd) {
          return { part: p, score: -9999, isRelevant: false };
        }
      }

      // 4. Fornecedor obrigatório (se especificado) - BUSCA FLEXÍVEL
      if (supplierTokens.length > 0) {
        const supplierOk = supplierTokens.some((t) => forn.includes(t));
        if (!supplierOk) {
          return { part: p, score: -9999, isRelevant: false };
        }
      }

      // 5. Veículo obrigatório (usa correspondência de palavra inteira para evitar GOL/GOLF)
      // TODOS os termos de veículo devem estar presentes na aplicação OU produto OU chaveDeBusca
      if (requiredVehicleTerms.length > 0) {
        const vehicleOk = requiredVehicleTerms.every((t) => 
          hasWholeWord(app, t) || hasWholeWord(prod, t) || hasWholeWord(chaveBusca, t)
        );
        if (!vehicleOk) {
          return { part: p, score: -9999, isRelevant: false };
        }
      }

      // 6. Ano: NÃO usar como filtro duro (o CSV frequentemente traz faixas como "83/14" ou "08/";
      // usar apenas como bônus de pontuação para evitar falsos negativos)

      // 7. Tipo de peça obrigatório (quando identificado) + exclusões semânticas
      if (requiredProductTerms.length > 0) {
        // REGRA: se o usuário pediu PIVO (e não pediu BANDEJA/BRACO),
        // não listar BANDEJA/BRACO mesmo quando o texto contém "S/PIVO".
        if (queryWantsPivo && !queryWantsBandejaOrBraco) {
          const looksLikeBandejaOrBraco = prod.startsWith("bandeja") || prod.startsWith("braco");
          if (looksLikeBandejaOrBraco) {
            return { part: p, score: -9999, isRelevant: false };
          }

          const withoutPivoRegex = /\b(?:s\s*\/\s*pivo|sem\s+pivo)\b/;
          const saysWithoutPivo = withoutPivoRegex.test(prod) || withoutPivoRegex.test(chaveBusca);
          if (!queryAllowsWithoutPivo && saysWithoutPivo) {
            return { part: p, score: -9999, isRelevant: false };
          }
        }

        // Caso especial: quando o usuário pede explicitamente "cabo de vela",
        // rejeitar itens de "vela" (spark plug) e exigir contexto de cabo.
        if (wantsSparkPlugCable) {
          const productIsCable = prod.includes("cabo");
          const productLooksLikeSparkPlug = prod.includes("vela") && !prod.includes("cabo");
          const hasIgnitionContext = prod.includes("ignic") || prod.includes("vela");

          if (!productIsCable || !hasIgnitionContext || productLooksLikeSparkPlug) {
            return { part: p, score: -9999, isRelevant: false };
          }
        }

        // Caso especial: TAMPA RESERVATORIO vs RESERVATORIO
        // Se o usuário pede "tampa" (ex: "tampa reservatorio expansao"), EXIGIR que o produto contenha "tampa"
        // Se o usuário pede "reservatorio" SEM "tampa", EXCLUIR produtos que são apenas "tampa"
        if (queryWantsTampa) {
          // Usuário quer TAMPA - produto DEVE conter "tampa"
          const productHasTampa = prod.includes("tampa") || chaveBusca.includes("tampa");
          if (!productHasTampa) {
            return { part: p, score: -9999, isRelevant: false };
          }

          // Se o usuário pediu explicitamente "tampa" + "reservatório",
          // NÃO aceitar outras tampas (óleo/combustível etc.).
          if (queryWantsReservatorio || queryHasTampaReservatorio) {
            const productHasReservatorio =
              prod.includes("reservatorio") || chaveBusca.includes("reservatorio");
            if (!productHasReservatorio) {
              return { part: p, score: -9999, isRelevant: false };
            }
          }

          // Exclusão mútua: TAMPA RESERVATORIO EXPANSAO vs RESERVATORIO LAVADOR C/TAMPA
          // Se pediu "expansao" ou "reservatorio" (sem "lavador/parabrisa"), excluir "lavador/parabrisa"
          // Se pediu "lavador/parabrisa", excluir "expansao"
          const productHasLavador = prod.includes("lavador") || prod.includes("parabrisa") || chaveBusca.includes("lavador") || chaveBusca.includes("parabrisa");
          const productHasExpansao = prod.includes("expansao") || chaveBusca.includes("expansao");

          if (queryWantsExpansao && !queryWantsLavador) {
            // Pediu expansão → excluir lavador/parabrisa
            if (productHasLavador) {
              return { part: p, score: -9999, isRelevant: false };
            }
          } else if (queryWantsLavador && !queryWantsExpansao) {
            // Pediu lavador/parabrisa → excluir expansão
            if (productHasExpansao) {
              return { part: p, score: -9999, isRelevant: false };
            }
          } else if (queryWantsReservatorio && !queryWantsLavador && !queryWantsExpansao) {
            // Pediu apenas "tampa reservatorio" (sem especificar tipo)
            // Por padrão, assumir que quer EXPANSÃO (mais comum) e excluir lavador
            if (productHasLavador) {
              return { part: p, score: -9999, isRelevant: false };
            }
          }
        } else if (queryWantsReservatorio || queryWantsExpansao) {
          // Usuário quer RESERVATORIO/EXPANSAO sem mencionar TAMPA
          // EXCLUIR produtos que são TAMPAS (para não misturar)
          const productIsTampa = prod.includes("tampa") || chaveBusca.includes("tampa");
          if (productIsTampa) {
            return { part: p, score: -9999, isRelevant: false };
          }

          // Exclusão mútua: RESERVATORIO EXPANSAO vs RESERVATORIO LAVADOR PARABRISA
          const productHasLavador = prod.includes("lavador") || prod.includes("parabrisa") || chaveBusca.includes("lavador") || chaveBusca.includes("parabrisa");
          const productHasExpansao = prod.includes("expansao") || chaveBusca.includes("expansao");

          if (queryWantsExpansao && !queryWantsLavador) {
            // Pediu expansão → excluir lavador/parabrisa
            if (productHasLavador) {
              return { part: p, score: -9999, isRelevant: false };
            }
          } else if (queryWantsLavador && !queryWantsExpansao) {
            // Pediu lavador/parabrisa → excluir expansão
            if (productHasExpansao) {
              return { part: p, score: -9999, isRelevant: false };
            }
          } else if (queryWantsReservatorio && !queryWantsLavador && !queryWantsExpansao) {
            // Pediu apenas "reservatorio" → assumir EXPANSÃO e excluir lavador
            if (productHasLavador) {
              return { part: p, score: -9999, isRelevant: false };
            }
          }
        }

        // IMPORTANTE: em parte da base, termos do produto aparecem apenas na CHAVE_DE_BUSCA
        // (ex: "... BJC01027M BANDEJA ..."). Portanto, considerar chaveBusca também.
        // Incluir sinônimos de produto (ex: "alternador" ↔ "poly-v")
        const intentOk = requiredProductTerms.some((t) => {
          if (prod.includes(t) || f.includes(t) || chaveBusca.includes(t)) return true;
          // Verificar sinônimos: se o usuário pediu "alternador", aceitar "poly-v" no produto
          const syns = PRODUCT_SYNONYMS[t];
          if (syns) {
            return syns.some((s) => prod.includes(s) || chaveBusca.includes(s));
          }
          return false;
        });
        if (!intentOk) {
          return { part: p, score: -9999, isRelevant: false };
        }
        
        // Verificar exclusões semânticas (ex: "amortecedor" exclui "coxim amortecedor")
        for (const reqTerm of requiredProductTerms) {
          const exclusions = PRODUCT_EXCLUSIONS[reqTerm];
          if (exclusions) {
            const hasExcludedTerm = exclusions.some((excl) => {
              // Só excluir se o termo de exclusão NÃO foi explicitamente pedido
              const userWantsExcludedTerm = requiredProductTerms.includes(excl);
              if (userWantsExcludedTerm) return false;
              // Exceção: "rolamento" + "roda" na busca → não excluir "cubo" 
              // porque "cubo roda c/ rolamento" É um rolamento de roda
              if (reqTerm === "rolamento" && excl === "cubo" && requiredProductTerms.includes("roda")) {
                return false;
              }
              return prod.includes(excl);
            });
            if (hasExcludedTerm) {
              return { part: p, score: -9999, isRelevant: false };
            }
          }
        }

        // FILTRO DE PRECISÃO: Se o usuário pediu um tipo de peça distinto (ex: "pivo"),
        // o produto DEVE conter esse termo específico. Não aceita outros tipos de peça.
        // Ex: "pivo nakata palio" NÃO deve retornar "BANDEJA" ou "BRACO"
        if (queryDistinctProducts.length > 0) {
          const productHasRequestedType = queryDistinctProducts.some((t) => {
            // Verifica se o termo está no produto ou na chave de busca (incluindo sinônimos)
            if (prod.includes(t) || chaveBusca.includes(t)) return true;
            const syns = PRODUCT_SYNONYMS[t];
            if (syns) return syns.some((s) => prod.includes(s) || chaveBusca.includes(s));
            return false;
          });
          
          // Se não tem o tipo de peça solicitado, verifica se tem outro tipo distinto
          if (!productHasRequestedType) {
            // Verifica se o produto é de outro tipo distinto (ex: bandeja quando pediu pivo)
            const productHasOtherDistinctType = Array.from(DISTINCT_PRODUCT_TERMS).some((t) => {
              // Não verificar o próprio termo que estamos buscando
              if (queryDistinctProducts.includes(t)) return false;
              return prod.includes(t) || chaveBusca.includes(t);
            });
            
            if (productHasOtherDistinctType) {
              return { part: p, score: -9999, isRelevant: false };
            }
          }
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // PONTUAÇÃO PARA RANKING (ORDEM NÃO IMPORTA)
    // ══════════════════════════════════════════════════════════════════
    if (isExactCodeMatch) score += 100;

    // Bônus para lateralidade correta
    if (wantsRear && prod.includes("traseir")) score += 15;
    if (wantsFront && prod.includes("dianteir")) score += 15;

    // Bônus por match de fornecedor
    for (const token of supplierTokens) {
      if (forn.includes(token)) {
        score += 25;
        matched += 1;
      }
    }

    // Bônus por match de ano (verifica app e chaveDeBusca)
    for (const year of yearTokens) {
      if (app.includes(year) || chaveBusca.includes(year)) {
        score += 12;
        matched += 1;
      }
    }

    for (const term of terms) {
      // Para termos de veículo, usar correspondência de palavra inteira
      const isVehicleTerm = requiredVehicleTerms.includes(term);
      const inFab = f.includes(term);
      const inProd = isVehicleTerm ? hasWholeWord(prod, term) : prod.includes(term);
      const inApp = isVehicleTerm ? hasWholeWord(app, term) : app.includes(term);
      const inForn = forn.includes(term);
      const inChave = isVehicleTerm ? hasWholeWord(chaveBusca, term) : chaveBusca.includes(term);

      if (inFab || inProd || inApp || inForn || inChave) {
        matched += 1;
        if (inFab) score += 20;
        if (inProd) score += requiredProductTerms.includes(term) ? 14 : 8;
        if (inApp) score += requiredVehicleTerms.includes(term) ? 18 : 4;
        if (inForn) score += 10;
        if (inChave) score += requiredVehicleTerms.includes(term) ? 16 : 6;
      }
    }

    const ratio = terms.length ? matched / terms.length : 0;
    const minRatio = 0.4; // Mais flexível para consultas variadas
    const isRelevant = isExactCodeMatch || ratio >= minRatio || matched >= 2;

    return { part: p, score, isRelevant };
  });

  // Filtra, ordena e remove duplicatas baseado no código do fabricante
  const relevantSorted = scored
    .filter((r) => r.isRelevant)
    .sort((a, b) => b.score - a.score);

  // Consolida linhas repetidas do MESMO código (fabricante) unindo aplicações.
  // Isso evita perder aplicações quando a mesma peça aparece em várias linhas (ex: anos diferentes).
  const aggregated = new Map<
    string,
    {
      best: (typeof relevantSorted)[number];
      appKeys: Set<string>;
      apps: string[];
      ctxKeys: Set<string>;
      ctxs: string[];
    }
  >();
  const order: string[] = [];

  for (const item of relevantSorted) {
    const key = `${item.part.fornecedor}|${item.part.fabricante}`.toLowerCase();
    let entry = aggregated.get(key);
    if (!entry) {
      entry = { best: item, appKeys: new Set<string>(), apps: [], ctxKeys: new Set<string>(), ctxs: [] };
      aggregated.set(key, entry);
      order.push(key);
    }

    // mantém o melhor score como referência do produto/código
    if (item.score > entry.best.score) {
      entry.best = item;
    }

    // Preserva CHAVE_DE_BUSCA intacta
    const chaveBuscaValue = (item.part.chaveDeBusca || "").trim();
    if (chaveBuscaValue) {
      const segKey = normalizeForSearch(chaveBuscaValue);
      if (!entry.appKeys.has(segKey)) {
        entry.appKeys.add(segKey);
        entry.apps.push(chaveBuscaValue);
      }
    }

    // Merge contextoIA de todas as linhas do mesmo código
    const ctxValue = (item.part.contextoIA || "").trim();
    if (ctxValue) {
      const ctxKey = normalizeForSearch(ctxValue);
      if (!entry.ctxKeys.has(ctxKey)) {
        entry.ctxKeys.add(ctxKey);
        entry.ctxs.push(ctxValue);
      }
    }
  }

  const merged = order.map((k) => {
    const entry = aggregated.get(k)!;
    // Se temos múltiplas aplicações diferentes, junta com " | " para clareza
    const mergedApp = entry.apps.length 
      ? entry.apps.join(" | ") 
      : entry.best.part.chaveDeBusca || entry.best.part.aplicacao;
    // Merge contextoIA de todas as linhas do mesmo código
    const mergedCtx = entry.ctxs.length
      ? entry.ctxs.join(" | ")
      : entry.best.part.contextoIA || "";
    return {
      ...entry.best,
      part: {
        ...entry.best.part,
        aplicacao: mergedApp,
        contextoIA: mergedCtx,
      },
    };
  });

  // Fallback ancorado em veículo (anti-falso-negativo sem misturar carros):
  // Quando a query tem termo(s) de veículo (ex: FOCUS) e também termo(s) de produto (ex: TAMPA/RESERVATORIO),
  // mas os filtros duros derrubarem tudo, fazemos uma busca tolerante QUE AINDA EXIGE o(s) termo(s) de veículo.
  const anchoredRequiredProductTerms =
    requiredProductTerms.length > 0
      ? requiredProductTerms
      : queryHasTampaReservatorio
        ? ["tampa", "reservatorio"]
        : [];

  if (merged.length === 0 && requiredVehicleTerms.length > 0 && anchoredRequiredProductTerms.length > 0) {
    const anchored = parts
      .map((p) => {
        const forn = normalizeForSearch(p.fornecedor);
        const f = normalizeForSearch(p.fabricante);
        const prod = normalizeForSearch(p.produto);
        const chaveBusca = normalizeForSearch(p.chaveDeBusca || "");
        const app = normalizeForSearch(`${p.aplicacao} ${p.marca} ${p.modelo} ${p.ano} ${p.chaveDeBusca || ""}`);

        // Veículo obrigatório (NÃO aceitar veículo só no produto)
        const vehicleOk = requiredVehicleTerms.every((t) => hasWholeWord(app, t) || hasWholeWord(chaveBusca, t));
        if (!vehicleOk) return null;

        // Tipo de peça (âncora) obrigatório
        const intentOk = anchoredRequiredProductTerms.some((t) =>
          prod.includes(t) || f.includes(t) || chaveBusca.includes(t),
        );
        if (!intentOk) return null;

        // Exclusões mútuas (mesma regra do filtro duro)
        if (queryWantsTampa) {
          if (!(prod.includes("tampa") || chaveBusca.includes("tampa"))) return null;

          // Se a intenção foi "tampa reservatório", não aceitar outras tampas.
          if (queryWantsReservatorio || queryHasTampaReservatorio) {
            const productHasReservatorio =
              prod.includes("reservatorio") || chaveBusca.includes("reservatorio");
            if (!productHasReservatorio) return null;
          }
        } else if (queryWantsReservatorio || queryWantsExpansao) {
          if (prod.includes("tampa") || chaveBusca.includes("tampa")) return null;
        }

        const productHasLavador = prod.includes("lavador") || prod.includes("parabrisa") || chaveBusca.includes("lavador") || chaveBusca.includes("parabrisa");
        const productHasExpansao = prod.includes("expansao") || chaveBusca.includes("expansao");
        if (queryWantsExpansao && !queryWantsLavador) {
          if (productHasLavador) return null;
        } else if (queryWantsLavador && !queryWantsExpansao) {
          if (productHasExpansao) return null;
        } else if (queryWantsReservatorio && !queryWantsLavador && !queryWantsExpansao) {
          // default: reservatório → expansão (excluir lavador)
          if (productHasLavador) return null;
        }

        let score = 0;
        let matched = 0;

        // Bônus forte por veículo (garante que FOCUS suba acima de outros)
        for (const vt of requiredVehicleTerms) {
          if (hasWholeWord(app, vt) || hasWholeWord(chaveBusca, vt)) {
            score += 40;
            matched += 1;
          }
        }

        for (const term of terms) {
          const isVehicleTerm = requiredVehicleTerms.includes(term);
          const inFab = f.includes(term);
          const inProd = isVehicleTerm ? false : prod.includes(term);
          const inApp = isVehicleTerm ? (hasWholeWord(app, term) || hasWholeWord(chaveBusca, term)) : app.includes(term);
          const inForn = forn.includes(term);
          const inChave = isVehicleTerm ? hasWholeWord(chaveBusca, term) : chaveBusca.includes(term);

          if (inFab || inProd || inApp || inForn || inChave) {
            matched += 1;
            if (inFab) score += 20;
            if (inProd) score += anchoredRequiredProductTerms.includes(term) ? 14 : 8;
            if (inApp) score += isVehicleTerm ? 22 : 6;
            if (inForn) score += 10;
            if (inChave) score += isVehicleTerm ? 20 : 6;
          }
        }

        const ratio = terms.length ? matched / terms.length : 0;
        const isRelevant = ratio >= 0.34 || matched >= 2;
        if (!isRelevant || score <= 0) return null;

        return { part: p, score };
      })
      .filter((x): x is { part: Part; score: number } => Boolean(x))
      .sort((a, b) => b.score - a.score);

    return anchored
      .slice(0, limit)
      .map((r) => `${r.part.fornecedor}|${r.part.fabricante}|${r.part.produto}|${r.part.aplicacao}|${r.part.contextoIA || ""}`)
      .join("\n");
  }

  // Fallback anti-falso-negativo:
  // Se por alguma combinação de filtros duros nada passar, fazemos uma busca mais tolerante
  // (sem veículo como filtro duro), mantendo a exclusão mútua TAMPA vs RESERVATORIO.
  // Objetivo: evitar "não encontrei" quando a peça existe na base.
  if (merged.length === 0 && requiredVehicleTerms.length === 0) {
    const fallbackScored = parts
      .map((p) => {
        const forn = normalizeForSearch(p.fornecedor);
        const f = normalizeForSearch(p.fabricante);
        const prod = normalizeForSearch(p.produto);
        const chaveBusca = normalizeForSearch(p.chaveDeBusca || "");
        const app = normalizeForSearch(`${p.aplicacao} ${p.marca} ${p.modelo} ${p.ano} ${p.chaveDeBusca || ""}`);

        // Exclusões mútuas (mesma regra do filtro duro)
        if (queryWantsTampa) {
          if (!(prod.includes("tampa") || chaveBusca.includes("tampa"))) return null;
        } else if (queryWantsReservatorio || queryWantsExpansao) {
          if (prod.includes("tampa") || chaveBusca.includes("tampa")) return null;
        }

        const productHasLavador = prod.includes("lavador") || prod.includes("parabrisa") || chaveBusca.includes("lavador") || chaveBusca.includes("parabrisa");
        const productHasExpansao = prod.includes("expansao") || chaveBusca.includes("expansao");

        if (queryWantsExpansao && !queryWantsLavador) {
          if (productHasLavador) return null;
        } else if (queryWantsLavador && !queryWantsExpansao) {
          if (productHasExpansao) return null;
        } else if (queryWantsReservatorio && !queryWantsLavador && !queryWantsExpansao) {
          // default: reservatório → expansão (excluir lavador)
          if (productHasLavador) return null;
        }

        let score = 0;
        let matched = 0;
        for (const term of terms) {
          const inFab = f.includes(term);
          const inProd = prod.includes(term);
          const inApp = app.includes(term);
          const inForn = forn.includes(term);
          const inChave = chaveBusca.includes(term);
          if (inFab || inProd || inApp || inForn || inChave) {
            matched += 1;
            if (inFab) score += 20;
            if (inProd) score += requiredProductTerms.includes(term) ? 14 : 8;
            if (inApp) score += 6;
            if (inForn) score += 10;
            if (inChave) score += 6;
          }
        }

        const ratio = terms.length ? matched / terms.length : 0;
        const isRelevant = ratio >= 0.34 || matched >= 2;
        if (!isRelevant || score <= 0) return null;
        return { part: p, score };
      })
      .filter((x): x is { part: Part; score: number } => Boolean(x))
      .sort((a, b) => b.score - a.score);

    return fallbackScored
      .slice(0, limit)
      .map((r) => `${r.part.fornecedor}|${r.part.fabricante}|${r.part.produto}|${r.part.aplicacao}|${r.part.contextoIA || ""}`)
      .join("\n");
  }

  return merged
    .slice(0, limit)
    .map((r) => `${r.part.fornecedor}|${r.part.fabricante}|${r.part.produto}|${r.part.aplicacao}|${r.part.contextoIA || ""}`)
    .join("\n");
}
