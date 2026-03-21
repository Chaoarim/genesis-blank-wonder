import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admins podem importar" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { parts, clearFirst, catalogo, action } = await req.json();

    // Handle catalog deletion
    if (action === "delete_catalog") {
      let deleteQuery = supabase.from("parts").delete();
      if (catalogo === "__null__" || !catalogo) {
        deleteQuery = deleteQuery.is("catalogo", null);
      } else {
        deleteQuery = deleteQuery.eq("catalogo", catalogo);
      }
      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        return new Response(JSON.stringify({ error: "Erro ao excluir catálogo: " + deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ success: true, message: `Catálogo "${catalogo}" excluído` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma peça recebida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clear only the specific catalog if requested (replace mode)
    if (clearFirst && catalogo) {
      const { error: deleteError } = await supabase
        .from("parts")
        .delete()
        .eq("catalogo", catalogo);

      if (deleteError) {
        console.error("Error clearing catalog:", deleteError);
        return new Response(JSON.stringify({ error: "Erro ao limpar catálogo: " + deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log(`Catalog "${catalogo}" cleared successfully`);
    } else if (clearFirst && !catalogo) {
      // Legacy: clear all
      const { error: deleteError } = await supabase
        .from("parts")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) {
        console.error("Error clearing parts table:", deleteError);
        return new Response(JSON.stringify({ error: "Erro ao limpar tabela: " + deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < parts.length; i += batchSize) {
      const batch = parts.slice(i, i + batchSize).map((p: any) => ({
        fabricante: p.fabricante || "",
        codigo_peca: p.codigo_peca || "",
        descricao: p.descricao || "",
        chave_de_busca: p.chave_de_busca || "",
        marca_veiculo: p.marca_veiculo || "",
        modelo_veiculo: p.modelo_veiculo || "",
        anos_aplicacao: p.anos_aplicacao || "",
        contexto_ia: p.contexto_ia || "",
        catalogo: catalogo || null,
      }));

      const { error: insertError } = await supabase
        .from("parts")
        .insert(batch);

      if (insertError) {
        console.error(`Batch error at ${i}:`, insertError);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted, errors, total: parts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Import error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
