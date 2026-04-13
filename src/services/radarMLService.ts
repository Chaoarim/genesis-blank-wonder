import { supabase } from '@/integrations/supabase/client';
// supabase is still used for cache operations (radar_cache, radar_historico, radar_favoritos)

const ML_BASE = 'https://api.mercadolibre.com';
const CATEGORY = 'MLB1743';
const DELAY_MS = 500;

// --- Types ---
export interface RadarMLItem {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  sold_quantity: number;
  available_quantity: number;
  thumbnail: string;
  permalink: string;
  condition: string;
  seller: { id: number; nickname: string };
  address: { state_id: string; state_name: string; city_name: string };
  shipping: { free_shipping: boolean; tags: string[] };
  installments: { quantity: number; amount: number } | null;
  attributes: Array<{ id: string; name: string; value_name: string | null }>;
}

export interface RadarSearchResult {
  results: RadarMLItem[];
  paging: { total: number; offset: number; limit: number };
}

export interface RadarKPIs {
  totalAnuncios: number;
  totalVendido: number;
  precoMinimo: number;
  precoMedio: number;
  precoMaximo: number;
  melhorPrecoItem: RadarMLItem | null;
  liderVendas: { nome: string; vendas: number; share: number; sellerId: number } | null;
  emTendencia: boolean;
}

export interface RadarSellerDetail {
  id: number;
  nickname: string;
  logo: string | null;
  permalink: string;
  registration_date: string;
  seller_reputation: {
    level_id: string;
    power_seller_status: string | null;
    transactions: {
      total: number;
      completed: number;
      canceled: number;
      ratings: { positive: number; negative: number; neutral: number };
    };
    metrics: {
      sales: { period: string; completed: number };
      claims: { rate: number };
      delayed_handling_time: { rate: number };
      cancellations: { rate: number };
    };
  };
  address: { state: string; city: string };
}

export interface RadarRegionalData {
  estado: string;
  estadoCodigo: string;
  totalAnuncios: number;
  precoMedio: number;
  menorPreco: number;
  vendedorLider: string;
  tendencia: 'alta' | 'estavel' | 'baixa';
}

export interface RadarPriceRange {
  faixa: string;
  min: number;
  max: number;
  quantidade: number;
}

export interface RadarInsight {
  tipo: string;
  emoji: string;
  titulo: string;
  descricao: string;
  cor: string;
}

export interface RadarCompleteResult {
  kpis: RadarKPIs;
  items: RadarMLItem[];
  sellers: RadarSellerProfile[];
  regional: RadarRegionalData[];
  priceRanges: RadarPriceRange[];
  insights: RadarInsight[];
  searchTerm: string;
  searchDate: string;
  fromCache: boolean;
}

export interface RadarSellerProfile {
  seller: RadarSellerDetail | null;
  vendas: number;
  share: number;
  precoMedio: number;
  items: RadarMLItem[];
}

// States
export const REGIOES = {
  'Sudeste': ['BR-SP', 'BR-MG', 'BR-RJ', 'BR-ES'],
  'Sul': ['BR-PR', 'BR-SC', 'BR-RS'],
  'Nordeste': ['BR-BA', 'BR-PE', 'BR-CE', 'BR-MA', 'BR-PI', 'BR-RN', 'BR-PB', 'BR-AL', 'BR-SE'],
  'Centro-Oeste': ['BR-GO', 'BR-MT', 'BR-MS', 'BR-DF'],
  'Norte': ['BR-AM', 'BR-PA', 'BR-AC', 'BR-RO', 'BR-RR', 'BR-AP', 'BR-TO'],
} as const;

