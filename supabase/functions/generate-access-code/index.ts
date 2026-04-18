import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = ["mauricio.chaparim@gmail.com", "consultapecasai@gmail.com"];

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verifica que o caller é admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Sessão expirada. Faça login novamente." }, 401);
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return json({ error: "Sessão inválida. Entre novamente no admin." }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    const userEmail = userData.user.email?.trim().toLowerCase() ?? "";
    const isAllowedAdminEmail = ADMIN_EMAILS.includes(userEmail);
    if (!roleRow && !isAllowedAdminEmail) {
      return json({ error: "Admin only" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "generate";

    if (action === "list") {
      const { data, error } = await admin
        .from("access_codes")
        .select("id,code,status,recovery_email,notes,created_at,last_login_at,revoked_at,is_admin")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return json({ codes: data ?? [] });
    }

    if (action === "revoke" || action === "reactivate") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return json({ error: "Código não informado" }, 400);

      const payload = action === "revoke"
        ? { status: "revoked", revoked_at: new Date().toISOString() }
        : { status: "active", revoked_at: null };

      const { error } = await admin.from("access_codes").update(payload).eq("id", id);
      if (error) throw error;

      return json({ success: true });
    }

    const recovery_email: string | null = body.recovery_email?.trim() || null;
    const notes: string | null = body.notes?.trim() || null;
    const is_admin: boolean = body.is_admin === true;

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
      is_admin,
      activated_at: new Date().toISOString(),
      created_by: userData.user.id,
    });
    if (insertErr) throw insertErr;

    if (is_admin) {
      await admin.from("user_roles").insert({
        user_id: created.user!.id,
        role: "admin",
      });
    }

     return json({ code, auth_user_id: created.user!.id });
  } catch (e) {
    console.error("generate-access-code error", e);
     return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
