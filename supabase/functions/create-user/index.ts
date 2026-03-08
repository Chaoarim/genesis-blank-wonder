import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserPayload {
  email?: string;
  password?: string;
  full_name?: string;
  company_name?: string;
}

interface EnsureSellerResult {
  sellerUserId: string;
  error?: string;
}

async function ensureSellerLink(params: {
  supabaseAdmin: ReturnType<typeof createClient>;
  adminUserId: string;
  sellerAuthId: string;
  normalizedEmail: string;
  fullName: string;
  password: string;
}): Promise<EnsureSellerResult> {
  const { supabaseAdmin, adminUserId, sellerAuthId, normalizedEmail, fullName, password } = params;

  const { data: existingByAuth, error: byAuthError } = await supabaseAdmin
    .from("seller_users")
    .select("id, admin_user_id")
    .eq("seller_auth_id", sellerAuthId)
    .maybeSingle();

  if (byAuthError) {
    return { sellerUserId: "", error: "Falha ao validar vínculo por autenticação." };
  }

  if (existingByAuth && existingByAuth.admin_user_id !== adminUserId) {
    return {
      sellerUserId: "",
      error: "Este usuário já está vinculado a outro administrador.",
    };
  }

  const { data: existingByEmailRows, error: byEmailError } = await supabaseAdmin
    .from("seller_users")
    .select("id")
    .eq("admin_user_id", adminUserId)
    .ilike("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1);

  if (byEmailError) {
    return { sellerUserId: "", error: "Falha ao validar vendedor por email." };
  }

  const targetSellerId = existingByAuth?.id || existingByEmailRows?.[0]?.id;

  if (targetSellerId) {
    const { error: updateSellerError } = await supabaseAdmin
      .from("seller_users")
      .update({
      name: fullName,
        email: normalizedEmail,
        seller_auth_id: sellerAuthId,
        is_active: true,
      })
      .eq("id", targetSellerId);

    if (updateSellerError) {
      return { sellerUserId: "", error: "Falha ao atualizar vendedor existente." };
    }

    return { sellerUserId: targetSellerId };
  }

  const { data: createdSeller, error: createSellerError } = await supabaseAdmin
    .from("seller_users")
    .insert({
      admin_user_id: adminUserId,
      name: fullName,
      email: normalizedEmail,
      seller_auth_id: sellerAuthId,
      is_active: true,
    })
    .select("id")
    .single();

  if (createSellerError || !createdSeller?.id) {
    return { sellerUserId: "", error: "Falha ao criar vínculo do vendedor." };
  }

  return { sellerUserId: createdSeller.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem criar usuários." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json()) as CreateUserPayload;
    const email = body.email;
    const password = body.password;
    const fullName = body.full_name?.trim() || "Vendedor";

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company_name: body.company_name || "",
      },
    });

    let authUserId: string | null = null;

    if (createError) {
      if (createError.message.includes("already been registered")) {
        const {
          data: { users },
          error: listError,
        } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (listError) {
          return new Response(JSON.stringify({ error: "Erro ao buscar usuário existente" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const existingUser = users.find((u) => u.email?.toLowerCase() === normalizedEmail);

        if (!existingUser?.id) {
          return new Response(
            JSON.stringify({ error: "Email registrado mas não foi possível localizar o usuário." }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password,
        });

        if (updatePasswordError) {
          return new Response(
            JSON.stringify({ error: "Usuário encontrado, mas falhou ao atualizar a senha." }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        authUserId = existingUser.id;
      } else {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      authUserId = newUser.user?.id ?? null;
    }

    if (!authUserId) {
      return new Response(JSON.stringify({ error: "Conta criada sem ID de autenticação." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sellerLink = await ensureSellerLink({
      supabaseAdmin,
      adminUserId: caller.id,
      sellerAuthId: authUserId,
      normalizedEmail,
      fullName,
      password,
    });

    if (!sellerLink.sellerUserId) {
      return new Response(JSON.stringify({ error: sellerLink.error || "Erro ao vincular vendedor." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUserId,
        seller_user_id: sellerLink.sellerUserId,
        message: "Vendedor cadastrado/vinculado com sucesso",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in create-user function:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
