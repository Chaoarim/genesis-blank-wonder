import { supabase } from '@/integrations/supabase/client';

const ML_BASE = 'https://api.mercadolibre.com';
const CATEGORY = 'MLB1743';
const LIMIT = 50;

// All ML states for regional analysis
export const ML_STATES = [
  { code: 'BR-SP', name: 'São Paulo' },
  { code: 'BR-MG', name: 'Minas Gerais' },
  { code: 'BR-RJ', name: 'Rio de Janeiro' },
  { code: 'BR-RS', name: 'Rio Grande do Sul' },
  { code: 'BR-PR', name: 'Paraná' },
  { code: 'BR-SC', name: 'Santa Catarina' },
  { code: 'BR-BA', name: 'Bahia' },
  { code: 'BR-GO', name: 'Goiás' },
  { code: 'BR-PE', name: 'Pernambuco' },
  { code: 'BR-CE', name: 'Ceará' },
  { code: 'BR-AM', name: 'Amazonas' },
  { code: 'BR-PA', name: 'Pará' },
  { code: 'BR-MT', name: 'Mato Grosso' },
  { code: 'BR-MS', name: 'Mato Grosso do Sul' },
  { code: 'BR-ES', name: 'Espírito Santo' },
  { code: 'BR-AL', name: 'Alagoas' },
  { code: 'BR-SE', name: 'Sergipe' },
  { code: 'BR-PI', name: 'Piauí' },
  { code: 'BR-MA', name: 'Maranhão' },
  { code: 'BR-RN', name: 'Rio Grande do Norte' },
  { code: 'BR-PB', name: 'Paraíba' },
  { code: 'BR-TO', name: 'Tocantins' },
  { code: 'BR-RO', name: 'Rondônia' },
  { code: 'BR-AC', name: 'Acre' },
  { code: 'BR-AP', name: 'Amapá' },
  { code: 'BR-RR', name: 'Roraima' },
  { code: 'BR-DF', name: 'Distrito Federal' },
] as const;

// --- Types ---

export interface MLResultItem {
  id: string;
  title: string;
  price: number;
  sold_quantity: number;
  thumbnail: string;
  permalink: string;
  seller: {
    id: number;
    nickname: string;
  };
  shipping?: {
    free_shipping?: boolean;
  };
  address?: {
    state_name?: string;
  };
  condition?: string;
  available_quantity?: number;
}

export interface MLSearchResponse {
  results: MLResultItem[];
  paging: { total: number; offset: number; limit: number };
}

export interface MLItemDetail {
  id: string;
  title: string;
  price: number;
  sold_quantity: number;
  available_quantity: number;
  condition: string;
  thumbnail: string;
  permalink: string;
  attributes: Array<{ id: string; name: string; value_name: string | null }>;
  shipping: { free_shipping: boolean };
  seller_address: { state: { name: string } };
}

export interface MLSellerDetail {
  id: number;
  nickname: string;
  seller_reputation: {
    level_id: string;
    transactions: { completed: number };
  };
  address: { state: string };
}

export interface MLMetricas {
  precoMedio: number;
  menorPreco: number;
  totalVendido: number;
  fornecedorLider: string;
  fornecedorIdLider: number;
  fornecedorLiderVendas: number;
  linkMaisVendido: string;
  thumbnailMaisVendido: string;
  mlItemId: string;
  disponibilidadeRegional: boolean;
  resultados: MLResultItem[];
}

export interface FornecedorRanking {
  fornecedor: string;
  sellerId: number;
  totalVendido: number;
  participacao: number;
  estado: string;
}

// --- Proxy helper ---

async function mlProxyFetch<T>(url: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ml-proxy', {
    body: { url },
  });

  if (error) {
    console.error('[mlProxyFetch] invoke error:', error);
    throw new Error(error.message || 'Erro ao chamar proxy ML');
  }

  if (!data?.ok) {
    const msg = data?.error || 'Erro desconhecido do proxy ML';
    console.error('[mlProxyFetch] proxy error:', msg, data?.details);
    throw new Error(msg);
  }

  return data.data as T;
}

// --- FUNÇÃO 1: buscarPecaML ---
export async function buscarPecaML(
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<MLSearchResponse> {
  const q = encodeURIComponent(query);
  const limit = options?.limit || LIMIT;
  const offset = options?.offset || 0;
  const url = `${ML_BASE}/sites/MLB/search?q=${q}&category=${CATEGORY}&sort=sold_quantity_desc&limit=${limit}&offset=${offset}`;
  return mlProxyFetch<MLSearchResponse>(url);
}

// --- FUNÇÃO 2: buscarPecaPorRegiao ---
export async function buscarPecaPorRegiao(
  query: string,
  stateCode: string,
  options?: { limit?: number; offset?: number }
): Promise<MLSearchResponse> {
  const q = encodeURIComponent(query);
  const limit = options?.limit || LIMIT;
  const offset = options?.offset || 0;
  const url = `${ML_BASE}/sites/MLB/search?q=${q}&category=${CATEGORY}&sort=sold_quantity_desc&state=${stateCode}&limit=${limit}&offset=${offset}`;
  return mlProxyFetch<MLSearchResponse>(url);
}

// --- FUNÇÃO 3: buscarDetalheItem ---
export async function buscarDetalheItem(itemId: string): Promise<MLItemDetail> {
  const url = `${ML_BASE}/items/${itemId}`;
  return mlProxyFetch<MLItemDetail>(url);
}

// --- Helpers de análise ---

export function calcularResumo(results: MLResultItem[]) {
  if (!results.length) {
    return {
      precoMedio: 0,
      menorPreco: 0,
      totalVendido: 0,
      fornecedorLider: '',
      fornecedorLiderVendas: 0,
      linkMaisVendido: '',
      thumbnailMaisVendido: '',
      mlItemId: '',
      resultados: [] as MLResultItem[],
    };
  }

  const prices = results.map((r) => r.price);
  const precoMedio = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
  const menorPreco = Math.min(...prices);
  const totalVendido = results.reduce((s, r) => s + (r.sold_quantity || 0), 0);

  const sellerMap = new Map<string, number>();
  for (const r of results) {
    const nick = r.seller?.nickname || 'Desconhecido';
    sellerMap.set(nick, (sellerMap.get(nick) || 0) + (r.sold_quantity || 0));
  }
  const sorted = [...sellerMap.entries()].sort((a, b) => b[1] - a[1]);

  const topResult = results[0];

  return {
    precoMedio,
    menorPreco,
    totalVendido,
    fornecedorLider: sorted[0]?.[0] || '',
    fornecedorLiderVendas: sorted[0]?.[1] || 0,
    linkMaisVendido: topResult?.permalink || '',
    thumbnailMaisVendido: topResult?.thumbnail || '',
    mlItemId: topResult?.id || '',
    resultados: results,
  };
}

export function getIndicadorCompra(
  totalVendido: number,
  availableQty?: number
): { label: string; color: string; emoji: string } {
  if (totalVendido === 0) {
    return { label: 'SEM DADOS', color: 'text-muted-foreground', emoji: '⚪' };
  }
  if (availableQty !== undefined && availableQty < 5) {
    return { label: 'ATENÇÃO', color: 'text-yellow-500', emoji: '🟡' };
  }
  if (totalVendido > 100) {
    return { label: 'ALTA DEMANDA', color: 'text-green-600', emoji: '🟢' };
  }
  return { label: 'DEMANDA MODERADA', color: 'text-blue-500', emoji: '🔵' };
}