export const TODOS_ESTADOS = [
  { code: 'BR-SP', name: 'São Paulo' }, { code: 'BR-MG', name: 'Minas Gerais' },
  { code: 'BR-RJ', name: 'Rio de Janeiro' }, { code: 'BR-RS', name: 'Rio Grande do Sul' },
  { code: 'BR-PR', name: 'Paraná' }, { code: 'BR-SC', name: 'Santa Catarina' },
  { code: 'BR-BA', name: 'Bahia' }, { code: 'BR-GO', name: 'Goiás' },
  { code: 'BR-PE', name: 'Pernambuco' }, { code: 'BR-CE', name: 'Ceará' },
  { code: 'BR-ES', name: 'Espírito Santo' }, { code: 'BR-MT', name: 'Mato Grosso' },
  { code: 'BR-MS', name: 'Mato Grosso do Sul' }, { code: 'BR-DF', name: 'Distrito Federal' },
  { code: 'BR-AM', name: 'Amazonas' }, { code: 'BR-PA', name: 'Pará' },
  { code: 'BR-MA', name: 'Maranhão' }, { code: 'BR-PI', name: 'Piauí' },
  { code: 'BR-RN', name: 'Rio Grande do Norte' }, { code: 'BR-PB', name: 'Paraíba' },
  { code: 'BR-AL', name: 'Alagoas' }, { code: 'BR-SE', name: 'Sergipe' },
  { code: 'BR-TO', name: 'Tocantins' }, { code: 'BR-RO', name: 'Rondônia' },
  { code: 'BR-AC', name: 'Acre' }, { code: 'BR-AP', name: 'Amapá' },
  { code: 'BR-RR', name: 'Roraima' },
];

export const MONTADORAS: Record<string, string[]> = {
  'Volkswagen': ['Gol', 'Polo', 'T-Cross', 'Virtus', 'Saveiro', 'Amarok', 'Nivus', 'Taos', 'Tiguan'],
  'Chevrolet': ['Onix', 'Tracker', 'S10', 'Spin', 'Equinox', 'Montana', 'Cruze', 'Trailblazer'],
  'Fiat': ['Argo', 'Cronos', 'Toro', 'Strada', 'Ducato', 'Mobi', 'Pulse', 'Fastback'],
  'Toyota': ['Hilux', 'Corolla', 'Yaris', 'SW4', 'RAV4', 'Corolla Cross'],
  'Honda': ['Civic', 'City', 'HR-V', 'CR-V', 'Fit', 'WR-V', 'ZR-V'],
  'Hyundai': ['HB20', 'Creta', 'Tucson', 'Santa Fe', 'HB20S'],
  'Jeep': ['Renegade', 'Compass', 'Commander', 'Wrangler'],
  'Renault': ['Kwid', 'Sandero', 'Duster', 'Oroch', 'Captur', 'Kardian'],
  'Nissan': ['Kicks', 'Versa', 'Frontier', 'Sentra'],
  'Ford': ['Ranger', 'Territory', 'Bronco', 'Maverick'],
  'Mitsubishi': ['L200', 'Outlander', 'Eclipse Cross', 'Pajero Sport'],
  'Peugeot': ['208', '2008', '3008', 'Partner'],
  'Citroën': ['C3', 'C4 Cactus', 'Jumpy'],
  'Mercedes-Benz': ['Sprinter', 'GLA', 'Classe C', 'Actros'],
  'BMW': ['X1', 'Série 3', '320i', 'X3'],
  'Audi': ['A3', 'Q3', 'Q5', 'A4'],
  'Volvo': ['XC40', 'XC60', 'FH'],
  'Scania': ['R450', 'P320', 'G500'],
  'MAN': ['TGX', 'TGS'],
  'Iveco': ['Daily', 'Tector', 'Hi-Way'],
};

export const CATEGORIAS_PECA = [
  'Filtros', 'Freios', 'Suspensão', 'Motor', 'Embreagem',
  'Transmissão', 'Elétrica', 'Arrefecimento', 'Injeção', 'Direção',
];

// Token management is handled server-side by the ml-proxy Edge Function
    if (!tokenData?.access_token) return null;

    // Check if expired (with 5min buffer)
    const expiresAt = new Date(tokenData.expires_at).getTime();
    if (Date.now() > expiresAt - 300000) {
      // Token expired — try refreshing via proxy
      console.log('[mlFetch] Token expired, attempting refresh via proxy...');
      try {
        const { data } = await supabase.functions.invoke('ml-proxy', {
          body: { url: 'https://api.mercadolibre.com/sites/MLB' }, // dummy call to trigger refresh
        });
        if (data?.ok) {
          // Re-fetch the refreshed token
          const { data: refreshed } = await supabase
            .from('ml_tokens')
            .select('access_token')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          return refreshed?.access_token || null;
        }
      } catch {
        // Refresh failed
      }
      return null;
    }

    return tokenData.access_token;
  } catch {
    return null;
  }
}

