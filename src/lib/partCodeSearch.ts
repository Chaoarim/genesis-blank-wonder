export function normalizePartCode(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function isLikelyPartCodeQuery(value: string): boolean {
  const normalized = normalizePartCode(value);
  return normalized.length >= 4 && /[a-z]/.test(normalized) && /\d/.test(normalized);
}

export function prioritizeCodeMatches<T extends { id?: string; codigo?: string | null }>(
  items: T[],
  query: string,
  fallback: T[],
): T[] {
  if (!isLikelyPartCodeQuery(query)) return fallback;

  const normalizedQuery = normalizePartCode(query);
  const directMatches = items
    .map((item) => {
      const normalizedCode = normalizePartCode(item.codigo || '');
      let score = 0;

      if (normalizedCode === normalizedQuery) score = 400;
      else if (normalizedCode.startsWith(normalizedQuery)) score = 300;
      else if (normalizedCode.includes(normalizedQuery)) score = 200;
      else if (normalizedQuery.startsWith(normalizedCode) && normalizedCode.length >= 4) score = 100;

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);

  if (directMatches.length === 0) return fallback;

  const seen = new Set(directMatches.map((item) => item.id || item.codigo || ''));
  return [...directMatches, ...fallback.filter((item) => !seen.has(item.id || item.codigo || ''))];
}