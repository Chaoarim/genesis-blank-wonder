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
  tokenExpiresAt = Date.now() + (body.expires_in || 21600) * 1000;
  console.log('[ml-proxy] OAuth token obtained successfully');

  return cachedToken!;
}

function appendTokenToUrl(url: string, token: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}access_token=${token}`;
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

    if (!url.includes('mercadolibre.com') && !url.includes('mercadolivre.com')) {
      return respond(400, { error: 'Apenas URLs do Mercado Livre são permitidas' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Get OAuth token
    let accessToken: string | null = null;
    try {
      accessToken = await getAccessToken();
    } catch (e) {
      console.warn('[ml-proxy] Could not get OAuth token:', e);
    }

    // Try with token as query param first (avoids 403 from datacenter IPs)
    const urlWithToken = accessToken ? appendTokenToUrl(url, accessToken) : url;
    console.log(`[ml-proxy] Fetching: ${url} (with_token=${!!accessToken})`);

    let response = await fetch(urlWithToken, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    // If still 403, try with Bearer header
    if (response.status === 403 && accessToken) {
      console.log('[ml-proxy] Got 403 with query token, retrying with Bearer header...');
      await response.text();
      response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
    }

    // If still 403, try without any auth
    if (response.status === 403) {
      console.log('[ml-proxy] Got 403 with auth, retrying without auth...');
      await response.text();
      response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
    }

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      console.error(`[ml-proxy] ML API error ${response.status}:`, JSON.stringify(data).substring(0, 300));
      
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
