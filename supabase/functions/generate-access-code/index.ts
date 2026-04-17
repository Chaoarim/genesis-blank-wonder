import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verifica que o caller é admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const recovery_email: string | null = body.recovery_email?.trim() || null;
    const notes: string | null = body.notes?.trim() || null;

    // Gera código único
    const { data: codeData, error: codeErr } = await admin.rpc("generate_unique_access_code");
    if (codeErr || !codeData) throw codeErr || new Error("code gen failed");
    const code = codeData as string;

    // Cria usuário no Supabase Auth (email interno fake + senha = código)
    const fakeEmail = `code-${code.replace(/-/g, "").toLowerCase()}@partsai.internal`;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: fakeEmail,
      password: code,
      email_confirm: true,
      user_metadata: { access_code: code, recovery_email },
    });
    if (createErr) throw createErr;

    // Insere registro na tabela
    const { error: insertErr } = await admin.from("access_codes").insert({
      code,
      status: "active",
      auth_user_id: created.user!.id,
      recovery_email,
      notes,
      activated_at: new Date().toISOString(),
      created_by: userData.user.id,
    });
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ code, auth_user_id: created.user!.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-access-code error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
