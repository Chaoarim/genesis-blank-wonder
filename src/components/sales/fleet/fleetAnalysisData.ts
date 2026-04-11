import { supabase } from '@/integrations/supabase/client';
import { fetchAllInventory } from '@/lib/fetchAllInventory';

export interface FleetAnalysisItem {
  id: string;
  codigo: string;
  produto: string;
  aplicacao: string;
  fornecedor: string;
  searchText: string;
  source: 'inventory' | 'supplier_catalog';
}

interface FleetAnalysisSourceResult {
  items: FleetAnalysisItem[];
  ownerId: string | null;
  sourceLabel: string;
}

export function normalizeFleetText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getFleetModelKeywords(model: string) {
  const normalized = normalizeFleetText(model);

  return {
    normalized,
    keywords: normalized.split(' ').filter(Boolean).filter(word => word.length > 2),
  };
}

export function itemMatchesFleetModel(itemText: string, normalizedModel: string, keywords: string[]) {
  if (!itemText) return false;
  if (normalizedModel && itemText.includes(normalizedModel)) return true;
  if (!keywords.length) return false;

  const matchedKeywordCount = keywords.filter(keyword => itemText.includes(keyword)).length;
  if (keywords.length <= 2) return matchedKeywordCount >= 1;

  return matchedKeywordCount >= 2;
}

function buildSearchText(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function getItemUniqueKey(item: FleetAnalysisItem) {
  return [item.fornecedor, item.codigo, item.produto, item.aplicacao]
    .map(value => normalizeFleetText(value))
    .join('|');
}

async function resolveFleetAnalysisOwnerId(preferredOwnerId?: string | null) {
  if (preferredOwnerId) return preferredOwnerId;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function fetchSupplierCatalogItems(ownerId: string): Promise<FleetAnalysisItem[]> {
  const pageSize = 1000;
  const items: FleetAnalysisItem[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('supplier_catalog_items')
      .select('id, codigo, produto, aplicacao, fornecedor')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      continue;
    }

    items.push(
      ...data.map(row => {
        const codigo = (row.codigo || '').trim();
        const produto = (row.produto || '').trim();
        const aplicacao = (row.aplicacao || '').trim();
        const fornecedor = (row.fornecedor || '').trim();

        return {
          id: row.id,
          codigo,
          produto,
          aplicacao,
          fornecedor,
          searchText: buildSearchText([codigo, produto, aplicacao, fornecedor]),
          source: 'supplier_catalog' as const,
        };
      }),
    );

    if (data.length < pageSize) hasMore = false;
    else page += 1;
  }

  return items;
}

export async function loadFleetAnalysisItems(preferredOwnerId?: string | null): Promise<FleetAnalysisSourceResult> {
  const ownerId = await resolveFleetAnalysisOwnerId(preferredOwnerId);

  if (!ownerId) {
    return {
      items: [],
      ownerId: null,
      sourceLabel: 'Faça login para analisar sua lista de peças',
    };
  }

  const [inventoryItems, supplierItems] = await Promise.all([
    fetchAllInventory(ownerId),
    fetchSupplierCatalogItems(ownerId),
  ]);

  const mergedItems = new Map<string, FleetAnalysisItem>();

  inventoryItems.forEach(item => {
    const mappedItem: FleetAnalysisItem = {
      id: item.id,
      codigo: (item.codigo || '').trim(),
      produto: (item.produto || '').trim(),
      aplicacao: (item.aplicacao || '').trim(),
      fornecedor: (item.fornecedor || '').trim(),
      searchText: buildSearchText([item.codigo, item.produto, item.aplicacao, item.fornecedor]),
      source: 'inventory',
    };

    mergedItems.set(getItemUniqueKey(mappedItem), mappedItem);
  });

  supplierItems.forEach(item => {
    mergedItems.set(getItemUniqueKey(item), item);
  });

  const sourceLabel =
    inventoryItems.length > 0 && supplierItems.length > 0
      ? 'Estoque + lista de fornecedores'
      : supplierItems.length > 0
        ? 'Lista de fornecedores'
        : inventoryItems.length > 0
          ? 'Estoque / lista de peças'
          : 'Nenhuma lista de peças encontrada';

  return {
    items: [...mergedItems.values()],
    ownerId,
    sourceLabel,
  };
}