// All ML API calls go through the ml-proxy Edge Function to avoid CORS issues
async function mlFetch<T>(url: string, _timeoutMs = 20000): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ml-proxy', {
    body: { url },
  });

  if (error) {
    console.error('[mlFetch] Edge function error:', error);
    throw new Error('Erro ao conectar com o Mercado Livre via proxy');
  }

  if (!data?.ok) {
    const msg = data?.error || 'Erro desconhecido do Mercado Livre';
    console.error('[mlFetch] Proxy returned error:', msg);
    if (data?.not_connected) {
      throw new Error('ML não conectado. Autorize sua conta do Mercado Livre primeiro.');
    }
    throw new Error(msg);
  }

  return data.data as T;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// --- API Functions ---
export async function radarBuscar(query: string, offset = 0, limit = 50, state?: string): Promise<RadarSearchResult> {
  const q = encodeURIComponent(query);
  let url = `${ML_BASE}/sites/MLB/search?q=${q}&category=${CATEGORY}&sort=sold_quantity_desc&limit=${limit}&offset=${offset}`;
  if (state) url += `&state=${state}`;
  return mlFetch<RadarSearchResult>(url);
}

export async function radarItemDetails(ids: string[]): Promise<any[]> {
  if (!ids.length) return [];
  const url = `${ML_BASE}/items?ids=${ids.join(',')}`;
  return mlFetch<any[]>(url);
}

export async function radarSellerDetail(userId: number): Promise<RadarSellerDetail> {
  return mlFetch<RadarSellerDetail>(`${ML_BASE}/users/${userId}`);
}

export async function radarTrends(): Promise<any[]> {
  try {
    return await mlFetch<any[]>(`${ML_BASE}/trends/MLB`);
  } catch { return []; }
}

// --- Cache ---
export async function getRadarCache(termo: string, estado: string): Promise<RadarCompleteResult | null> {
  const { data } = await supabase
    .from('radar_cache')
    .select('*')
    .eq('termo_busca', termo.trim().toLowerCase())
    .eq('estado_filtro', estado)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (!data?.length) return null;
  const row = data[0];
  const payload = row.payload_json as any;
  return {
    ...payload,
    fromCache: true,
    searchDate: row.created_at,
  };
}

export async function saveRadarCache(termo: string, estado: string, result: RadarCompleteResult): Promise<void> {
  // Delete old
  await supabase
    .from('radar_cache')
    .delete()
    .eq('termo_busca', termo.trim().toLowerCase())
    .eq('estado_filtro', estado);

  const expires = new Date();
  expires.setHours(expires.getHours() + 24);

  await (supabase.from('radar_cache') as any).insert({
    tipo_busca: 'codigo_peca',
    termo_busca: termo.trim().toLowerCase(),
    estado_filtro: estado,
    payload_json: result,
    total_anuncios: result.kpis.totalAnuncios,
    total_vendido_soma: result.kpis.totalVendido,
    preco_minimo: result.kpis.precoMinimo,
    preco_medio: result.kpis.precoMedio,
    preco_maximo: result.kpis.precoMaximo,
    vendedor_lider_nome: result.kpis.liderVendas?.nome || '',
    vendedor_lider_vendas: result.kpis.liderVendas?.vendas || 0,
    expires_at: expires.toISOString(),
  });
}

export async function saveRadarHistorico(termo: string, preco_medio: number, total_vendido: number, estado: string) {
  await (supabase.from('radar_historico') as any).insert({
    termo_busca: termo.trim().toLowerCase(),
    preco_medio,
    total_vendido,
    estado,
    data_registro: new Date().toISOString().split('T')[0],
  });
}

