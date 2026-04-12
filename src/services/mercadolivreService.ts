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

// --- Direct fetch to ML public API (browser-side) ---

async function mlProxyFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[mlProxyFetch] ML API error:', res.status, body.substring(0, 200));
    throw new Error(`Mercado Livre API error ${res.status}`);
  }
  return (await res.json()) as T;
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

// --- FUNÇÃO 4: buscarDadosVendedor ---
export async function buscarDadosVendedor(userId: number | string): Promise<MLSellerDetail> {
  const url = `${ML_BASE}/users/${userId}`;
  return mlProxyFetch<MLSellerDetail>(url);
}

export function classificarReputacao(levelId: string): { label: string; cor: string } {
  if (!levelId) return { label: 'Sem dados', cor: 'gray' };
  if (levelId.startsWith('5_') || levelId.includes('green')) return { label: 'Ótimo', cor: 'green' };
  if (levelId.startsWith('4_') || levelId.includes('yellow')) return { label: 'Bom', cor: 'yellow' };
  return { label: 'Ruim', cor: 'red' };
}

// --- FUNÇÃO 5: calcularMetricasML ---
export function calcularMetricasML(
  results: MLResultItem[],
  stateCode?: string
): MLMetricas {
  if (!results.length) {
    return {
      precoMedio: 0,
      menorPreco: 0,
      totalVendido: 0,
      fornecedorLider: '',
      fornecedorIdLider: 0,
      fornecedorLiderVendas: 0,
      linkMaisVendido: '',
      thumbnailMaisVendido: '',
      mlItemId: '',
      disponibilidadeRegional: false,
      resultados: [],
    };
  }

  const prices = results.map((r) => r.price);
  const precoMedio = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
  const menorPreco = Math.min(...prices);
  const totalVendido = results.reduce((s, r) => s + (r.sold_quantity || 0), 0);

  // Seller ranking
  const sellerMap = new Map<string, { id: number; vendas: number }>();
  for (const r of results) {
    const nick = r.seller?.nickname || 'Desconhecido';
    const prev = sellerMap.get(nick);
    sellerMap.set(nick, {
      id: r.seller?.id || 0,
      vendas: (prev?.vendas || 0) + (r.sold_quantity || 0),
    });
  }
  const sorted = [...sellerMap.entries()].sort((a, b) => b[1].vendas - a[1].vendas);
  const lider = sorted[0];

  // Regional availability
  const disponibilidadeRegional = stateCode
    ? results.some((r) => r.address?.state_name?.toLowerCase().includes(
        ML_STATES.find((s) => s.code === stateCode)?.name.toLowerCase() || ''
      ))
    : results.length > 0;

  const topResult = results[0];

  return {
    precoMedio,
    menorPreco,
    totalVendido,
    fornecedorLider: lider?.[0] || '',
    fornecedorIdLider: lider?.[1].id || 0,
    fornecedorLiderVendas: lider?.[1].vendas || 0,
    linkMaisVendido: topResult?.permalink || '',
    thumbnailMaisVendido: topResult?.thumbnail || '',
    mlItemId: topResult?.id || '',
    disponibilidadeRegional,
    resultados: results,
  };
}

// --- FUNÇÃO 6: rankingFornecedoresPorPeca ---
export function rankingFornecedoresPorPeca(results: MLResultItem[]): FornecedorRanking[] {
  if (!results.length) return [];

  const sellerMap = new Map<string, { id: number; vendas: number; estado: string }>();
  for (const r of results) {
    const nick = r.seller?.nickname || 'Desconhecido';
    const prev = sellerMap.get(nick);
    sellerMap.set(nick, {
      id: r.seller?.id || 0,
      vendas: (prev?.vendas || 0) + (r.sold_quantity || 0),
      estado: r.address?.state_name || prev?.estado || '',
    });
  }

  const totalGeral = [...sellerMap.values()].reduce((s, v) => s + v.vendas, 0);

  return [...sellerMap.entries()]
    .sort((a, b) => b[1].vendas - a[1].vendas)
    .map(([fornecedor, data]) => ({
      fornecedor,
      sellerId: data.id,
      totalVendido: data.vendas,
      participacao: totalGeral > 0 ? Math.round((data.vendas / totalGeral) * 100) : 0,
      estado: data.estado,
    }));
}

// --- Helper indicador ---
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

// --- Sinal ML (Etapa 5) ---
export type SinalML = 'comprar' | 'monitorar' | 'longo_prazo' | 'sem_dados';

export interface SinalMLResult {
  sinal: SinalML;
  label: string;
  emoji: string;
  color: string;
  motivo: string;
}

export function calcularSinalML(
  item: MLResultItem,
  mediaVendidos: number,
  disponibilidadeRegional: boolean
): SinalMLResult {
  const vendidos = item.sold_quantity || 0;

  if (vendidos === 0) {
    return {
      sinal: 'sem_dados',
      label: 'SEM DADOS',
      emoji: '⚪',
      color: 'text-muted-foreground',
      motivo: 'Sem dados de venda',
    };
  }

  const altaDemanda = vendidos > mediaVendidos;
  const disponivel = disponibilidadeRegional;
  const estoqueOk = (item.available_quantity ?? 10) >= 5;

  // 🟢 COMPRAR AGORA
  if (altaDemanda && disponivel && estoqueOk) {
    return {
      sinal: 'comprar',
      label: 'COMPRAR AGORA',
      emoji: '🟢',
      color: 'text-green-600',
      motivo: `Alta demanda (${vendidos} vendidos), disponível na região`,
    };
  }

  // 🔴 LONGO PRAZO
  if (!altaDemanda && !disponivel) {
    return {
      sinal: 'longo_prazo',
      label: 'LONGO PRAZO',
      emoji: '🔴',
      color: 'text-red-500',
      motivo: `Baixa demanda (${vendidos} vendidos), indisponível na região`,
    };
  }

  // 🟡 MONITORAR (default)
  return {
    sinal: 'monitorar',
    label: 'MONITORAR',
    emoji: '🟡',
    color: 'text-yellow-500',
    motivo: altaDemanda
      ? `Alta demanda mas ${disponivel ? 'estoque baixo' : 'fora da região'}`
      : `Demanda moderada (${vendidos} vendidos)`,
  };
}

export function calcularSinaisML(
  resultados: MLResultItem[],
  disponibilidadeRegional: boolean
): Map<string, SinalMLResult> {
  if (!resultados.length) return new Map();

  const totalVendidos = resultados.reduce((s, r) => s + (r.sold_quantity || 0), 0);
  const media = totalVendidos / resultados.length;

  const map = new Map<string, SinalMLResult>();
  for (const item of resultados) {
    map.set(item.id, calcularSinalML(item, media, disponibilidadeRegional));
  }
  return map;
}
