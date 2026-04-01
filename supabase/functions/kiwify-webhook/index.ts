import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Fail-fast validation - ensure webhook token is configured at deployment
const WEBHOOK_TOKEN_RAW = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");
if (!WEBHOOK_TOKEN_RAW) {
  throw new Error("KIWIFY_WEBHOOK_TOKEN must be configured - webhook cannot start without security token");
}

// CORS: permite chamadas do painel Kiwify e da página /webhook-test no app
const ALLOWED_ORIGINS = [
  "https://novopecai.lovable.app",
  "https://id-preview--a7e34ad1-45d3-49a5-b584-70c3dc407fa0.lovable.app",
  "https://kiwify.com.br",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const isAllowedOrigin = !!origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".lovable.app") ||
    origin.endsWith(".lovableproject.com")
  );

  return {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-kiwify-signature, x-kiwify-token, x-webhook-token",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

// Tokens de segurança (pode ser 1 token ou uma lista separada por vírgula)
// Ex.: "tokenA" ou "tokenA,tokenB,tokenC"
const WEBHOOK_TOKENS = WEBHOOK_TOKEN_RAW
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

// Schema de validação para o payload do webhook
const CustomerSchema = z.object({ 
  email: z.string().email().max(255),
  id: z.string().max(100).optional()
}).passthrough();

const WebhookPayloadSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email muito longo").optional(),
  Customer: CustomerSchema.optional(),
  customer: CustomerSchema.optional(),
  buyer: CustomerSchema.optional(),
  Buyer: CustomerSchema.optional(),
  subscription: z.object({ customer: CustomerSchema.optional() }).passthrough().optional(),
  Subscription: z.object({ Customer: CustomerSchema.optional() }).passthrough().optional(),
  evento: z.string().max(100).optional(),
  event: z.string().max(100).optional(),
  order_status: z.string().max(100).optional(),
  subscription_status: z.string().max(100).optional(),
  status: z.string().max(100).optional(),
  webhook_event_type: z.string().max(100).optional(),
  type: z.string().max(100).optional(),
  produto: z.string().max(255).optional(),
  // Product pode vir como objeto com name opcional ou sem - aceitar ambos formatos
  product: z.object({ name: z.string().max(255).optional() }).passthrough().optional(),
  Product: z.object({ name: z.string().max(255).optional() }).passthrough().optional(),
  product_name: z.string().max(255).optional(),
  token: z.string().max(100).optional(),
  webhook_token: z.string().max(100).optional(),
  signature: z.string().max(500).optional(),
  api_key: z.string().max(100).optional(),
  customer_id: z.string().max(100).optional(),
  // Campos de timestamp para validação anti-replay
  timestamp: z.string().optional(),
  created_at: z.string().optional(),
  order_created_at: z.string().optional(),
  date: z.string().optional(),
  request_id: z.string().max(100).optional(),
  nonce: z.string().max(100).optional(),
}).passthrough();

// Máximo tempo permitido para replay (24 horas em ms - relaxado para testes)
const MAX_REQUEST_AGE_MS = 24 * 60 * 60 * 1000;

// Mapeamento de eventos para ações - inclui variações da Kiwify
const CANCEL_EVENTS = [
  "assinatura cancelada",
  "assinatura atrasada",
  "subscription_canceled",
  "subscription_late",
  "subscription.canceled",
  "subscription.late",
  "order.refunded",
  "order_refunded",
  "canceled",
  "late",
  "refund",
  "refunded",
  "chargeback",
  "dispute",
  "expired",
  "subscription_expired"
];

const APPROVE_EVENTS = [
  "assinatura renovada",
  "compra aprovada",
  "subscription_renewed",
  "subscription.renewed",
  "purchase_approved",
  "order_approved",
  "order.paid",
  "order_paid",
  "subscription.active",
  "subscription_active",
  "approved",
  "renewed",
  "paid",
  "completed",
  "order.completed",
  "order_completed",
  "payment_confirmed",
  "payment.confirmed"
];

