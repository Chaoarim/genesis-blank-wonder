import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
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

  try {
    const apiKey = Deno.env.get("SERPAPI_KEY");
    if (!apiKey) {
      console.error("[ml-proxy] SERPAPI_KEY not configured");
      return respond(500, { error: "SERPAPI_KEY not configured" });
    }

    const body = await req.json();
    const { action } = body;

    // ── ACTION: search (Google Shopping via SerpAPI) ──
    if (action === "shopping_search") {
      const { termo, estado } = body;
      if (!termo) return respond(400, { error: "termo is required" });

      const query = estado && estado !== "BRASIL"
        ? `${termo} mercadolivre ${estado}`
        : `${termo} mercadolivre`;

      const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&gl=br&hl=pt-BR&google_domain=google.com.br&num=40&api_key=${apiKey}`;
      
      console.log("[ml-proxy] SerpAPI Shopping request:", url.replace(apiKey, "***"));

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        console.error("[ml-proxy] SerpAPI error:", data.error);
        return respond(200, { results: [], metrics: {}, serpapi_error: data.error });
      }

      console.log("[ml-proxy] SerpAPI raw shopping_results count:", data.shopping_results?.length ?? 0);

      const results = (data.shopping_results || [])
        .map((item: any, i: number) => ({
          position: i + 1,
          title: item.title || "",
          price: item.extracted_price || 0,
          original_price: item.extracted_original_price || null,
          thumbnail: item.thumbnail || "",
          link: item.link || "",
          source: item.source || "Vendedor",
          rating: item.rating || null,
          reviews: item.reviews || 0,
          delivery: item.delivery || "",
          free_shipping: (item.delivery || "").toLowerCase().includes("grátis") ||
                         (item.delivery || "").toLowerCase().includes("frete grátis") ||
                         (item.tag || "").toLowerCase().includes("frete grátis"),
          badge: item.badge || null,
          extensions: item.extensions || [],
        }));

      const prices = results.map((r: any) => r.price).filter((p: number) => p > 0);
      const bestRated = [...results].sort((a: any, b: any) => (b.reviews || 0) - (a.reviews || 0));

      const metrics = {
        total: results.length,
        min_price: prices.length ? Math.min(...prices) : 0,
        max_price: prices.length ? Math.max(...prices) : 0,
        avg_price: prices.length ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0,
        best_rated_seller: bestRated[0]?.source || "",
        best_rated_reviews: bestRated[0]?.reviews || 0,
        free_shipping_count: results.filter((r: any) => r.free_shipping).length,
      };

      console.log("[ml-proxy] Returning", results.length, "results, metrics:", JSON.stringify(metrics));
      return respond(200, { results, metrics });
    }

    // ── ACTION: trends (Google Trends via SerpAPI) ──
    if (action === "trends") {
      const { termo } = body;
      if (!termo) return respond(400, { error: "termo is required" });

      const url = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(termo)}&geo=BR&date=today+1-m&api_key=${apiKey}`;
      console.log("[ml-proxy] SerpAPI Trends request");

      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        console.error("[ml-proxy] SerpAPI trends error:", data.error);
        return respond(200, { trend: null, error: data.error });
      }

      const timelineData = data.interest_over_time?.timeline_data || [];
      const values = timelineData.map((d: any) => d.values?.[0]?.extracted_value ?? 0);
      
      let trend = "ESTÁVEL";
      if (values.length >= 2) {
        const recent = values.slice(-7).reduce((a: number, b: number) => a + b, 0) / Math.min(values.length, 7);
        const older = values.slice(0, 7).reduce((a: number, b: number) => a + b, 0) / Math.min(values.length, 7);
        const variation = older > 0 ? ((recent - older) / older) * 100 : 0;
        if (variation > 15) trend = "ALTA";
        else if (variation < -15) trend = "BAIXA";
      }

      return respond(200, {
        trend,
        values,
        timeline: timelineData.map((d: any) => ({
          date: d.date,
          value: d.values?.[0]?.extracted_value ?? 0,
        })),
      });
    }

    // ── ACTION: regional (multiple regional searches) ──
    if (action === "regional") {
      const { termo } = body;
      if (!termo) return respond(400, { error: "termo is required" });

      const regions = [
        { name: "Sudeste", city: "São Paulo" },
        { name: "Sul", city: "Curitiba" },
        { name: "Nordeste", city: "Salvador" },
        { name: "Centro-Oeste", city: "Goiânia" },
        { name: "Norte", city: "Manaus" },
      ];

      const regionalResults = await Promise.all(
        regions.map(async (region) => {
          try {
            const query = `${termo} mercadolivre ${region.city}`;
            const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&gl=br&hl=pt-BR&google_domain=google.com.br&num=10&api_key=${apiKey}`;
            const resp = await fetch(url);
            const data = await resp.json();
            const items = data.shopping_results || [];
            const prices = items.map((i: any) => i.extracted_price || 0).filter((p: number) => p > 0);
            const hasFreeShipping = items.some((i: any) =>
              (i.delivery || "").toLowerCase().includes("grátis")
            );

            return {
              region: region.name,
              city: region.city,
              offers: items.length,
              min_price: prices.length ? Math.min(...prices) : 0,
              free_shipping: hasFreeShipping,
              status: items.length >= 5 ? "bem_abastecido" : items.length >= 2 ? "limitado" : "escasso",
            };
          } catch (e) {
            console.error(`[ml-proxy] Regional error for ${region.name}:`, e);
            return {
              region: region.name,
              city: region.city,
              offers: 0,
              min_price: 0,
              free_shipping: false,
              status: "escasso",
            };
          }
        })
      );

      return respond(200, { regions: regionalResults });
    }

    // ── ACTION: related (related products) ──
    if (action === "related") {
      const { termo } = body;
      if (!termo) return respond(400, { error: "termo is required" });

      const query = `peças relacionadas ${termo} automotivo`;
      const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&gl=br&hl=pt-BR&google_domain=google.com.br&num=8&api_key=${apiKey}`;

      const resp = await fetch(url);
      const data = await resp.json();

      const related = (data.shopping_results || []).slice(0, 6).map((item: any) => ({
        title: item.title || "",
        price: item.extracted_price || 0,
        thumbnail: item.thumbnail || "",
        link: item.link || "",
        source: item.source || "",
      }));

      return respond(200, { related });
    }

    // Legacy actions - keep backward compatibility
    if (action === "search" || action === "item" || action === "seller") {
      return respond(200, { ok: false, error: "Legacy action. Use shopping_search instead." });
    }

    return respond(400, { error: "Invalid action. Use: shopping_search, trends, regional, related" });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[ml-proxy] Error:", message);
    return respond(500, { error: message });
  }
});
