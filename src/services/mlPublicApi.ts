const ML_BASE = 'https://api.mercadolibre.com';

interface MLSearchOptions {
  limit?: number;
  offset?: number;
  state?: string;
}

interface MLSellerSummary {
  id?: number;
  nickname?: string;
  seller_reputation?: {
    level_id?: string;
    transactions?: {
      completed?: number;
    };
  };
}

const ML_STATE_LABELS: Record<string, string> = {
  'BR-SP': 'São Paulo',
  'BR-MG': 'Minas Gerais',
  'BR-RJ': 'Rio de Janeiro',
  'BR-RS': 'Rio Grande do Sul',
  'BR-PR': 'Paraná',
  'BR-SC': 'Santa Catarina',
  'BR-BA': 'Bahia',
  'BR-GO': 'Goiás',
  'BR-PE': 'Pernambuco',
  'BR-CE': 'Ceará',
  'BR-AM': 'Amazonas',
  'BR-PA': 'Pará',
  'BR-MT': 'Mato Grosso',
  'BR-MS': 'Mato Grosso do Sul',
  'BR-ES': 'Espírito Santo',
  'BR-AL': 'Alagoas',
  'BR-SE': 'Sergipe',
  'BR-PI': 'Piauí',
  'BR-MA': 'Maranhão',
  'BR-RN': 'Rio Grande do Norte',
  'BR-PB': 'Paraíba',
  'BR-TO': 'Tocantins',
  'BR-RO': 'Rondônia',
  'BR-AC': 'Acre',
  'BR-AP': 'Amapá',
  'BR-RR': 'Roraima',
  'BR-DF': 'Distrito Federal',
};

async function fetchJson<T>(url: string): Promise<T> {
  console.log('[mlDirect] Request:', url);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[mlDirect] HTTP error:', response.status, text.slice(0, 300));
    throw new Error(`ML API error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function buildSearchQuery(query: string, state?: string) {
  if (!state || state === 'BRASIL') return query;
  const stateLabel = ML_STATE_LABELS[state];
  return stateLabel ? `${query} ${stateLabel}` : query;
}

function normalizeSellerResponse(entry: any): MLSellerSummary | null {
  if (!entry) return null;
  if (entry.code === 200 && entry.body) return entry.body as MLSellerSummary;
  if (entry.id && entry.nickname) return entry as MLSellerSummary;
  return null;
}

async function fetchSellerMap(sellerIds: number[]): Promise<Map<number, MLSellerSummary>> {
  const uniqueIds = [...new Set(sellerIds)].filter(Boolean).slice(0, 20);
  const sellerMap = new Map<number, MLSellerSummary>();

  if (!uniqueIds.length) return sellerMap;

  const bulkUrl = `${ML_BASE}/users?ids=${uniqueIds.join(',')}`;
  console.log('[mlDirect] Seller IDs:', uniqueIds.join(','));

  try {
    const sellerResponse = await fetchJson<any[]>(bulkUrl);
    console.log('[mlDirect] Sellers response:', sellerResponse);

    sellerResponse.forEach((entry) => {
      const seller = normalizeSellerResponse(entry);
      if (seller?.id) sellerMap.set(seller.id, seller);
    });

    if (sellerMap.size > 0) return sellerMap;
  } catch (error) {
    console.warn('[mlDirect] Bulk seller lookup failed, falling back to single requests:', error);
  }

  await Promise.all(
    uniqueIds.slice(0, 5).map(async (sellerId) => {
      try {
        const seller = await fetchJson<MLSellerSummary>(`${ML_BASE}/users/${sellerId}`);
        console.log('[mlDirect] Seller response:', seller);
        if (seller?.id) sellerMap.set(seller.id, seller);
      } catch (error) {
        console.warn(`[mlDirect] Failed seller lookup for ${sellerId}:`, error);
      }
    })
  );

  return sellerMap;
}

export async function mlBrowserSearchFetch<T>(query: string, options: MLSearchOptions = {}): Promise<T> {
  const searchQuery = buildSearchQuery(query, options.state);
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const primaryUrl = new URL(`${ML_BASE}/sites/MLB/search`);
  primaryUrl.searchParams.set('q', searchQuery);
  primaryUrl.searchParams.set('sort', 'sold_quantity_desc');
  primaryUrl.searchParams.set('limit', String(limit));
  primaryUrl.searchParams.set('offset', String(offset));

  let data: any;

  try {
    data = await fetchJson<any>(primaryUrl.toString());
  } catch (error) {
    console.warn('[mlDirect] Sorted search failed, retrying without sort:', error);
    const fallbackUrl = new URL(`${ML_BASE}/sites/MLB/search`);
    fallbackUrl.searchParams.set('q', searchQuery);
    fallbackUrl.searchParams.set('limit', String(limit));
    fallbackUrl.searchParams.set('offset', String(offset));
    data = await fetchJson<any>(fallbackUrl.toString());
  }

  console.log('[mlDirect] Search response count:', data?.results?.length ?? 0);

  const results = Array.isArray(data?.results) ? data.results : [];
  const sellerIds = results.map((item: any) => item?.seller?.id).filter((id: unknown): id is number => typeof id === 'number');
  const sellerMap = await fetchSellerMap(sellerIds);

  const enriched = results.map((item: any) => {
    const sellerId = item?.seller?.id;
    const seller = sellerId ? sellerMap.get(sellerId) : null;

    return {
      ...item,
      sold_quantity: item?.sold_quantity ?? 0,
      seller: {
        id: sellerId || 0,
        nickname: seller?.nickname || item?.seller?.nickname || 'N/A',
        reputation: seller?.seller_reputation?.level_id || '',
        completed_transactions: seller?.seller_reputation?.transactions?.completed || 0,
      },
      address: {
        state_id: item?.seller_address?.state?.id || item?.address?.state_id || '',
        state_name: item?.seller_address?.state?.name || item?.address?.state_name || '',
        city_name: item?.seller_address?.city?.name || item?.address?.city_name || '',
      },
      shipping: {
        free_shipping: item?.shipping?.free_shipping ?? false,
        tags: item?.shipping?.tags || [],
      },
    };
  });

  console.log('[mlDirect] Enriched sample:', enriched[0]);

  return {
    results: enriched,
    paging: data?.paging || { total: enriched.length, offset, limit },
  } as T;
}

export async function mlBrowserFetch<T>(url: string): Promise<T> {
  return fetchJson<T>(url);
}

export { ML_BASE };
