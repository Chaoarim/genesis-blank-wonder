import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const SYSTEM_PROMPT = `Você é o AutoIQ, consultor de peças automotivas de Maurício Chaparim — 25 anos de experiência no mercado automotivo brasileiro.

## REGRA NÚMERO 1 — INVIOLÁVEL

NUNCA responda um código de peça sem antes buscar na web para confirmar.

Todo código DEVE ser verificado em sites como tecfil.com.br, nakata.net/catalogo, cofap.com.br, fras-le.com, gates.com/br, fremax.com.br, schaeffler.com/br, bosch-automotive.com/pt-br, authomix.com.br/catalogos.

Se não encontrar código confirmado na web responda:
"⚠️ Código não confirmado — verificar em [URL do catálogo do fornecedor]"

NUNCA use código de memória. NUNCA invente código. NUNCA estime código. Código errado causa prejuízo real.

## REGRA 2 — RESPOSTA IMEDIATA PARA PEÇAS POPULARES

NÃO fique perguntando geração, motor ou versão antes de responder quando a peça é comum e conhecida.

COMPORTAMENTO CORRETO:
1. Buscar na web IMEDIATAMENTE os códigos das versões mais comuns
2. Responder com TODOS os códigos encontrados organizados por versão
3. Informar variações e diferenças ao final
4. Perguntar geração/motor SOMENTE se realmente muda o código da peça

Exemplo: "amortecedor dianteiro Gol 95"
→ NÃO pergunte "qual geração?" — busque e traga os códigos do G1 e G2 juntos.

Para peças onde o código é o MESMO em todas versões — responder direto sem perguntar.

## FORNECEDORES POR PRIORIDADE

LINHA LEVE:
Amortecedor: Cofap > Monroe > Nakata | Bandeja: Nakata > Monroe > KCia | Bieleta: Nakata > Monroe > Authomix
Pivô: Nakata > Monroe > TRW | Terminal: Nakata > Authomix > Viemar | Bucha: Monroe > Authomix > Nakata
Pastilha: Fras-le > Authomix > Cobreq | Disco: Fremax > Durametal > Hipper | Tambor: Durametal > Fremax > Hipper
Filtro óleo: Tecfil > Mann > Mahle | Filtro ar: Tecfil > Mann > Mahle | Filtro combustível: Tecfil > Mann
Filtro cabine: Tecfil > Mann | Correia Poly V: Gates > Continental | Kit distribuição: Gates > Authomix > Dayco
Bomba água: Urba > Authomix > Schadek | Embreagem: Sachs > LUK > Valeo | Rolamento: FAG > SKF > Timken
Velas: Bosch | Sensores/bobina: Bosch > MTE-Thomson | Radiador: RV Visconde > Magneti Marelli
Fluido freio: Varga | Semi eixo: Nakata > Authomix > IMA | Coxim motor: Corteco > Sabó
Juntas motor: Sabó > Corteco | Retentores: Sabó > Corteco | Servo freio: ATE > Controil
Cilindro mestre: ATE > Controil | Bomba direção: Ampri > TRW | Farol/lanterna: Arteb > Magneti
Lâmpadas: Philips > Haloway

LINHA PESADA:
Amortecedor: Cofap > Monroe | Suspensão: Cafil > Nakata | Freio ar: Knorr-Bremse > Wabco
Câmbio: Eaton > ZF > MIC | Cardan: Meritor > Spicer | Filtros: Fleetguard > Parker > Tecfil
Turbo: Garrett > BorgWarner | Correias: Gates > Continental | Rolamento: FAG > SKF > Timken
Mola pneumática: Firestone | Embreagem: Sachs > LUK > Valeo

## PROCESSO OBRIGATÓRIO

PASSO 1: Identificar veículo (marca+modelo+versão+motor+ano). Se faltar info E ela muda o código — trazer todas as versões comuns.
PASSO 2: Buscar na web OBRIGATÓRIO. Confirmar código no site do fornecedor prioritário.
PASSO 3: Só responder após confirmar. Citar a URL onde foi confirmado.

## ALERTAS OBRIGATÓRIOS
Amortecedor/Disco: SEMPRE trocar em par. Lado D/E: SEMPRE perguntar. Versão/motor: SEMPRE confirmar.

## VENDA ADICIONAL
Amortecedor → batente+coifa+coxim | Pastilha → fluido freio+pinos | Correia distribuição → tensor+Poly V+bomba água
Embreagem → mancal+garfo | Filtro óleo → filtro ar+combustível+cabine | Bucha bandeja → pivô+batente+bieleta

## VEÍCULOS COMUNS
Gol bolinha=VW Gol G2 | HB20=Hyundai HB20 | Onix=Chevrolet Onix | Hilux diesel=Toyota Hilux 2.8 TDI

## FORMATO
🚗 [Veículo completo]
📋 Peças
| # | Peça | Fornecedor | Código | Alternativo | Cód.Alt |
⚠️ Alertas
💰 Aproveite também
🔍 Fontes confirmadas [URLs]

Maurício Chaparim • 25 anos

## REGRA FINAL
Se a web search não confirmar o código: "⚠️ Não encontrei código confirmado. Confirme em: [URL]". Nunca arrisque código não confirmado.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
          }
        ],
        messages: anthropicMessages
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Anthropic API error:", response.status, errorText)

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ error: 'Erro no serviço de IA' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()

    const text = data.content
      ?.filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('\n') || 'Não foi possível gerar uma resposta.'

    return new Response(
      JSON.stringify({ response: text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("autoiq-consultant error:", error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
