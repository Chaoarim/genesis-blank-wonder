import { supabase } from '@/integrations/supabase/client';
import type { MLResultItem } from './mercadolivreService';

const CACHE_TTL_HOURS = 24;

export interface MLCacheEntry {
  results: MLResultItem[];
  cachedAt: string;
}

/**
 * Check ml_cache for valid (non-expired) results for a query+region combo.
 * Returns cached items or null if cache miss/expired.
 */
export async function getCachedMLResults(
  query: string,
  regiao: string = ''
): Promise<MLCacheEntry | null> {
  const normalizedQuery = query.trim().toLowerCase();

  const { data, error } = await supabase
    .from('ml_cache')
    .select('*')
    .eq('peca_nome', normalizedQuery)
    .eq('regiao', regiao)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data?.length) return null;

  const hasRealSoldQuantity = data.some((row) => Number(row.total_vendido || 0) > 0);
  const hasRealSellerName = data.some((row) => row.fornecedor_nome && row.fornecedor_nome !== 'N/A' && row.fornecedor_nome !== 'Vendedor ML');

  if (!hasRealSoldQuantity || !hasRealSellerName) {
    console.warn('[mlCache] Ignorando cache antigo/incompleto:', {
      query: normalizedQuery,
      regiao,
      hasRealSoldQuantity,
      hasRealSellerName,
    });
    return null;
  }

  // Reconstruct MLResultItem[] from cache rows
  const results: MLResultItem[] = data.map((row) => ({
    id: row.ml_item_id,
    title: row.titulo_ml,
    price: Number(row.preco_atual),
    sold_quantity: row.total_vendido,
    thumbnail: row.thumbnail,
    permalink: row.link_anuncio,
    seller: {
      id: Number(row.fornecedor_id) || 0,
      nickname: row.fornecedor_nome,
    },
    address: {
      state_name: row.estado_vendedor,
    },
    condition: 'new',
    available_quantity: undefined,
    shipping: { free_shipping: false },
  }));

  return {
    results,
    cachedAt: data[0].created_at,
  };
}

/**
 * Save ML search results to cache with 24h TTL.
 */
export async function saveMLResultsToCache(
  query: string,
  results: MLResultItem[],
  regiao: string = ''
): Promise<void> {
  const normalizedQuery = query.trim().toLowerCase();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Delete old cache for this query+region
  await supabase
    .from('ml_cache')
    .delete()
    .eq('peca_nome', normalizedQuery)
    .eq('regiao', regiao);

  if (!results.length) return;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

  const rows = results.map((r) => ({
    user_id: user.id,
    peca_nome: normalizedQuery,
    peca_codigo: '',
    regiao,
    ml_item_id: r.id,
    titulo_ml: r.title,
    preco_atual: r.price,
    preco_medio: 0,
    menor_preco: 0,
    total_vendido: r.sold_quantity || 0,
    fornecedor_nome: r.seller?.nickname || '',
    fornecedor_id: String(r.seller?.id || ''),
    fornecedor_reputacao: '',
    fornecedor_total_vendas: 0,
    estado_vendedor: r.address?.state_name || '',
    thumbnail: r.thumbnail || '',
    link_anuncio: r.permalink || '',
    disponivel_regiao: true,
    expires_at: expiresAt.toISOString(),
  }));

  // Insert in batches of 25
  for (let i = 0; i < rows.length; i += 25) {
    await supabase.from('ml_cache').insert(rows.slice(i, i + 25));
  }
}
