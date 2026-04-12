const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

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

    console.log(`[ml-proxy] Fetching: ${url}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      console.error(`[ml-proxy] ML API error ${response.status}:`, JSON.stringify(data).substring(0, 300));
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
