import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Simple in-memory rate limiting for admin operations
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_REQUESTS = 10; // Lower limit for admin simulation
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (entry.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }
  
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_REQUESTS - entry.count, resetIn: entry.resetAt - now };
}

// Allowed origins for CORS - prevents cross-origin attacks
const ALLOWED_ORIGINS = [
  "https://pecai.lovable.app",
  "https://id-preview--77876276-5b7b-4090-9486-3195b900ae5f.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith(".lovable.app")
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Eventos válidos para simulação
const VALID_EVENTS = [
  "compra aprovada",
  "assinatura renovada",
  "assinatura cancelada",
  "assinatura atrasada",
  "Pix gerado"
];

// Schema de validação
const SimulatePayloadSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  evento: z.string().max(100).refine(
    (val) => VALID_EVENTS.includes(val),
    { message: "Evento inválido" }
  )
});

// Mapeamento de eventos
const CANCEL_EVENTS = ["assinatura cancelada", "assinatura atrasada"];
const APPROVE_EVENTS = ["assinatura renovada", "compra aprovada"];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Validate origin for non-OPTIONS requests
  const origin = req.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.endsWith(".lovable.app"))) {
    return new Response(JSON.stringify({ error: "Origem não permitida" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verificar autenticação do usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Verificar se o usuário é admin usando o token do usuário
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se é admin
    const { data: isAdmin } = await userClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado - apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply rate limiting for admin operations
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        error: `Limite de requisições excedido. Tente novamente em ${Math.ceil(rateLimit.resetIn / 1000)} segundos.` 
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetIn / 1000)),
        },
      });
    }

    // Validar payload
    const body = await req.json();
    const parseResult = SimulatePayloadSchema.safeParse(body);
    
    if (!parseResult.success) {
      return new Response(JSON.stringify({ 
        error: "Dados inválidos", 
        details: parseResult.error.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, evento } = parseResult.data;

    // Usar service role para atualizar dados
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determinar ação baseada no evento
    let planoAplicado: string;
    let acaoAcesso: string;
    let status: 'active' | 'inactive' | 'pending';

    if (CANCEL_EVENTS.includes(evento)) {
      planoAplicado = "inativo";
      acaoAcesso = "cancelado";
      status = "inactive";
    } else if (APPROVE_EVENTS.includes(evento)) {
      planoAplicado = "mensal";
      acaoAcesso = "liberado";
      status = "active";
    } else {
      planoAplicado = "pendente";
      acaoAcesso = "aguardando";
      status = "pending";
    }

    // Atualizar assinatura (apenas se não for Pix gerado)
    if (acaoAcesso !== "aguardando") {
      const { error: updateError } = await supabase
        .rpc('update_subscription_by_email', {
          p_email: email,
          p_plan: planoAplicado,
          p_status: status
        });

      if (updateError) {
        console.error("Erro ao atualizar assinatura:", updateError);
      }
    }

    // Registrar log
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        email: email,
        evento_recebido: `[SIMULAÇÃO] ${evento}`,
        plano_aplicado: planoAplicado,
        acao_acesso: acaoAcesso,
        raw_payload: { simulated: true, admin_user_id: user.id, evento, email },
        processed: true
      });

    if (logError) {
      console.error("Erro ao registrar log:", logError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Acesso ${acaoAcesso} para simulação`,
      plano: planoAplicado,
      acao: acaoAcesso
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro na simulação:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
