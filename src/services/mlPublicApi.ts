import { supabase } from '@/integrations/supabase/client';

const ML_BASE = 'https://api.mercadolibre.com';

interface MLSearchOptions {
  limit?: number;
  offset?: number;
  state?: string;
}

// All ML data requests go through the ml-proxy Edge Function (which uses SerpAPI for search)
async function invokeProxy<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ml-proxy', { body });

  if (error) {
    console.error('[mlProxy] Edge function error:', error);
    throw new Error('Erro ao conectar com o servidor de busca');
  }

  if (!data?.ok) {
    const msg = data?.error || 'Erro desconhecido';
    console.error('[mlProxy] Proxy error:', msg);
    throw new Error(msg);
  }

  return data.data as T;
}

export async function mlBrowserSearchFetch<T>(query: string, options: MLSearchOptions = {}): Promise<T> {
  return invokeProxy<T>({
    action: 'search',
    query,
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
    state: options.state,
  });
}

export async function mlBrowserFetch<T>(url: string): Promise<T> {
  // Determine action from URL pattern
  if (url.includes('/items?ids=')) {
    const idsMatch = url.match(/ids=([^&]+)/);
    const ids = idsMatch ? idsMatch[1].split(',') : [];
    return invokeProxy<T>({ action: 'item', item_ids: ids });
  }

  if (url.includes('/items/')) {
    const itemId = url.split('/items/')[1]?.split('?')[0];
    return invokeProxy<T>({ action: 'item', item_id: itemId });
  }

  if (url.includes('/users/')) {
    const sellerId = url.split('/users/')[1]?.split('?')[0];
    return invokeProxy<T>({ action: 'seller', seller_id: sellerId });
  }

  if (url.includes('/trends/')) {
    return invokeProxy<T>({ action: 'trends' });
  }

  throw new Error(`URL não suportada: ${url}`);
}

export { ML_BASE };