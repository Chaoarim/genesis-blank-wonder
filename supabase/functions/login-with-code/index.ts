import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalize(input: string): string {
  const clean = (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length !== 12) return "";
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const { code: rawCode } = await req.json();
    const code = normalize(rawCode || "");
    if (!code) {
      return new Response(JSON.stringify({ error: "Código inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: row, error } = await admin
      .from("access_codes")
      .select("code, status, auth_user_id")
      .eq("code", code)
      .maybeSingle();

    if (error) throw error;
    if (!row) {
      return new Response(JSON.stringify({ error: "Código não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.status !== "active") {
      return new Response(JSON.stringify({ error: "Código inativo ou revogado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fakeEmail = `code-${code.replace(/-/g, "").toLowerCase()}@partsai.internal`;
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
      email: fakeEmail, password: code,
    });
    if (signErr || !signIn.session) {
      return new Response(JSON.stringify({ error: "Falha ao autenticar com o código" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("access_codes").update({ last_login_at: new Date().toISOString() }).eq("code", code);

    return new Response(JSON.stringify({ session: signIn.session }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("login-with-code error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