// --- Favorites ---
export async function getRadarFavoritos() {
  const { data } = await (supabase.from('radar_favoritos') as any)
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function addRadarFavorito(termo: string, tipo: string, label?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await (supabase.from('radar_favoritos') as any).insert({
    user_id: user.id,
    termo_busca: termo,
    tipo_busca: tipo,
    label_personalizado: label || termo,
  });
}

export async function removeRadarFavorito(id: string) {
  await (supabase.from('radar_favoritos') as any).delete().eq('id', id);
}

// --- Main search orchestrator ---
export async function radarSearchComplete(
  query: string,
  estadoFiltro: string = 'BRASIL',
  onProgress?: (step: string) => void
): Promise<RadarCompleteResult> {
  const termo = query.trim();

  // Check cache
  onProgress?.('Verificando cache...');
  const cached = await getRadarCache(termo, estadoFiltro);
  if (cached) {
    onProgress?.('Dados encontrados no cache!');
    return cached;
  }

  // 1. Main search (2 pages)
  onProgress?.('Conectando ao Mercado Livre...');
  const stateParam = estadoFiltro !== 'BRASIL' ? estadoFiltro : undefined;
  const [page1, page2] = await Promise.all([
    radarBuscar(termo, 0, 50, stateParam),
    radarBuscar(termo, 50, 50, stateParam),
  ]);

  const allItems: RadarMLItem[] = [...(page1.results || []), ...(page2.results || [])];
  const totalFromPaging = page1.paging?.total || allItems.length;

  if (!allItems.length) {
    return {
      kpis: { totalAnuncios: 0, totalVendido: 0, precoMinimo: 0, precoMedio: 0, precoMaximo: 0, melhorPrecoItem: null, liderVendas: null, emTendencia: false },
      items: [], sellers: [], regional: [], priceRanges: [], insights: [],
      searchTerm: termo, searchDate: new Date().toISOString(), fromCache: false,
    };
  }

  // 2. Seller analysis
  onProgress?.('Analisando top vendedores...');
  const sellerMap = new Map<number, { vendas: number; items: RadarMLItem[] }>();
  for (const item of allItems) {
    const sid = item.seller?.id;
    if (!sid) continue;
    const prev = sellerMap.get(sid) || { vendas: 0, items: [] };
    prev.vendas += item.sold_quantity || 0;
    prev.items.push(item);
    sellerMap.set(sid, prev);
  }

  const topSellerIds = [...sellerMap.entries()]
    .sort((a, b) => b[1].vendas - a[1].vendas)
    .slice(0, 5)
    .map(([id]) => id);

  const totalVendido = allItems.reduce((s, i) => s + (i.sold_quantity || 0), 0);

  let sellerDetails: RadarSellerProfile[] = [];
  try {
    const details = await Promise.all(
      topSellerIds.map(async (id, i) => {
        if (i > 0) await delay(DELAY_MS);
        try { return await radarSellerDetail(id); } catch { return null; }
      })
    );
    sellerDetails = details.map((detail, i) => {
      const sid = topSellerIds[i];
      const info = sellerMap.get(sid)!;
      const prices = info.items.map(it => it.price);
      return {
        seller: detail,
        vendas: info.vendas,
        share: totalVendido > 0 ? Math.round((info.vendas / totalVendido) * 100) : 0,
        precoMedio: prices.length ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : 0,
        items: info.items,
      };
    });
  } catch {}

  // 3. KPIs
  onProgress?.('Calculando métricas de mercado...');
  const prices = allItems.map(i => i.price).filter(p => p > 0);
  const precoMinimo = prices.length ? Math.min(...prices) : 0;
  const precoMaximo = prices.length ? Math.max(...prices) : 0;
  const precoMedio = prices.length ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : 0;

  const melhorPrecoItem = allItems.reduce<RadarMLItem | null>((best, item) => {
    if (!best || item.price < best.price) return item;
    return best;
  }, null);

  const topSeller = [...sellerMap.entries()].sort((a, b) => b[1].vendas - a[1].vendas)[0];
  const liderVendas = topSeller ? {
    nome: allItems.find(i => i.seller?.id === topSeller[0])?.seller?.nickname || '',
    vendas: topSeller[1].vendas,
    share: totalVendido > 0 ? Math.round((topSeller[1].vendas / totalVendido) * 100) : 0,
    sellerId: topSeller[0],
  } : null;

  // 4. Regional (sample top 5 states)
  onProgress?.('Mapeando disponibilidade regional...');
  let regional: RadarRegionalData[] = [];
  try {
    const topStates = ['BR-SP', 'BR-MG', 'BR-RJ', 'BR-PR', 'BR-RS'];
    const regionalResults = await Promise.all(
      topStates.map(async (st, i) => {
        if (i > 0) await delay(DELAY_MS);
        try { return { state: st, data: await radarBuscar(termo, 0, 10, st) }; } catch { return { state: st, data: null }; }
      })
    );

    const avgAnuncios = regionalResults.reduce((s, r) => s + (r.data?.paging?.total || 0), 0) / regionalResults.length;

    regional = regionalResults.filter(r => r.data).map(r => {
      const items = r.data!.results || [];
      const rPrices = items.map(i => i.price).filter(p => p > 0);
      const total = r.data!.paging?.total || 0;
      const rSellerMap = new Map<string, number>();
      items.forEach(i => {
        const n = i.seller?.nickname || '';
        rSellerMap.set(n, (rSellerMap.get(n) || 0) + (i.sold_quantity || 0));
      });
      const topRSeller = [...rSellerMap.entries()].sort((a, b) => b[1] - a[1])[0];

      return {
        estado: TODOS_ESTADOS.find(s => s.code === r.state)?.name || r.state,
        estadoCodigo: r.state,
        totalAnuncios: total,
        precoMedio: rPrices.length ? Math.round((rPrices.reduce((a, b) => a + b, 0) / rPrices.length) * 100) / 100 : 0,
        menorPreco: rPrices.length ? Math.min(...rPrices) : 0,
        vendedorLider: topRSeller?.[0] || '',
        tendencia: total > avgAnuncios * 1.2 ? 'alta' as const : total < avgAnuncios * 0.8 ? 'baixa' as const : 'estavel' as const,
      };
    }).sort((a, b) => b.totalAnuncios - a.totalAnuncios);
  } catch {}

  // 5. Price ranges
  const priceRanges = calcPriceRanges(allItems);

  // 6. Insights
  const insights = generateInsights(allItems, totalVendido, precoMedio, precoMinimo, precoMaximo, sellerMap, regional);

  // 7. Trends check
  let emTendencia = false;
  try {
    const trends = await radarTrends();
    if (Array.isArray(trends)) {
      emTendencia = trends.some((t: any) => {
        const keyword = t?.keyword?.toLowerCase() || '';
        return termo.toLowerCase().split(' ').some(w => keyword.includes(w));
      });
    }
  } catch {}

  onProgress?.('Análise completa!');

  const result: RadarCompleteResult = {
    kpis: { totalAnuncios: totalFromPaging, totalVendido, precoMinimo, precoMedio, precoMaximo, melhorPrecoItem, liderVendas, emTendencia },
    items: allItems,
    sellers: sellerDetails,
    regional,
    priceRanges,
    insights,
    searchTerm: termo,
    searchDate: new Date().toISOString(),
    fromCache: false,
  };

  // Save cache & historico
  try {
    await saveRadarCache(termo, estadoFiltro, result);
    await saveRadarHistorico(termo, precoMedio, totalVendido, estadoFiltro);
  } catch {}

  return result;
}

function calcPriceRanges(items: RadarMLItem[]): RadarPriceRange[] {
  const prices = items.map(i => i.price).filter(p => p > 0);
  if (!prices.length) return [];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  if (range === 0) return [{ faixa: `R$ ${min.toFixed(0)}`, min, max, quantidade: prices.length }];

  const step = Math.ceil(range / 6);
  const ranges: RadarPriceRange[] = [];
  for (let i = 0; i < 6; i++) {
    const lo = Math.floor(min) + i * step;
    const hi = lo + step;
    const count = prices.filter(p => p >= lo && p < (i === 5 ? Infinity : hi)).length;
    if (count > 0) {
      ranges.push({ faixa: `R$${lo}-${hi}`, min: lo, max: hi, quantidade: count });
    }
  }
  return ranges;
}

function generateInsights(
  items: RadarMLItem[], totalVendido: number, precoMedio: number,
  precoMin: number, precoMax: number,
  sellerMap: Map<number, { vendas: number; items: RadarMLItem[] }>,
  regional: RadarRegionalData[]
): RadarInsight[] {
  const insights: RadarInsight[] = [];

  // Demanda
  if (totalVendido > 500) {
    insights.push({ tipo: 'demanda', emoji: '🔥', titulo: 'ALTA DEMANDA', descricao: `Esta peça tem grande saída no ML com ${totalVendido} unidades vendidas. Sinal forte de mercado ativo.`, cor: 'text-green-500' });
  } else if (totalVendido >= 100) {
    insights.push({ tipo: 'demanda', emoji: '📊', titulo: 'DEMANDA MODERADA', descricao: `Mercado ativo com ${totalVendido} vendas registradas. Volume regular.`, cor: 'text-blue-500' });
  } else {
    insights.push({ tipo: 'demanda', emoji: '📉', titulo: 'BAIXA DEMANDA', descricao: `Apenas ${totalVendido} vendas registradas. Avaliar antes de investir em estoque.`, cor: 'text-yellow-500' });
  }

  // Concentração
  const sorted = [...sellerMap.entries()].sort((a, b) => b[1].vendas - a[1].vendas);
  if (sorted.length && totalVendido > 0) {
    const top1Share = (sorted[0][1].vendas / totalVendido) * 100;
    if (top1Share > 50) {
      insights.push({ tipo: 'concentracao', emoji: '⚠️', titulo: 'MERCADO CONCENTRADO', descricao: `Um vendedor domina ${top1Share.toFixed(0)}% das vendas. Concorrência baixa.`, cor: 'text-yellow-500' });
    } else {
      const top3 = sorted.slice(0, 3).reduce((s, [, v]) => s + v.vendas, 0);
      const top3Share = (top3 / totalVendido) * 100;
      if (top3Share < 60) {
        insights.push({ tipo: 'concentracao', emoji: '✅', titulo: 'MERCADO PULVERIZADO', descricao: 'Vendas distribuídas entre muitos vendedores. Boa oportunidade de entrada.', cor: 'text-green-500' });
      }
    }
  }

  // Preço
  if (precoMax > 0 && precoMin > 0) {
    const variacao = ((precoMax - precoMin) / precoMin) * 100;
    if (variacao > 50) {
      insights.push({ tipo: 'preco', emoji: '💡', titulo: 'GRANDE VARIAÇÃO DE PREÇO', descricao: `Diferença de ${variacao.toFixed(0)}% entre menor e maior preço. Oportunidade para competir.`, cor: 'text-blue-500' });
    } else if (variacao < 20) {
      insights.push({ tipo: 'preco', emoji: '📌', titulo: 'PREÇO PADRONIZADO', descricao: 'Preços muito próximos entre vendedores. Diferencie por frete ou atendimento.', cor: 'text-muted-foreground' });
    }
  }

  // Regional
  if (regional.length) {
    const top = regional[0];
    insights.push({ tipo: 'regional', emoji: '📍', titulo: `MAIOR MERCADO: ${top.estado}`, descricao: `${top.estado} concentra ${top.totalAnuncios} anúncios desta peça.`, cor: 'text-blue-500' });
  }

  // Oportunidade
  if (totalVendido > 200 && sorted.length > 0) {
    const top1Share = (sorted[0][1].vendas / totalVendido) * 100;
    if (top1Share < 40) {
      insights.push({ tipo: 'oportunidade', emoji: '🎯', titulo: 'OPORTUNIDADE IDENTIFICADA', descricao: 'Alta demanda + mercado pulverizado = bom momento para entrar.', cor: 'text-green-500' });
    }
  }

  return insights;
}

// --- Reputation helper ---
export function getReputationBadge(levelId: string | undefined | null): { label: string; emoji: string; cor: string } {
  if (!levelId) return { label: 'Sem dados', emoji: '⚪', cor: 'text-muted-foreground' };
  if (levelId.startsWith('5_') || levelId.includes('green')) return { label: 'Ótimo', emoji: '🟢', cor: 'text-green-500' };
  if (levelId.startsWith('4_') || levelId.includes('yellow')) return { label: 'Bom', emoji: '🟡', cor: 'text-yellow-500' };
  return { label: 'Regular', emoji: '🔴', cor: 'text-red-500' };
}

export function getPriceIndication(price: number, avg: number): { label: string; emoji: string; cor: string } {
  const diff = ((price - avg) / avg) * 100;
  if (diff < -10) return { label: 'MELHOR CUSTO-BENEFÍCIO', emoji: '🟢', cor: 'text-green-500' };
  if (diff <= 10) return { label: 'PREÇO MÉDIO', emoji: '🟡', cor: 'text-yellow-500' };
  return { label: 'PREÇO ALTO', emoji: '🔴', cor: 'text-red-500' };
}
