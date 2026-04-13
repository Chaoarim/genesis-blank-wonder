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

// Extract MLB IDs from SerpAPI result links
function extractMlIds(results: any[]): Map<string, string> {
  const idMap = new Map<string, string>(); // mlId -> link
  for (const item of results) {
    const link = item.link || item.permalink || "";
    const match = link.match(/MLB-?(\d+)/);
    if (match) {
      const mlId = `MLB${match[1]}`;
      idMap.set(mlId, link);
    }
  }
  return idMap;
}

// Fetch item details from ML public API in batches of 20
async function fetchItemDetails(mlIds: string[]): Promise<Map<string, any>> {
  const details = new Map<string, any>();
  if (mlIds.length === 0) return details;

  const batchSize = 20;
  for (let i = 0; i < mlIds.length; i += batchSize) {
    const batch = mlIds.slice(i, i + batchSize);
    const url = `${ML_API_BASE}/items?ids=${batch.join(",")}`;
    try {
      console.log(`[ml-proxy] Fetching item details batch: ${batch.length} items`);
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        for (const entry of data) {
          if (entry.code === 200 && entry.body) {
            details.set(entry.body.id, entry.body);
          }
        }
      }
    } catch (e) {
      console.error("[ml-proxy] Item batch fetch error:", e);
    }
  }
  return details;
}

// Fetch seller details from ML public API
async function fetchSellerDetails(sellerIds: number[]): Promise<Map<number, any>> {
  const details = new Map<number, any>();
  if (sellerIds.length === 0) return details;

  // Limit to 10 unique sellers to avoid too many requests
  const uniqueIds = [...new Set(sellerIds)].slice(0, 10);
  const fetches = uniqueIds.map(async (id) => {
    try {
      const resp = await fetch(`${ML_API_BASE}/users/${id}`);
      if (resp.ok) {
        const data = await resp.json();
        details.set(id, data);
      }
    } catch (e) {
      console.error(`[ml-proxy] Seller fetch error for ${id}:`, e);
    }
  });
  await Promise.all(fetches);
  return details;
}

// Enrich SerpAPI results with ML API data
async function enrichResults(basicResults: any[]): Promise<any[]> {
  // 1. Extract ML IDs
  const idMap = extractMlIds(basicResults);
  const mlIds = [...idMap.keys()];
  console.log(`[ml-proxy] Extracted ${mlIds.length} ML IDs for enrichment`);

  if (mlIds.length === 0) return basicResults;

  // 2. Fetch item details
  const itemDetails = await fetchItemDetails(mlIds);
  console.log(`[ml-proxy] Got details for ${itemDetails.size} items`);

  // 3. Collect seller IDs and fetch seller details
  const sellerIds: number[] = [];
  for (const item of itemDetails.values()) {
    if (item.seller_id) sellerIds.push(item.seller_id);
  }
  const sellerDetails = await fetchSellerDetails(sellerIds);
  console.log(`[ml-proxy] Got details for ${sellerDetails.size} sellers`);

  // 4. Merge data
  return basicResults.map((result) => {
    const link = result.permalink || result.link || "";
    const match = link.match(/MLB-?(\d+)/);
    const mlId = match ? `MLB${match[1]}` : null;
    const itemData = mlId ? itemDetails.get(mlId) : null;

    if (!itemData) return result;

    const sellerId = itemData.seller_id;
    const sellerData = sellerId ? sellerDetails.get(sellerId) : null;

    return {
      ...result,
      id: mlId || result.id,
      sold_quantity: itemData.sold_quantity ?? result.sold_quantity ?? 0,
      available_quantity: itemData.available_quantity ?? result.available_quantity ?? 0,
      condition: itemData.condition || result.condition,
      seller: {
        id: sellerId || result.seller?.id || 0,
        nickname: itemData.seller?.nickname || sellerData?.nickname || result.seller?.nickname || "N/A",
        reputation: sellerData?.seller_reputation?.level_id || "",
        completed_transactions: sellerData?.seller_reputation?.transactions?.completed || 0,
      },
      address: {
        state_id: itemData.seller_address?.state?.id || "",
        state_name: itemData.seller_address?.state?.name || result.address?.state_name || "",
        city_name: itemData.seller_address?.city?.name || result.address?.city_name || "",
      },
      shipping: {
        free_shipping: itemData.shipping?.free_shipping ?? result.shipping?.free_shipping ?? false,
        tags: itemData.shipping?.tags || [],
      },
    };
  });
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
      address: { state_id: "", state_name: "", city_name: "" },
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

    const params: ProxyRequest = await req.json();
    const serpApiKey = Deno.env.get("SERPAPI_KEY");

    if (!serpApiKey) {
      return respond(500, { ok: false, error: "SERPAPI_KEY não configurada" });
    }

    switch (params.action) {
      case "search": {
        const query = params.query || "";
        const offset = params.offset || 0;
        const limit = params.limit || 50;

        // Step 1: Try mercadolibre engine
        const mlParams = new URLSearchParams({
          engine: "mercadolibre",
          mercadolibre_domain: "mercadolivre.com.br",
          query,
          api_key: serpApiKey,
        });

        console.log(`[ml-proxy] SerpAPI search: query="${query}"`);
        let serpResp = await fetch(`${SERPAPI_BASE}?${mlParams}`);
        let serpData = await serpResp.json();

        let converted: any;

        if (serpResp.ok && serpData.organic_results?.length > 0) {
          converted = convertMercadoLibreResults(serpData, offset, limit);
          console.log(`[ml-proxy] mercadolibre engine: ${converted.results.length} results`);
        } else {
          // Fallback to google_shopping
          console.log("[ml-proxy] Falling back to google_shopping");
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
          if (offset > 0) gsParams.set("start", String(offset));

          serpResp = await fetch(`${SERPAPI_BASE}?${gsParams}`);
          serpData = await serpResp.json();

          if (!serpResp.ok) {
            return respond(200, { ok: false, error: `SerpAPI error ${serpResp.status}`, details: serpData });
          }
          converted = convertShoppingResults(serpData, offset, limit);
          console.log(`[ml-proxy] google_shopping fallback: ${converted.results.length} results`);
        }

        // Step 2: Enrich with real ML API data
        try {
          converted.results = await enrichResults(converted.results);
          console.log(`[ml-proxy] Enrichment complete`);
        } catch (e) {
          console.error("[ml-proxy] Enrichment failed (returning basic results):", e);
        }

        return respond(200, { ok: true, data: converted });
      }

      case "item": {
        if (params.item_ids?.length) {
          const url = `${ML_API_BASE}/items?ids=${params.item_ids.join(",")}`;
          const resp = await fetch(url);
          const data = await resp.json();
          return respond(200, { ok: resp.ok, data });
        }
        if (!params.item_id) return respond(400, { ok: false, error: "item_id obrigatório" });
        const url = `${ML_API_BASE}/items/${params.item_id}`;
        const resp = await fetch(url);
        const data = await resp.json();
        return respond(200, { ok: resp.ok, data });
      }

      case "seller": {
        if (!params.seller_id) return respond(400, { ok: false, error: "seller_id obrigatório" });
        const url = `${ML_API_BASE}/users/${params.seller_id}`;
        const resp = await fetch(url);
        const data = await resp.json();
        return respond(200, { ok: resp.ok, data });
      }

      case "trends": {
        const url = `${ML_API_BASE}/trends/MLB`;
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
    return respond(200, { ok: false, error: message });
  }
});
