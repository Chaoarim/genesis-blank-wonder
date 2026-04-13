import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const ML_CLIENT_ID = '7461192017586183';

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function refreshMLToken(supabaseAdmin: any, userId: string, refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_at: string } | null> {
  const clientSecret = Deno.env.get('ML_CLIENT_SECRET');
  if (!clientSecret) return null;

  console.log('[ml-proxy] Refreshing ML token...');
  const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ML_CLIENT_ID,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const body = await resp.json();
  if (!resp.ok) {
    console.error('[ml-proxy] Refresh failed:', JSON.stringify(body));
    return null;
  }

  const expiresAt = new Date(Date.now() + (body.expires_in || 21600) * 1000).toISOString();

  await supabaseAdmin.from('ml_tokens').update({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: expiresAt,
  }).eq('user_id', userId);

  console.log('[ml-proxy] Token refreshed successfully');
  return { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: expiresAt };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return respond(401, { error: 'Unauthorized' });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return respond(401, { error: 'Unauthorized' });
    }

    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return respond(400, { error: 'URL inválida ou ausente' });
    }

    if (!url.includes('mercadolibre.com') && !url.includes('mercadolivre.com')) {
      return respond(400, { error: 'Apenas URLs do Mercado Livre são permitidas' });
    }

    // Get tokens from DB using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokenRow } = await supabaseAdmin
      .from('ml_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!tokenRow) {
      return respond(200, {
        ok: false,
        error: 'ML não conectado. Autorize sua conta do Mercado Livre primeiro.',
        not_connected: true,
      });
    }

    let accessToken = tokenRow.access_token;

    // Check if token is expired (with 60s buffer)
    const expiresAt = new Date(tokenRow.expires_at).getTime();
    if (Date.now() > expiresAt - 60000) {
      console.log('[ml-proxy] Token expired, refreshing...');
      const refreshed = await refreshMLToken(supabaseAdmin, user.id, tokenRow.refresh_token);
      if (!refreshed) {
        // Delete invalid tokens
        await supabaseAdmin.from('ml_tokens').delete().eq('user_id', user.id);
        return respond(200, {
          ok: false,
          error: 'Token ML expirado e não foi possível renovar. Reconecte sua conta.',
          not_connected: true,
        });
      }
      accessToken = refreshed.access_token;
    }

    // Fetch ML API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      console.log(`[ml-proxy] Fetching: ${url}`);
      let response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // If 401, try refreshing token once
      if (response.status === 401) {
        console.log('[ml-proxy] Got 401, refreshing token...');
        await response.text(); // consume body
        const refreshed = await refreshMLToken(supabaseAdmin, user.id, tokenRow.refresh_token);
        if (refreshed) {
          response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${refreshed.access_token}`,
              'Content-Type': 'application/json',
            },
          });
        }
      }

      clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) {
        console.error(`[ml-proxy] ML API error ${response.status}:`, JSON.stringify(data).substring(0, 500));
        return respond(200, {
          ok: false,
          error: `ML API retornou status ${response.status}`,
          status: response.status,
          details: data,
        });
      }

      return respond(200, { ok: true, data });
    } finally {
      clearTimeout(timeout);
    }
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
