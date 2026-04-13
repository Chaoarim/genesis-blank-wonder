const ML_BASE = 'https://api.mercadolibre.com';
const SEARCH_SORT = 'sold_quantity_desc';
const DEFAULT_LIMIT = 50;

interface MLSearchOptions {
  limit?: number;
  offset?: number;
  state?: string;
  withSort?: boolean;
}

class MercadoLivreApiError extends Error {
  status: number;
  details: unknown;
  url: string;

  constructor(status: number, message: string, url: string, details: unknown) {
    super(message);
    this.name = 'MercadoLivreApiError';
    this.status = status;
    this.details = details;
    this.url = url;
  }
}

function buildSearchUrl(query: string, options: MLSearchOptions = {}) {
  const params = new URLSearchParams({
    q: query,
    limit: String(options.limit ?? DEFAULT_LIMIT),
  });

  if ((options.offset ?? 0) > 0) {
    params.set('offset', String(options.offset));
  }

  if (options.state) {
    params.set('state', options.state);
  }

  if (options.withSort !== false) {
    params.set('sort', SEARCH_SORT);
  }

  return `${ML_BASE}/sites/MLB/search?${params.toString()}`;
}

async function readJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractErrorMessage(status: number, data: unknown) {
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    const message = [payload.message, payload.error]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' - ');

    if (message) {
      return message;
    }
  }

  return `ML API retornou status ${status}`;
}

export async function mlBrowserFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const data = await readJsonSafe(response);

  if (!response.ok) {
    throw new MercadoLivreApiError(
      response.status,
      extractErrorMessage(response.status, data),
      url,
      data
    );
  }

  return data as T;
}

export async function mlBrowserSearchFetch<T>(query: string, options: Omit<MLSearchOptions, 'withSort'> = {}): Promise<T> {
  const primaryUrl = buildSearchUrl(query, { ...options, withSort: true });

  try {
    return await mlBrowserFetch<T>(primaryUrl);
  } catch (error) {
    if (error instanceof MercadoLivreApiError && error.status === 403) {
      const fallbackUrl = buildSearchUrl(query, { ...options, withSort: false });
      console.warn('[ML API] 403 na busca principal, tentando URL alternativa:', fallbackUrl);
      return mlBrowserFetch<T>(fallbackUrl);
    }

    throw error;
  }
}

export { ML_BASE };