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

// Convert SerpAPI google_shopping results to the ML API format our frontend expects
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
      address: {
        state_id: "",
        state_name: "",
        city_name: "",
      },
      shipping: {
        free_shipping: item.delivery?.includes("Grátis") || false,
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

    switch (params.action) {
      // ── SEARCH via SerpAPI ──
      case "search": {
        const query = params.query || "";
        const offset = params.offset || 0;
        const limit = params.limit || 50;

        const serpParams = new URLSearchParams({
          engine: "mercadolibre",
          mercadolibre_domain: "mercadolivre.com.br",
          query: query,
          api_key: serpApiKey,
        });

        if (offset > 0) {
          serpParams.set("start", String(offset));
        }

        if (params.state) {
          // SerpAPI doesn't have a direct state filter, but we can append to query
          serpParams.set("q", `${query} ${params.state.replace("BR-", "")}`);
        }

        console.log(`[ml-proxy] SerpAPI search: ${query} (offset=${offset})`);
        const serpResp = await fetch(`${SERPAPI_BASE}?${serpParams}`);
        const serpData = await serpResp.json();

        if (!serpResp.ok) {
          console.error("[ml-proxy] SerpAPI error:", JSON.stringify(serpData).substring(0, 500));
          return respond(200, {
            ok: false,
            error: `SerpAPI retornou status ${serpResp.status}`,
            details: serpData,
          });
        }

        const converted = convertSerpResults(serpData, offset, limit);
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
