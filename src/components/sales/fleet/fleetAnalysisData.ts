import { supabase } from '@/integrations/supabase/client';

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

async function fetchInventoryAnalysisItems(ownerId: string): Promise<FleetAnalysisItem[]> {
  const pageSize = 1000;
  const items: FleetAnalysisItem[] = [];
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, codigo, produto, aplicacao, fornecedor')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) { hasMore = false; continue; }
    items.push(...data.map(row => ({
      id: row.id,
      codigo: (row.codigo || '').trim(),
      produto: (row.produto || '').trim(),
      aplicacao: (row.aplicacao || '').trim(),
      fornecedor: (row.fornecedor || '').trim(),
      searchText: buildSearchText([(row.codigo || '').trim(), (row.produto || '').trim(), (row.aplicacao || '').trim(), (row.fornecedor || '').trim()]),
      source: 'inventory' as const,
    })));
    if (data.length < pageSize) hasMore = false;
    else page += 1;
  }
  return items;
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

// ── Module-level cache to avoid redundant fetches across components ──
let _cachedResult: FleetAnalysisSourceResult | null = null;
let _cacheKey: string | null = null;
let _cachePromise: Promise<FleetAnalysisSourceResult> | null = null;

export function invalidateFleetAnalysisCache() {
  _cachedResult = null;
  _cacheKey = null;
  _cachePromise = null;
}

export async function loadFleetAnalysisItems(preferredOwnerId?: string | null): Promise<FleetAnalysisSourceResult> {
  const key = preferredOwnerId ?? '__auto__';
  if (_cachedResult && _cacheKey === key) return _cachedResult;
  if (_cachePromise && _cacheKey === key) return _cachePromise;

  _cacheKey = key;
  _cachePromise = _loadFleetAnalysisItemsInternal(preferredOwnerId).then(result => {
    _cachedResult = result;
    _cachePromise = null;
    return result;
  }).catch(err => {
    _cachePromise = null;
    _cacheKey = null;
    throw err;
  });
  return _cachePromise;
}

async function _loadFleetAnalysisItemsInternal(preferredOwnerId?: string | null): Promise<FleetAnalysisSourceResult> {
  const ownerId = await resolveFleetAnalysisOwnerId(preferredOwnerId);

  if (!ownerId) {
    return {
      items: [],
      ownerId: null,
      sourceLabel: 'Faça login para analisar sua lista de peças',
    };
  }

  const [inventoryItems, supplierItems] = await Promise.all([
    fetchInventoryAnalysisItems(ownerId),
    fetchSupplierCatalogItems(ownerId),
  ]);

  const mergedItems = new Map<string, FleetAnalysisItem>();

  inventoryItems.forEach(item => {
    mergedItems.set(getItemUniqueKey(item), item);
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