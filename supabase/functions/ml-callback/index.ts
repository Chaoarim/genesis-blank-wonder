import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ML_CLIENT_ID = "7461192017586183";
const REDIRECT_URI = "https://partsai.online/";

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return respond(401, { error: "Unauthorized" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return respond(401, { error: "Unauthorized" });
    }

    const { code } = await req.json();
    if (!code) {
      return respond(400, { error: "Authorization code is required" });
    }

    const clientSecret = Deno.env.get("ML_CLIENT_SECRET");
    if (!clientSecret) {
      return respond(500, { error: "ML_CLIENT_SECRET not configured" });
    }

    // Exchange code for tokens
    console.log("[ml-callback] Exchanging code for tokens...");
    const tokenResp = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: ML_CLIENT_ID,
        client_secret: clientSecret,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResp.json();

    if (!tokenResp.ok) {
      console.error("[ml-callback] Token exchange failed:", JSON.stringify(tokenData));
      return respond(400, {
        error: "Falha ao trocar código por token",
        details: tokenData,
      });
    }

    console.log("[ml-callback] Token obtained, user_id:", tokenData.user_id);

    // Calculate expiration
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 21600) * 1000).toISOString();

    // Get ML user info
    let mlNickname = "";
    try {
      const meResp = await fetch("https://api.mercadolibre.com/users/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const meData = await meResp.json();
      mlNickname = meData.nickname || "";
    } catch {}

    // Upsert tokens using service role to bypass RLS for upsert
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await supabaseAdmin
      .from("ml_tokens")
      .upsert(
        {
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          ml_user_id: tokenData.user_id || null,
          ml_nickname: mlNickname,
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("[ml-callback] Upsert error:", upsertError);
      return respond(500, { error: "Falha ao salvar tokens", details: upsertError.message });
    }

    console.log("[ml-callback] Tokens saved successfully for user:", user.id);

    return respond(200, {
      ok: true,
      ml_user_id: tokenData.user_id,
      ml_nickname: mlNickname,
      expires_at: expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[ml-callback] Error:", message);
    return respond(500, { error: message });
  }
});
