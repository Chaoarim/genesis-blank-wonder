import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

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

// Fetch seller details from ML public API
async function fetchSellerDetails(sellerIds: number[]): Promise<Map<number, any>> {
  const details = new Map<number, any>();
  if (sellerIds.length === 0) return details;

  const uniqueIds = [...new Set(sellerIds)].slice(0, 10);
  const fetches = uniqueIds.map(async (id) => {
    try {
      const resp = await fetch(`${ML_API_BASE}/users/${id}`);
      if (resp.ok) {
        const data = await resp.json();
        details.set(id, data);
      } else {
        console.log(`[ml-proxy] Seller ${id} fetch failed: ${resp.status}`);
      }
    } catch (e) {
      console.error(`[ml-proxy] Seller fetch error for ${id}:`, e);
    }
  });
  await Promise.all(fetches);
  return details;
}

// Enrich ML search results with seller reputation data
async function enrichWithSellerData(results: any[]): Promise<any[]> {
  const sellerIds: number[] = results
    .map((r) => r.seller?.id)
    .filter((id) => id && typeof id === "number");

  if (sellerIds.length === 0) return results;

  const sellerDetails = await fetchSellerDetails(sellerIds);
  console.log(`[ml-proxy] Enriched ${sellerDetails.size} sellers`);

  return results.map((result) => {
    const sellerId = result.seller?.id;
    const sellerData = sellerId ? sellerDetails.get(sellerId) : null;

    if (!sellerData) return result;

    return {
      ...result,
      seller: {
        ...result.seller,
        nickname: sellerData.nickname || result.seller?.nickname || "N/A",
        reputation: sellerData.seller_reputation?.level_id || "",
        completed_transactions: sellerData.seller_reputation?.transactions?.completed || 0,
      },
    };
  });
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

    switch (params.action) {
      case "search": {
        const query = params.query || "";
        const offset = params.offset || 0;
        const limit = params.limit || 50;

        // Use ML public search API directly (no auth needed)
        const searchParams = new URLSearchParams({
          q: query,
          sort: "sold_quantity_desc",
          limit: String(limit),
          offset: String(offset),
        });

        const searchUrl = `${ML_API_BASE}/sites/MLB/search?${searchParams}`;
        console.log(`[ml-proxy] ML search: ${searchUrl}`);

        let resp = await fetch(searchUrl);
        let data: any;

        if (!resp.ok) {
          // Fallback without sort parameter
          console.log(`[ml-proxy] Sort failed (${resp.status}), retrying without sort`);
          const fallbackParams = new URLSearchParams({
            q: query,
            limit: String(limit),
            offset: String(offset),
          });
          resp = await fetch(`${ML_API_BASE}/sites/MLB/search?${fallbackParams}`);
        }

        if (!resp.ok) {
          const errText = await resp.text();
          console.error(`[ml-proxy] ML search failed: ${resp.status} - ${errText.slice(0, 300)}`);
          return respond(200, { ok: false, error: `ML API error ${resp.status}` });
        }

        data = await resp.json();
        console.log(`[ml-proxy] ML search returned ${data.results?.length ?? 0} results, total: ${data.paging?.total}`);

        // Map results to expected format
        const results = (data.results || []).map((item: any) => ({
          id: item.id || "",
          title: item.title || "",
          price: item.price || 0,
          sold_quantity: item.sold_quantity ?? 0,
          available_quantity: item.available_quantity ?? 0,
          thumbnail: item.thumbnail || "",
          permalink: item.permalink || "",
          condition: item.condition || "new",
          seller: {
            id: item.seller?.id || 0,
            nickname: item.seller?.nickname || "N/A",
            reputation: "",
            completed_transactions: 0,
          },
          address: {
            state_id: item.seller_address?.state?.id || item.address?.state_id || "",
            state_name: item.seller_address?.state?.name || item.address?.state_name || "",
            city_name: item.seller_address?.city?.name || item.address?.city_name || "",
          },
          shipping: {
            free_shipping: item.shipping?.free_shipping ?? false,
            tags: item.shipping?.tags || [],
          },
          installments: item.installments || null,
          attributes: item.attributes || [],
        }));

        // Log sample for debug
        if (results.length > 0) {
          const s = results[0];
          console.log(`[ml-proxy] Sample: id=${s.id}, sold=${s.sold_quantity}, seller=${s.seller.nickname}, price=${s.price}`);
        }

        // Enrich with seller reputation
        try {
          const enriched = await enrichWithSellerData(results);
          return respond(200, {
            ok: true,
            data: {
              results: enriched,
              paging: data.paging || { total: results.length, offset, limit },
            },
          });
        } catch (e) {
          console.error("[ml-proxy] Seller enrichment failed:", e);
          return respond(200, {
            ok: true,
            data: {
              results,
              paging: data.paging || { total: results.length, offset, limit },
            },
          });
        }
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
