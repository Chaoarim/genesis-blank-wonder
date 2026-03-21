import { supabase } from '@/integrations/supabase/client';

export interface InventoryRow {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  qtd_estoque: number;
  preco: number;
  image_url?: string;
  visible_catalog?: boolean;
  vendidos_display?: number;
}

/**
 * Fetch ALL inventory items for a user, bypassing the Supabase 1000-row limit
 * by paginating through results.
 */
export async function fetchAllInventory(
  userId: string,
  orderBy: string = 'created_at',
  ascending: boolean = false
): Promise<InventoryRow[]> {
  const pageSize = 1000;
  const allItems: InventoryRow[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', userId)
      .order(orderBy, { ascending })
      .range(from, to);

    if (error) {
      console.error('Error fetching inventory page:', page, error);
      break;
    }

    if (data && data.length > 0) {
      for (const r of data) {
        allItems.push({
          id: r.id,
          codigo: r.codigo,
          produto: r.produto,
          fornecedor: r.fornecedor || '',
          aplicacao: r.aplicacao || '',
          qtd_estoque: Number(r.qtd_estoque) || 0,
          preco: Number(r.preco) || 0,
          image_url: r.image_url || '',
          visible_catalog: r.visible_catalog ?? false,
          vendidos_display: Number(r.vendidos_display) || 0,
        });
      }
      if (data.length < pageSize) hasMore = false;
      else page++;
    } else {
      hasMore = false;
    }
  }

  return allItems;
}
