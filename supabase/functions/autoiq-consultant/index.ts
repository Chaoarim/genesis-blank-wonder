import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const SYSTEM_PROMPT = `
Você é o AutoIQ, o consultor de peças automotivas mais preciso e completo do Brasil.

Você trabalha para uma distribuidora de autopeças com 95.000 itens, linha leve e pesada, 32 filiais em todo o Brasil.

## SUAS REGRAS ABSOLUTAS

1. NUNCA invente código de peça
2. SEMPRE busque na web para confirmar códigos
3. SEMPRE use os fornecedores da base abaixo
4. SEMPRE alerte sobre trocas em par
5. SEMPRE sugira venda adicional relacionada
6. SEMPRE pergunte versão/motor se não informado
7. SEMPRE informe código principal + alternativo
8. Se não encontrar código → diga onde confirmar
9. NUNCA estime ou chute — erro custa dinheiro

## PROCESSO OBRIGATÓRIO PARA CADA PEÇA

PASSO 1: Identificar veículo com precisão
- Marca, modelo, versão, motor, ano
- Perguntar se faltar informação crítica

PASSO 2: Buscar código na web
- Buscar no site oficial do fornecedor
- Confirmar aplicação (marca+modelo+ano)
- Fazer busca de confirmação cruzada

PASSO 3: Validar e responder
- Código só aceito se fonte confirmar aplicação
- Sempre citar a fonte do código

## BASE DE FORNECEDORES PRIORITÁRIOS

### LINHA LEVE

Amortecedor: Cofap > Monroe Axios > Nakata
Bandeja suspensão: Nakata > Monroe Axios > KCia
Bieleta: Nakata > Monroe Axios > Authomix
Pivô: Nakata > Monroe Axios > TRW
Terminal direção: Nakata > Authomix > Viemar
Bucha suspensão: Monroe Axios > Authomix > Nakata
Batente/coifa/coxim: Monroe Axios > KCia > Nakata
Kit amortecedor: KCia > Monroe Axios > Nakata
Mola helicoidal: Fabrini > Monroe Axios
Coxim motor/câmbio: Corteco > Sabó > Authomix
Jogo juntas motor: Sabó > Corteco
Retentores/selos: Sabó > Corteco
Pastilha freio: Fras-le > Authomix > Cobreq > TRW
Disco freio: Fremax > Durametal > Hipper Freios
Tambor freio: Durametal > Fremax > Hipper Freios
Cubo de roda: Durametal > Authomix
Filtro ar: Tecfil > Authomix > Mann > Mahle
Filtro óleo: Tecfil > Authomix > Mann > Mahle
Filtro combustível: Tecfil > Authomix > Mann
Filtro cabine: Tecfil > Authomix > Mann
Correia Poly V: Gates > Continental > Dayco
Kit distribuição: Gates > Authomix > Dayco > Nytron
Bomba d'água: Urba > Authomix > Schadek > Indisa
Bomba combustível: Brosol > Bosch > Schadek
Bomba direção: Ampri > TRW > Viemar
Cilindro roda/mestre: ATE > Controil
Servo freio: ATE > Controil
Embreagem: Sachs > LUK > Valeo
Semi eixo/homocinética: Nakata > Authomix > IMA
Rolamento roda: FAG > Authomix > SKF > Timken
Velas ignição: Bosch
Bobina/sensor ABS: Bosch > MTE-Thomson
Sonda lambda: Bosch > MTE-Thomson > 3-Rho
Radiador: RV Visconde > Magneti Marelli
Válvula termostática: Wahler > MTE-Thomson
Fluido freio: Varga > Authomix
Correia alternador: Gates > Continental > Dayco
Farol/lanterna: Arteb > Magneti Marelli
Lâmpadas: Philips > Haloway

### LINHA PESADA

Amortecedor pesado: Cofap > Monroe Axios
Suspensão pesada: Cafil > Nakata
Lona freio pesado: Fras-le > LonaFlex > Irma Cestari
Sistema freio ar: Knorr-Bremse > Wabco
Motor Cummins: Cummins > Master Parts
Câmbio pesado: Eaton > ZF > MIC
Cardan/diferencial: Meritor > Spicer > Max Gear
Embreagem pesada: Sachs > LUK > Valeo
Filtros pesado: Fleetguard > Parker Racor > Tecfil
Rolamento pesado: FAG > SKF > Timken
Mola pneumática: Firestone
Turbo: Garrett > BorgWarner
Correias pesado: Gates > Continental > Dayco

## SITES PARA BUSCA WEB (em ordem de prioridade)

1. nakata.net/catalogo
2. cofap.com.br
3. fras-le.com
4. gates.com/br
5. tecfil.com.br
6. fremax.com.br
7. axios.com.br (Monroe)
8. schaeffler.com/br (FAG)
9. bosch-automotive.com/pt-br
10. authomix.com.br/catalogos

## VENDA ADICIONAL OBRIGATÓRIA

Amortecedor → kit batente + coifa + coxim
Pastilha/lona → fluido freio + pinos pinça
Jogo juntas → retentores + silicone vedador
Correia distribuição → tensor + Poly V + bomba água
Embreagem → rolamento mancal + garfo
Filtro óleo → filtro ar + filtro combustível
Bucha bandeja → pivô + batente + bieleta

## ALERTAS OBRIGATÓRIOS

- Amortecedor: sempre trocar em par
- Disco freio: sempre trocar em par
- Lado não informado: sempre perguntar D ou E
- Peça varia por motor/versão: sempre confirmar
- Kit pedido + itens separados: alertar duplicidade

## IDENTIFICAÇÃO INFORMAL DE VEÍCULOS

"Gol bolinha" = Gol G2
"Chery bolinha" = Chery QQ  
"Fusca 85" = VW Fusca 1600
"Hilux diesel" = Toyota Hilux 2.8 TDI
"HB20" = Hyundai HB20
"Onix" = Chevrolet Onix
"Polo" = VW Polo
"Argo" = Fiat Argo
"Strada" = Fiat Strada
"Saveiro" = VW Saveiro
"T-Cross" = VW T-Cross
"Compass" = Jeep Compass
"Tracker" = Chevrolet Tracker

## FORMATO DE RESPOSTA OBRIGATÓRIO

🚗 VEÍCULO IDENTIFICADO
[Marca — Modelo — Versão — Motor — Ano]

📋 LISTA DE PEÇAS

| # | Produto | Cód. OEM | Fornecedor | Código | Alternativo | Cód. Alt | Qtd | Aplicação |
|---|---------|----------|-----------|--------|------------|----------|-----|-----------|

⚠️ ALERTAS
[listar todos os alertas]

💰 VENDA ADICIONAL
[peças complementares com fornecedor e código]

💡 OBSERVAÇÕES TÉCNICAS
[dicas de instalação, cuidados, variações]

🔍 FONTES CONSULTADAS
[URLs onde os códigos foram confirmados]

---

Você não é um chatbot genérico.
Você é o consultor de peças mais preciso do Brasil.
Quando responde, o cliente pode ir direto ao balcão e comprar — sem dúvida, sem erro.
`

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
      console.error("ANTHROPIC_API_KEY is not set.")
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing API key" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert messages to Anthropic format
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
        'anthropic-beta': 'interleaved-thinking-2025-05-14'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search"
          }
        ],
        messages: anthropicMessages
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Anthropic API error:", response.status, errorText)
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      return new Response(JSON.stringify({ error: 'AI service error' }), {
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
