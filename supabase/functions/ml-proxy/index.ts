import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SERPAPI_BASE = "https://serpapi.com/search.json";
const ML_API_BASE = "https://api.mercadolibre.com";

function respond(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ProxyRequest {
  action: "search" | "item" | "seller" | "trends";
  query?: string;
  offset?: number;
  limit?: number;
  state?: string;
  item_id?: string;
  item_ids?: string[];
  seller_id?: string | number;
}

// Convert SerpAPI mercadolibre organic_results to ML API format
function convertMercadoLibreResults(serpData: any, offset: number, limit: number) {
  const organicResults = serpData.organic_results || [];

  const results = organicResults.map((item: any, idx: number) => {
    const priceNum = item.price?.extracted_value || item.price?.extracted || 0;
    const mlIdMatch = (item.link || "").match(/MLB-?(\d+)/);
    const mlId = mlIdMatch ? `MLB${mlIdMatch[1]}` : `SERP-${idx}`;

    return {
      id: mlId,
      title: item.title || "",
      price: priceNum,
      sold_quantity: item.reviews?.count || 0,
      available_quantity: 10,
      thumbnail: item.thumbnail || "",
      permalink: item.link || "",
      condition: "new",
      seller: {
        id: 0,
        nickname: item.seller_info?.name || item.seller?.name || "Vendedor ML",
      },
      address: {
        state_id: "",
        state_name: "",
        city_name: "",
      },
      shipping: {
        free_shipping: (item.extensions || []).some((e: string) => /gr[aá]tis|free/i.test(e)),
        tags: [],
      },
      installments: null,
      attributes: [],
    };
  });

  return {
    results,
    paging: {
      total: serpData.search_information?.total_results || results.length,
      offset,
      limit,
    },
  };
}

// Fallback: Convert SerpAPI google_shopping results
function convertShoppingResults(serpData: any, offset: number, limit: number) {
  const shoppingResults = serpData.shopping_results || [];

  const results = shoppingResults.map((item: any) => {
    const priceNum = item.extracted_price || (item.price ? parseFloat(String(item.price).replace(/[^\d.,]/g, "").replace(",", ".")) : 0);
    const mlIdMatch = (item.link || "").match(/MLB-?(\d+)/);
    const mlId = mlIdMatch ? `MLB${mlIdMatch[1]}` : "";

    return {
      id: mlId,
      title: item.title || "",
      price: priceNum,
      sold_quantity: 0,
      available_quantity: 10,
      thumbnail: item.thumbnail || "",
      permalink: item.link || "",
      condition: "new",
      seller: {
        id: 0,
        nickname: item.source || "Vendedor ML",
      },
      address: { state_id: "", state_name: "", city_name: "" },
      shipping: { free_shipping: false, tags: [] },
      installments: null,
      attributes: [],
    };
  });

  return {
    results,
    paging: {
      total: serpData.search_information?.total_results || results.length,
      offset,
      limit,
    },
  };
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return respond(401, { error: "Unauthorized" });
    }

    const params: ProxyRequest = await req.json();
    const serpApiKey = Deno.env.get("SERPAPI_KEY");

    if (!serpApiKey) {
      return respond(500, {
        ok: false,
        error: "SERPAPI_KEY não configurada no servidor",
      });
    }

    console.log("[ml-proxy] SERPAPI_KEY exists:", !!serpApiKey);

    switch (params.action) {
      // ── SEARCH via SerpAPI (mercadolibre engine, fallback to google_shopping) ──
      case "search": {
        const query = params.query || "";
        const offset = params.offset || 0;
        const limit = params.limit || 50;

        // Step 1: Try mercadolibre engine
        const mlParams = new URLSearchParams({
          engine: "mercadolibre",
          mercadolibre_domain: "mercadolivre.com.br",
          query: query,
          api_key: serpApiKey,
        });

        console.log(`[ml-proxy] SerpAPI mercadolibre engine: query="${query}"`);
        let serpResp = await fetch(`${SERPAPI_BASE}?${mlParams}`);
        let serpData = await serpResp.json();

        console.log(`[ml-proxy] SerpAPI mercadolibre status: ${serpResp.status}, keys: ${Object.keys(serpData).join(",")}`);
        console.log(`[ml-proxy] SerpAPI response (first 1000 chars):`, JSON.stringify(serpData).substring(0, 1000));

        if (serpResp.ok && serpData.organic_results && serpData.organic_results.length > 0) {
          const converted = convertMercadoLibreResults(serpData, offset, limit);
          console.log(`[ml-proxy] mercadolibre engine returned ${converted.results.length} results`);
          return respond(200, { ok: true, data: converted });
        }

        // Step 2: Fallback to google_shopping
        console.log("[ml-proxy] mercadolibre engine returned no results, trying google_shopping fallback");
        const gsQuery = params.state
          ? `${query} ${params.state.replace("BR-", "")} mercadolivre`
          : `${query} mercadolivre`;

        const gsParams = new URLSearchParams({
          engine: "google_shopping",
          q: gsQuery,
          gl: "br",
          hl: "pt",
          num: String(limit),
          api_key: serpApiKey,
        });

        if (offset > 0) {
          gsParams.set("start", String(offset));
        }

        serpResp = await fetch(`${SERPAPI_BASE}?${gsParams}`);
        serpData = await serpResp.json();

        console.log(`[ml-proxy] google_shopping status: ${serpResp.status}, shopping_results count: ${(serpData.shopping_results || []).length}`);

        if (!serpResp.ok) {
          console.error("[ml-proxy] SerpAPI fallback error:", JSON.stringify(serpData).substring(0, 500));
          return respond(200, {
            ok: false,
            error: `SerpAPI retornou status ${serpResp.status}`,
            details: serpData,
          });
        }

        const converted = convertShoppingResults(serpData, offset, limit);
        console.log(`[ml-proxy] google_shopping fallback returned ${converted.results.length} results`);
        return respond(200, { ok: true, data: converted });
      }

      // ── ITEM detail (direct ML API — public, no auth needed from server) ──
      case "item": {
        if (params.item_ids?.length) {
          const url = `${ML_API_BASE}/items?ids=${params.item_ids.join(",")}`;
          console.log(`[ml-proxy] ML items batch: ${params.item_ids.length} items`);
          const resp = await fetch(url);
          const data = await resp.json();
          return respond(200, { ok: resp.ok, data });
        }
        if (!params.item_id) {
          return respond(400, { ok: false, error: "item_id obrigatório" });
        }
        const url = `${ML_API_BASE}/items/${params.item_id}`;
        console.log(`[ml-proxy] ML item: ${params.item_id}`);
        const resp = await fetch(url);
        const data = await resp.json();
        return respond(200, { ok: resp.ok, data });
      }

      // ── SELLER detail (direct ML API — public) ──
      case "seller": {
        if (!params.seller_id) {
          return respond(400, { ok: false, error: "seller_id obrigatório" });
        }
        const url = `${ML_API_BASE}/users/${params.seller_id}`;
        console.log(`[ml-proxy] ML seller: ${params.seller_id}`);
        const resp = await fetch(url);
        const data = await resp.json();
        return respond(200, { ok: resp.ok, data });
      }

      // ── TRENDS (direct ML API — public) ──
      case "trends": {
        const url = `${ML_API_BASE}/trends/MLB`;
        console.log("[ml-proxy] ML trends");
        const resp = await fetch(url);
        const data = await resp.json();
        return respond(200, { ok: resp.ok, data });
      }

      default:
        return respond(400, { ok: false, error: "Ação inválida" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[ml-proxy] Error:", message);
    return respond(200, {
      ok: false,
      error: message,
    });
  }
});
