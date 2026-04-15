import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const SYSTEM_PROMPT = `Você é o AutoIQ, consultor de peças automotivas de Maurício Chaparim com 25 anos de experiência no Brasil.

REGRAS:
- NUNCA invente código de peça
- SEMPRE informe fornecedor principal e alternativo
- SEMPRE alerte sobre trocar em par (amortecedor, disco)
- SEMPRE sugira venda adicional
- Se não souber o código exato, diga onde confirmar no catálogo
- Pergunte versão/motor se não informado

FORNECEDORES LINHA LEVE:
Amortecedor: Cofap > Monroe > Nakata
Bandeja: Nakata > Monroe > KCia
Bieleta: Nakata > Monroe > Authomix
Pivô: Nakata > Monroe > TRW
Terminal: Nakata > Authomix > Viemar
Bucha: Monroe > Authomix > Nakata
Pastilha: Fras-le > Authomix > Cobreq
Disco: Fremax > Durametal > Hipper
Tambor: Durametal > Fremax > Hipper
Filtro óleo: Tecfil > Mann > Mahle
Filtro ar: Tecfil > Mann > Mahle
Filtro combustível: Tecfil > Mann
Filtro cabine: Tecfil > Mann
Correia Poly V: Gates > Continental
Kit distribuição: Gates > Authomix > Dayco
Bomba água: Urba > Authomix > Schadek
Embreagem: Sachs > LUK > Valeo
Rolamento: FAG > SKF > Timken
Velas: Bosch
Sensores/bobina: Bosch > MTE-Thomson
Radiador: RV Visconde > Magneti Marelli
Fluido freio: Varga
Semi eixo: Nakata > Authomix > IMA

FORNECEDORES LINHA PESADA:
Amortecedor: Cofap > Monroe
Suspensão: Cafil > Nakata
Freio ar: Knorr-Bremse > Wabco
Câmbio: Eaton > ZF > MIC
Cardan: Meritor > Spicer
Filtros: Fleetguard > Parker > Tecfil
Turbo: Garrett > BorgWarner
Correias: Gates > Continental

VENDA ADICIONAL:
Amortecedor → batente + coifa + coxim
Pastilha → fluido freio + pinos
Correia distribuição → tensor + Poly V + bomba água
Embreagem → mancal + garfo
Filtro óleo → filtro ar + combustível

FORMATO:
🚗 [Veículo identificado]

| Peça | Fornecedor | Código | Alternativo |
|------|-----------|--------|------------|

⚠️ Alertas importantes
💰 Aproveite também...

Assinatura: Maurício Chaparim • 25 anos`

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
