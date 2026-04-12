import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ML_BASE = "https://api.mercadolivre.com";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          return new Response(
            JSON.stringify({ error: "item_id is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        url = `${ML_BASE}/items/${params.item_id}`;
        break;
      }
      case "seller": {
        if (!params.seller_id) {
          return new Response(
            JSON.stringify({ error: "seller_id is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        url = `${ML_BASE}/users/${params.seller_id}`;
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const mlResponse = await fetch(url);
    const mlData = await mlResponse.json();

    if (!mlResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Mercado Livre API error",
          status: mlResponse.status,
          details: mlData,
        }),
        {
          status: mlResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(mlData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