// Limite de tamanho do payload (50KB)
const MAX_PAYLOAD_SIZE = 50 * 1024;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  console.log("=== WEBHOOK RECEBIDO ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  // Log de headers (sem expor dados sensíveis)
  const headerKeys = [];
  for (const [key] of req.headers.entries()) {
    headerKeys.push(key);
  }
  console.log("Headers presentes:", headerKeys.join(", "));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // GET para health check (útil para testar se o endpoint está ativo)
  if (req.method === "GET") {
    return new Response(JSON.stringify({ 
      status: "ok", 
      message: "Kiwify webhook endpoint está ativo",
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Apenas POST é permitido para processamento
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verificar tamanho do payload
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      console.error("Payload muito grande:", contentLength);
      return new Response(JSON.stringify({ error: "Payload muito grande" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    
    // Verificar tamanho do body real
    if (rawBody.length > MAX_PAYLOAD_SIZE) {
      console.error("Payload muito grande:", rawBody.length);
      return new Response(JSON.stringify({ error: "Payload muito grande" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error("JSON inválido");
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar schema do payload
    const parseResult = WebhookPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      console.error("Payload inválido:", parseResult.error.message);
      return new Response(JSON.stringify({ error: "Formato de payload inválido", details: parseResult.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validatedBody = parseResult.data;
    console.log("Webhook recebido - Payload validado:", JSON.stringify(validatedBody).substring(0, 500));

    // Extrair dados do webhook (suporta múltiplos formatos da Kiwify)
    const url = new URL(req.url);

    const extractedEmail = validatedBody.email || 
                  validatedBody.Customer?.email || 
                  validatedBody.customer?.email ||
                  validatedBody.buyer?.email ||
                  validatedBody.Buyer?.email ||
                  validatedBody.subscription?.customer?.email ||
                  validatedBody.Subscription?.Customer?.email;

    const email = extractedEmail?.trim().toLowerCase();

                  
    const evento = validatedBody.evento || 
                   validatedBody.event || 
                   validatedBody.order_status || 
                   validatedBody.subscription_status ||
                   validatedBody.status ||
                   validatedBody.webhook_event_type ||
                   validatedBody.type;
                   
    const produto = validatedBody.produto || 
                    validatedBody.product?.name || 
                    validatedBody.Product?.name ||
                    validatedBody.product_name;

    // Token pode vir no body, headers (server-to-server) ou querystring (fallback)
    const tokenFromHeaders =
      req.headers.get("x-kiwify-signature") ||
      req.headers.get("x-kiwify-token") ||
      req.headers.get("x-webhook-token");

    const authHeader = req.headers.get("authorization");
    const tokenFromAuthorization =
      authHeader && authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : null;

    const tokenFromQuery =
      url.searchParams.get("token") ||
      // A Kiwify costuma enviar o token na URL como `?signature=...`
      url.searchParams.get("signature") ||
      url.searchParams.get("webhook_token") ||
      undefined;

    const token =
      validatedBody.token ||
      validatedBody.webhook_token ||
      validatedBody.signature ||
      validatedBody.api_key ||
      tokenFromHeaders ||
      tokenFromAuthorization ||
      tokenFromQuery ||
      undefined;
                  
    const kiwifyCustomerId = validatedBody.customer_id || 
                              validatedBody.Customer?.id ||
                              validatedBody.customer?.id ||
                              validatedBody.buyer?.id;

    console.log("Dados extraídos - Email:", email ? "presente" : "ausente", "Evento:", evento ? "presente" : "ausente");

    // Verificar se o token do ambiente está configurado
    if (WEBHOOK_TOKENS.length === 0) {
      console.error("KIWIFY_WEBHOOK_TOKEN não configurado no ambiente");
      return new Response(JSON.stringify({ error: "Configuração de segurança inválida" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validação de segurança - token OBRIGATÓRIO
    if (!token) {
      console.error("Token não fornecido na requisição");
      return new Response(JSON.stringify({ error: "Token de autenticação obrigatório" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!WEBHOOK_TOKENS.includes(token)) {
      console.error("Token inválido recebido");
      return new Response(JSON.stringify({ error: "Não autorizado - token inválido" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validação de timestamp anti-replay
    const timestampStr = validatedBody.timestamp || 
                          validatedBody.created_at || 
                          validatedBody.order_created_at ||
                          validatedBody.date;
    
    if (timestampStr) {
      const requestTime = new Date(timestampStr).getTime();
      const now = Date.now();
      
      if (!isNaN(requestTime) && Math.abs(now - requestTime) > MAX_REQUEST_AGE_MS) {
        console.error("Requisição expirada - timestamp muito antigo:", timestampStr);
        return new Response(JSON.stringify({ error: "Requisição expirada" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Validar campos obrigatórios
    if (!email) {
      console.error("Email não fornecido");
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!evento) {
      console.error("Evento não fornecido");
      return new Response(JSON.stringify({ error: "Evento é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Normalizar evento para comparação
    const eventoNormalizado = evento.toLowerCase().trim();

    // Determinar ação baseada no evento
    let planoAplicado: string;
    let acaoAcesso: string;
    let status: 'active' | 'inactive' | 'pending';

    if (CANCEL_EVENTS.some(e => eventoNormalizado.includes(e.toLowerCase()))) {
      // Cancelar acesso
      planoAplicado = "inativo";
      acaoAcesso = "cancelado";
      status = "inactive";
    } else if (APPROVE_EVENTS.some(e => eventoNormalizado.includes(e.toLowerCase()))) {
      // Liberar acesso
      planoAplicado = "mensal";
      acaoAcesso = "liberado";
      status = "active";
    } else if (eventoNormalizado.includes("pix") && (eventoNormalizado.includes("gerado") || eventoNormalizado.includes("generated") || eventoNormalizado.includes("created"))) {
      // Pix gerado - apenas registrar, não alterar acesso
      planoAplicado = "pendente";
      acaoAcesso = "aguardando";
      status = "pending";
    } else if (eventoNormalizado.includes("waiting") || eventoNormalizado.includes("pending") || eventoNormalizado.includes("aguardando")) {
      // Aguardando pagamento
      planoAplicado = "pendente";
      acaoAcesso = "aguardando";
      status = "pending";
    } else {
      // Evento desconhecido - registrar mas NÃO alterar status existente
      console.log("Evento não mapeado (ignorando alteração de status):", evento);
      planoAplicado = "desconhecido";
      acaoAcesso = "nenhuma";
      status = "inactive";
    }

    // Atualizar assinatura do usuário (apenas se não for Pix gerado ou evento desconhecido)
    if (acaoAcesso !== "aguardando" && acaoAcesso !== "nenhuma") {
      const { data: updateData, error: updateError } = await supabase
        .rpc('update_subscription_by_email', {
          p_email: email,
          p_plan: planoAplicado,
          p_status: status
        });

      if (updateError) {
        console.error("Erro ao atualizar assinatura:", updateError);
        // Não falhar - continuar para registrar o log
      } else {
        console.log("Assinatura atualizada (por email):", updateData);

        // Se não havia registro para esse email, criar um novo (compra antes do cadastro)
        if (updateData === false) {
          console.log("Nenhum registro encontrado para o email - criando assinatura pendente...");

          // Buscar user_id via tabela profiles (caso já tenha conta)
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', email)
            .maybeSingle();

          if (profileError) {
            console.error("Erro ao buscar profile por email:", profileError);
          }

          const userId = profileData?.user_id || null;
          const nowIso = new Date().toISOString();
          const startedAt = status === 'active' ? nowIso : null;

          if (userId) {
            // Usuário existe, criar/atualizar assinatura com user_id
            const { data: existingSub } = await supabase
              .from('user_subscriptions')
              .select('id')
              .eq('user_id', userId)
              .maybeSingle();

            if (existingSub) {
              // Atualizar assinatura existente
              const { error: updError } = await supabase
                .from('user_subscriptions')
                .update({
                  plan: planoAplicado,
                  status,
                  updated_at: nowIso,
                  started_at: startedAt ?? undefined,
                })
                .eq('user_id', userId);

              if (updError) {
                console.error("Erro ao atualizar assinatura por user_id:", updError);
              } else {
                console.log("Assinatura atualizada por user_id:", userId);
              }
            } else {
              // Criar nova assinatura
              const { error: insertError } = await supabase
                .from('user_subscriptions')
                .insert({
                  user_id: userId,
                  email,
                  plan: planoAplicado,
                  status,
                  started_at: startedAt,
                });

              if (insertError) {
                console.error("Erro ao inserir assinatura para usuário:", insertError);
              } else {
                console.log("Assinatura criada para usuário existente:", userId);
              }
            }
          } else {
            // COMPRA ANTES DO CADASTRO: criar assinatura SEM user_id
            // Quando o usuário criar a conta, o trigger vai vincular automaticamente
            const { error: insertError } = await supabase
              .from('user_subscriptions')
              .insert({
                user_id: null, // Será preenchido quando criar a conta
                email,
                plan: planoAplicado,
                status,
                started_at: startedAt,
              });

            if (insertError) {
              console.error("Erro ao criar assinatura pré-cadastro:", insertError);
            } else {
              console.log("Assinatura pré-cadastro criada para email:", email);
            }
          }
        }
      }

      // Atualizar kiwify_customer_id se fornecido
      if (kiwifyCustomerId && typeof kiwifyCustomerId === 'string') {
        await supabase
          .from('user_subscriptions')
          .update({ kiwify_customer_id: kiwifyCustomerId.substring(0, 100) })
          .eq('email', email);
      }
    }


    // Sanitize raw_payload to remove sensitive data before storage
    function sanitizePayloadForStorage(payload: Record<string, unknown>): Record<string, unknown> {
      const safe: Record<string, unknown> = {};
      
      // Only store non-sensitive operational data
      safe.event_type = payload.evento || payload.event || payload.order_status || payload.type;
      safe.timestamp = payload.timestamp || payload.created_at || new Date().toISOString();
      safe.product_name = typeof payload.produto === 'string' ? payload.produto : 
                          (payload.product as Record<string, unknown>)?.name;
      
      // Mask email for privacy (keep domain visible)
      const rawEmail = payload.email || 
                       (payload.Customer as Record<string, unknown>)?.email ||
                       (payload.customer as Record<string, unknown>)?.email;
      if (typeof rawEmail === 'string' && rawEmail.includes('@')) {
        const [local, domain] = rawEmail.split('@');
        safe.masked_email = `${local.substring(0, 2)}***@${domain}`;
      }
      
      // Store request metadata without sensitive customer data
      safe.has_customer_id = !!(payload.customer_id || 
                               (payload.Customer as Record<string, unknown>)?.id);
      safe.processed_at = new Date().toISOString();
      
      return safe;
    }

    // Registrar log do webhook (sanitizar dados antes de inserir)
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        email: email.substring(0, 255),
        evento_recebido: evento.substring(0, 100),
        plano_aplicado: planoAplicado.substring(0, 50),
        acao_acesso: acaoAcesso.substring(0, 50),
        raw_payload: sanitizePayloadForStorage(validatedBody),
        processed: true
      });

    if (logError) {
      console.error("Erro ao registrar log:", logError);
    }

    console.log(`Webhook processado: email presente - ${evento} - ${acaoAcesso}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Acesso ${acaoAcesso}`,
      plano: planoAplicado,
      acao: acaoAcesso
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro no webhook:", error);
    return new Response(JSON.stringify({ 
      error: "Erro interno do servidor"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
