const ML_BASE = "https://api.mercadolibre.com";
const CATEGORY_AUTOPARTS = "MLB1743";

const ML_STATES = [
  { code: "BR-SP", name: "São Paulo" },
  { code: "BR-MG", name: "Minas Gerais" },
  { code: "BR-RJ", name: "Rio de Janeiro" },
  { code: "BR-RS", name: "Rio Grande do Sul" },
  { code: "BR-PR", name: "Paraná" },
  { code: "BR-SC", name: "Santa Catarina" },
  { code: "BR-BA", name: "Bahia" },
  { code: "BR-GO", name: "Goiás" },
  { code: "BR-PE", name: "Pernambuco" },
  { code: "BR-CE", name: "Ceará" },
] as const;

export { ML_STATES };

export interface MLSearchResult {
  id: string;
  title: string;
  price: number;
  sold_quantity: number;
  thumbnail: string;
  permalink: string;
  condition: string;
  available_quantity: number;
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
}

export interface MLSearchResponse {
  results: MLSearchResult[];
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

export interface MLMarketSummary {
  precoMedio: number;
  menorPreco: number;
  totalVendido: number;
  fornecedorLider: string;
  fornecedorLiderVendas: number;
  reputacaoLider: string;
  linkMaisVendido: string;
  thumbnailMaisVendido: string;
  mlItemId: string;
  resultados: MLSearchResult[];
  disponibilidadeRegional: boolean;
}

// Direct client-side fetch to ML public API (no proxy needed)
async function mlFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.warn(`[ML API] ${res.status} for ${url}:`, body);
    throw new Error(`Mercado Livre API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function searchML(
  query: string,
  options?: { limit?: number; offset?: number; sort?: string }
): Promise<MLSearchResponse> {
  const q = encodeURIComponent(query);
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  const sort = options?.sort || "sold_quantity_desc";
  const url = `${ML_BASE}/sites/MLB/search?q=${q}&category=${CATEGORY_AUTOPARTS}&sort=${sort}&limit=${limit}&offset=${offset}`;
  return mlFetch<MLSearchResponse>(url);
}

export async function searchMLRegional(
  query: string,
  stateCode: string,
  options?: { limit?: number; offset?: number }
): Promise<MLSearchResponse> {
  const q = encodeURIComponent(query);
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  const url = `${ML_BASE}/sites/MLB/search?q=${q}&category=${CATEGORY_AUTOPARTS}&state=${stateCode}&sort=sold_quantity_desc&limit=${limit}&offset=${offset}`;
  return mlFetch<MLSearchResponse>(url);
}

export async function getMLItem(itemId: string): Promise<MLItemDetail> {
  return mlFetch<MLItemDetail>(`${ML_BASE}/items/${itemId}`);
}

export async function getMLSeller(sellerId: string): Promise<MLSellerDetail> {
  return mlFetch<MLSellerDetail>(`${ML_BASE}/users/${sellerId}`);
}

export function summarizeMLResults(results: MLSearchResult[]): MLMarketSummary {
  if (!results.length) {
    return {
      precoMedio: 0,
      menorPreco: 0,
      totalVendido: 0,
      fornecedorLider: "",
      fornecedorLiderVendas: 0,
      reputacaoLider: "",
      linkMaisVendido: "",
      thumbnailMaisVendido: "",
      mlItemId: "",
      resultados: [],
      disponibilidadeRegional: false,
    };
  }

  const prices = results.map((r) => r.price);
  const precoMedio = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
  const menorPreco = Math.min(...prices);
  const totalVendido = results.reduce((s, r) => s + (r.sold_quantity || 0), 0);

  // Seller rankings
  const sellerMap = new Map<string, number>();
  for (const r of results) {
    const nick = r.seller?.nickname || "Desconhecido";
    sellerMap.set(nick, (sellerMap.get(nick) || 0) + (r.sold_quantity || 0));
  }
  const sorted = [...sellerMap.entries()].sort((a, b) => b[1] - a[1]);
  const fornecedorLider = sorted[0]?.[0] || "";
  const fornecedorLiderVendas = sorted[0]?.[1] || 0;

  const topResult = results[0];

  return {
    precoMedio,
    menorPreco,
    totalVendido,
    fornecedorLider,
    fornecedorLiderVendas,
    reputacaoLider: "",
    linkMaisVendido: topResult?.permalink || "",
    thumbnailMaisVendido: topResult?.thumbnail || "",
    mlItemId: topResult?.id || "",
    resultados: results,
    disponibilidadeRegional: results.length > 0,
  };
}

export function getReputationColor(level: string): "green" | "yellow" | "red" | "gray" {
  if (!level) return "gray";
  if (level.includes("green") || level === "5_green" || level === "platinum") return "green";
  if (level.includes("yellow") || level === "4_light_green") return "yellow";
  return "red";
}

export function getIndicadorCompra(
  disponivel: boolean,
  totalVendido: number,
  availableQty?: number
): { label: string; color: string; emoji: string } {
  if (!disponivel || totalVendido === 0) {
    return { label: "LONGO PRAZO", color: "text-red-500", emoji: "🔴" };
  }
  if (availableQty !== undefined && availableQty < 5) {
    return { label: "ATENÇÃO", color: "text-yellow-500", emoji: "🟡" };
  }
  return { label: "COMPRAR AGORA", color: "text-green-500", emoji: "🟢" };
}
