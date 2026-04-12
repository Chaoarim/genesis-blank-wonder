const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// --- OAuth Token Cache ---
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

const ML_CLIENT_ID = '7461192017586183';

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s margin)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientSecret = Deno.env.get('ML_CLIENT_SECRET');
  if (!clientSecret) {
    throw new Error('ML_CLIENT_SECRET not configured');
  }

  console.log('[ml-proxy] Requesting new OAuth token...');

  const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ML_CLIENT_ID,
      client_secret: clientSecret,
    }),
  });

  const body = await resp.json();

  if (!resp.ok) {
    console.error('[ml-proxy] OAuth error:', JSON.stringify(body));
    throw new Error(`OAuth failed: ${body.error || resp.status}`);
  }

  cachedToken = body.access_token;
  // ML tokens typically expire in 6 hours
  tokenExpiresAt = Date.now() + (body.expires_in || 21600) * 1000;
  console.log('[ml-proxy] OAuth token obtained successfully');

  return cachedToken!;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const respond = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return respond(400, { error: 'URL inválida ou ausente' });
    }

    // Only allow ML API URLs
    if (!url.includes('mercadolibre.com') && !url.includes('mercadolivre.com')) {
      return respond(400, { error: 'Apenas URLs do Mercado Livre são permitidas' });
    }

    // Get OAuth token
    const accessToken = await getAccessToken();

    console.log(`[ml-proxy] Fetching: ${url}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      console.error(`[ml-proxy] ML API error ${response.status}:`, JSON.stringify(data).substring(0, 300));
      
      // If 401, invalidate token cache so next request gets a fresh one
      if (response.status === 401) {
        cachedToken = null;
        tokenExpiresAt = 0;
      }
      
      return respond(200, {
        ok: false,
        error: `ML API retornou status ${response.status}`,
        status: response.status,
        details: data,
      });
    }

    return respond(200, { ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    const isTimeout = message.includes('abort');
    console.error(`[ml-proxy] Error:`, message);
    return respond(200, {
      ok: false,
      error: isTimeout ? 'Timeout ao conectar com Mercado Livre' : message,
      timeout: isTimeout,
    });
  }
});
