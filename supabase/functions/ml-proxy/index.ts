import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  const startTime = Date.now();

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return respond(401, { ok: false, error: "Unauthorized" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return respond(401, { ok: false, error: "Unauthorized", details: userError?.message });
    }

    // Parse request
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return respond(400, { ok: false, error: "Missing or invalid 'url' in request body" });
    }

    // Only allow Mercado Livre API
    if (!url.startsWith("https://api.mercadolibre.com/")) {
      return respond(400, { ok: false, error: "Only Mercado Livre API URLs are allowed" });
    }

    console.log(`[ml-proxy] Fetching: ${url}`);

    const mlResponse = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    const processingTime = Date.now() - startTime;

    // Check content type
    const contentType = mlResponse.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await mlResponse.text();
      console.error(`[ml-proxy] Non-JSON response (${mlResponse.status}): ${text.substring(0, 200)}`);
      return respond(200, {
        ok: false,
        error: "Non-JSON response from Mercado Livre API",
        status: mlResponse.status,
        processing_time_ms: processingTime,
      });
    }

    const data = await mlResponse.json();

    if (!mlResponse.ok) {
      console.error(`[ml-proxy] ML API error ${mlResponse.status}:`, JSON.stringify(data).substring(0, 500));
      return respond(200, {
        ok: false,
        error: "Mercado Livre API error",
        status: mlResponse.status,
        details: data,
        processing_time_ms: processingTime,
      });
    }

    return respond(200, {
      ok: true,
      data,
      processing_time_ms: processingTime,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[ml-proxy] Error:`, message);
    return respond(200, {
      ok: false,
      error: message,
      processing_time_ms: Date.now() - startTime,
    });
  }
});
