import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ML_BASE = "https://api.mercadolibre.com";
const CATEGORY_AUTOPARTS = "MLB1743";

interface SearchParams {
  action: "search" | "item" | "seller" | "search_regional";
  query?: string;
  state?: string;
  item_id?: string;
  seller_id?: string;
  offset?: number;
  limit?: number;
  sort?: string;
}

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
      return respond(401, { error: "Unauthorized", details: userError?.message });
    }

    const params: SearchParams = await req.json();
    let url: string;

    switch (params.action) {
      case "search": {
        const q = encodeURIComponent(params.query || "");
        const limit = params.limit || 50;
        const offset = params.offset || 0;
        const sort = params.sort || "sold_quantity_desc";
        url = `${ML_BASE}/sites/MLB/search?q=${q}&category=${CATEGORY_AUTOPARTS}&sort=${sort}&limit=${limit}&offset=${offset}`;
        break;
      }
      case "search_regional": {
        const q = encodeURIComponent(params.query || "");
        const state = params.state || "BR-SP";
        const limit = params.limit || 50;
        const offset = params.offset || 0;
        url = `${ML_BASE}/sites/MLB/search?q=${q}&category=${CATEGORY_AUTOPARTS}&state=${state}&sort=sold_quantity_desc&limit=${limit}&offset=${offset}`;
        break;
      }
      case "item": {
        if (!params.item_id) {
          return respond(400, { error: "item_id is required" });
        }
        url = `${ML_BASE}/items/${params.item_id}`;
        break;
      }
      case "seller": {
        if (!params.seller_id) {
          return respond(400, { error: "seller_id is required" });
        }
        url = `${ML_BASE}/users/${params.seller_id}`;
        break;
      }
      default:
        return respond(400, { error: "Invalid action" });
    }

    console.log(`[mercadolivre-proxy] Fetching: ${url}`);
    const mlResponse = await fetch(url);
    const mlData = await mlResponse.json();

    if (!mlResponse.ok) {
      console.error(`[mercadolivre-proxy] ML API error ${mlResponse.status}:`, JSON.stringify(mlData));
      return respond(200, {
        ok: false,
        error: "Mercado Livre API error",
        status: mlResponse.status,
        details: mlData,
        results: [],
        paging: { total: 0, offset: 0, limit: 0 },
      });
    }

    return respond(200, mlData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[mercadolivre-proxy] Error:`, message);
    return respond(200, {
      ok: false,
      error: message,
      results: [],
      paging: { total: 0, offset: 0, limit: 0 },
    });
  }
});
