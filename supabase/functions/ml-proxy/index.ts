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
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return respond(400, { ok: false, error: "Missing or invalid 'url' in request body" });
    }

    // Only allow Mercado Livre API
    if (!url.startsWith("https://api.mercadolibre.com/") && !url.startsWith("https://api.mercadolivre.com/")) {
      return respond(400, { ok: false, error: "Only Mercado Livre API URLs are allowed" });
    }

    console.log(`[ml-proxy] Fetching: ${url}`);

    const mlResponse = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    const processingTime = Date.now() - startTime;

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
