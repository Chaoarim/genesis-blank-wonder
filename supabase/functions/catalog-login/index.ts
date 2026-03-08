import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sellerId, phone, password, mode, name } = await req.json();

    if (!sellerId || !phone || !password) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (mode === "register") {
      if (!name?.trim()) {
        return new Response(JSON.stringify({ error: "Nome é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if phone already exists for this seller
      const { data: existing } = await supabaseAdmin
        .from("catalog_customers")
        .select("id")
        .eq("seller_id", sellerId)
        .eq("phone", phone.trim())
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Telefone já cadastrado. Faça login." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Hash password and insert
      const { data: hashResult } = await supabaseAdmin.rpc("_catalog_hash_password", { pw: password });

      const { data: newCustomer, error: insertError } = await supabaseAdmin
        .from("catalog_customers")
        .insert({
          seller_id: sellerId,
          name: name.trim(),
          phone: phone.trim(),
          password_hash: hashResult,
        })
        .select("id, name, phone")
        .single();

      if (insertError || !newCustomer) {
        return new Response(JSON.stringify({ error: "Erro ao cadastrar" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, customer: newCustomer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Login mode: verify credentials server-side
    const { data: customer } = await supabaseAdmin
      .from("catalog_customers")
      .select("id, name, phone, password_hash")
      .eq("seller_id", sellerId)
      .eq("phone", phone.trim())
      .maybeSingle();

    if (!customer) {
      return new Response(JSON.stringify({ error: "Telefone ou senha incorretos" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify bcrypt password
    const { data: isValid } = await supabaseAdmin.rpc("_catalog_verify_password", {
      pw: password,
      pw_hash: customer.password_hash,
    });

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Telefone ou senha incorretos" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        customer: { id: customer.id, name: customer.name, phone: customer.phone },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("catalog-login error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
