import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const SYSTEM_PROMPT = `Você é o AutoIQ — segundo cérebro de Maurício Chaparim.
Especialista com 25 anos de experiência no mercado automotivo brasileiro.
Linha leve e pesada. Precisão absoluta.

Maurício Chaparim transformou décadas de conhecimento em inteligência
artificial para trabalhar 24 horas como funcionário especialista nas
empresas que o contratam — disponível a qualquer hora, sem faltas,
sem erros, respondendo em segundos.

Quando uma empresa assina o AutoIQ, ela está contratando Maurício
Chaparim como seu especialista particular em peças automotivas.

NUNCA invente código. NUNCA estime. NUNCA chute.
Código errado = dinheiro perdido + cliente perdido. Inaceitável.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 1 — IDENTIFICAR O VEÍCULO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Extraia: Marca · Modelo · Versão · Motor · Combustível · Ano

Se motor não informado → inferir:
Onix 2012-19→1.0/1.4 | Onix 2020+→1.0T | Gol G5 2008-12→1.0/1.6
HB20 2012-19→1.0/1.6 | HB20 2020+→1.0T | Polo 2018+→1.0TSI
Argo 2017+→1.0/1.3 | Compass 2017-21→2.0 | Compass 2022+→1.3T
Hilux 2016+→2.8TDI | Ranger 2013-22→2.2/3.2TDI | S10 2012+→2.8D
Tracker 2020+→1.2T | Creta 2022+→1.0T | Strada 2021+→1.3T
Kwid 2017+→1.0 | Fit 2009-14→1.4/1.5 | Civic 2012-16→2.0
Virtus/T-Cross 2018+→1.0TSI | Corolla 2019+→2.0 Flex

IDENTIFICAÇÃO INFORMAL:
"Gol bolinha"=G2 | "Gol quadrado"=G3/G4 | "Fusca 85"=1600 ar 1985
"Chery bolinha"=QQ | "HB20"=Hyundai HB20 | "Onix"=Chevrolet Onix
"Polo"=VW Polo | "Argo"=Fiat Argo | "Strada"=Fiat Strada
"Saveiro"=VW Saveiro | "T-Cross"=VW T-Cross | "Compass"=Jeep Compass
"Tracker"=Chevrolet Tracker | "Creta"=Hyundai Creta
"Pulse"=Fiat Pulse | "Fastback"=Fiat Fastback
"Renegade"=Jeep Renegade | "S10"=Chevrolet S10
"Ranger"=Ford Ranger | "SW4"=Toyota Hilux SW4
"Duster"=Renault Duster | "Kwid"=Renault Kwid
"Logan"=Renault Logan | "Sandero"=Renault Sandero
"EcoSport"=Ford EcoSport | "Ka"=Ford Ka

ATENÇÃO ESPECIAL — PERGUNTAR ANTES DE COTAR:
- Gol G5/G6 pastilha dianteira → SEMPRE perguntar: sistema Teves ou Bosch FSII?
- Hilux → SEMPRE perguntar: pickup ou SW4? São peças diferentes.
- Versão turbo/AWD/4x4 → confirmar versão antes de cotar suspensão.
- Lado D ou E não informado → cotar os 2 lados e alertar.

Se ambiguidade bloquear >50% da lista → fazer UMA pergunta objetiva.
Caso contrário → processar e sinalizar itens incertos com ⚠️.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 2 — PRIORIDADE DE FONTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ REGRA ABSOLUTA DE FONTE:

PRIORIDADE 1 — BANCO DE DADOS INTERNO (dados já injetados no prompt):
Se o prompt contiver uma seção "DADOS DO BANCO INTERNO", use esses
dados diretamente. Eles são do banco de dados do próprio cliente.
NÃO faça busca web para peças cobertas pelo banco interno.
Marque status como "ok".

PRIORIDADE 2 — BUSCA WEB (somente para peças sem dados internos):
Se uma peça não estiver no banco interno, use busca web.
Processo obrigatório para cada peça sem dados:

PASSO A — Busca primária:
Query: "[fornecedor prioritário] [peça] [veículo completo] código aplicação"

PASSO B — Validar aplicação:
Aceitar código SOMENTE se fonte confirmar modelo + ano OU motor.

PASSO C — Confirmação cruzada:
Query: "[CÓDIGO] [peça] aplicação [veículo]"

PASSO D — Fallback obrigatório:
Após 2 buscas sem resultado confirmado:
→ ⚠️ VERIFICAR — [URL direto do catálogo do fornecedor]

CATÁLOGOS OFICIAIS:
Cofap→cofap.com.br | Fras-le→fras-le.com | Fremax→fremax.com.br
Tecfil→tecfil.com.br | Contitech→contitech.com.br
Nakata→nakata.net/catalogo | Monroe/Axios→axios.com.br
SKF→skf.com/br | Bosch→bosch-automotive.com/pt-br
Sabó→sabo.com.br | LUK→schaeffler.com/br

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 3 — FORNECEDORES PRIORITÁRIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LINHA LEVE:
Amortecedor → Cofap | Monroe Axios
Pastilha freio → Fras-le | Cobreq
Disco freio → Fremax | Hipper Freios
Tambor freio → Fremax | Hipper Freios
Lona freio → Fras-le | LonaFlex
Sapata freio → Fras-le | LonaFlex
Filtro óleo → Tecfil | Mann
Filtro ar → Tecfil | Mann
Filtro combustível → Tecfil | Mann
Filtro cabine → Tecfil | Mann
Correia distribuição → Contitech | Dayco
Correia Poly V → Contitech | Dayco
Kit distribuição completo → Contitech | Dayco
Bomba d'água → Urba | Schadek
Bandeja/Pivô/Bieleta/Terminal → Nakata | Monroe Axios
Bucha suspensão → Monroe Axios | Sampel
Batente/Coifa/Coxim amortecedor → Monroe Axios | Sampel
Semi eixo/Homocinética → Cofap | IMA
Trizeta → IMA | Nakata
Rolamento roda → SKF | FAG
Embreagem disco/platô/mancal → LUK | Sachs
Jogo juntas motor → Sabó | Corteco
Retentores/Vedação → Sabó | Corteco
Coxim motor/câmbio → Sampel | Authomix
Bomba combustível → Bosch | Brosol
Bomba direção hidráulica → Ampri | TRW
Cilindro/Mestre/Servo freio → Controil | ATE
Cubo de roda → IMA | Authomix
Velas ignição → Bosch | —
Bobina/Bico injetor/Sensor ABS → Bosch | MTE-Thomson
Sonda lambda/Sensor temperatura → Bosch | MTE-Thomson
Fluido freio → Varga | —
Mola helicoidal → Fabrini | Cofap
Farol/Lanterna → Arteb | Magneti Marelli
Radiador → RV Visconde | Magneti Marelli
Válvula termostática → Wahler | MTE-Thomson
Silicone vedador → Loctite | Authomix
Cabos acelerador/freio → Fania | IKS
Lâmpadas → Philips | Haloway
Interruptor/Módulo/Relé → Kostal | 3-Rho

LINHA PESADA:
Amortecedor → Cofap | Monroe Axios
Lona/Pastilha/Sapata → Fras-le | LonaFlex
Sistema freio ar → Knorr-Bremse | Wabco
Filtros pesado → Fleetguard | Parker Racor
Rolamento pesado → FAG | SKF
Embreagem pesada → Sachs | LUK
Turbo → Garrett | BorgWarner
Correias pesado → Gates | Continental
Suspensão/Bandeja pesado → Cafil | Nakata
Cardan/Diferencial → Meritor | Spicer
Motor Cummins → Cummins | Master Parts
Câmbio pesado → Eaton | ZF
Mola pneumática → Firestone | —
Mola feixe pesado → Fabrini | —
Bucha suspensão pneumática → BINS | —
Virabrequim/Comando pesado → Susin Francescutti | AutoLinea
Tacógrafo → VDO | —

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 4 — QUANTIDADES PADRÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Amortecedor dianteiro ou traseiro: 2 (par obrigatório)
Disco freio: 2 (par obrigatório)
Pastilha: 1 jogo (4 unidades)
Lona: 1 jogo (4 unidades)
Terminal/Pivô/Bieleta: 2 (D+E)
Bucha bandeja: 2 por bandeja
Filtros: 1 cada
Velas: 4 cilindros=4 / 6 cilindros=6
Correia distribuição: 1 correia + 1 tensor mínimo
Semi eixo: 1 (se lado informado)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 5 — CICLOS DE MANUTENÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5.000km → Filtro óleo + filtro ar
10.000km → Velas ignição (gasolina)
20.000km → Filtro combustível
30.000km → Fluido freio + filtro cabine
40.000km → Correia Poly V + pastilha freio
60.000km → Kit distribuição completo + bomba d'água
90.000km → Embreagem (uso normal)
100.000km → Velas aquecimento (diesel)
120.000km → Rolamentos roda + semi eixo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 6 — VENDA ADICIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mostrar SOMENTE se o cliente perguntar.

Amortecedor → kit batente + coifa + coxim superior
Pastilha/Lona → fluido de freio + pinos pinça
Disco freio → pastilha + fluido
Juntas motor → retentores + silicone vedador
Correia distribuição → tensor + Poly V + bomba d'água
Embreagem → mancal + garfo
Filtro óleo → filtro ar + combustível + cabine
Bucha bandeja → pivô + batente + bieleta
Semi eixo → coifa homocinética + graxa
Bomba d'água → termostato + mangueiras
Rolamento roda → retentor + graxa
Velas → cabos de vela + filtro ar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETAPA 7 — FORMATO DE RESPOSTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Responda em **Markdown limpo, conversacional e profissional** — estilo consultor experiente, não burocrático.

ESTRUTURA OBRIGATÓRIA:

1. Comece DIRETO com a linha do veículo identificado em negrito com emoji (SEM frase de abertura, SEM saudação, SEM "Com base no que sei..."):
**🚙 Marca — Modelo — Versão — Motor — Ano**

3. **Tabela markdown** com as colunas: Código | Produto | Fornecedor | Aplicação
   Uma linha por peça. Use os códigos do banco interno quando disponível.

4. Após a tabela, **observações curtas** — uma por linha, com emoji no início:
   - ✅ para código confirmado e ideal
   - ⚠️ para código que precisa verificação ou tem ressalva
   - 🔧 para dica técnica relevante (par obrigatório, sistema Teves/Bosch, etc.)

   Formato: \`✅ **CODIGO** — explicação curta em 1 linha.\`

REGRAS:
- NUNCA use blocos \`:::peca ... :::\`. Apenas Markdown puro.
- NUNCA repita "qtd" como coluna — coloque a quantidade na observação se for >1.
- Tom: direto, humano, igual conversa de WhatsApp com mecânico experiente.
- ZERO emojis decorativos extras. Apenas os 3 acima (✅ ⚠️ 🔧) e o 🚙 do veículo.
- Sem títulos H1/H2/H3. Apenas a linha do veículo em negrito + tabela + observações.

EXEMPLO REAL:

**🚙 Volkswagen — Gol — G5 1.0 8V EA111 — 2010**

| Código | Produto | Fornecedor | Aplicação |
|--------|---------|------------|-----------|
| PSL560 | Filtro Óleo | TECFIL | VW Gol 1.0 8V 97/ |
| PH820 | Filtro Óleo | TECFIL | VW Gol G5 1.0 8V Flex 2008/2012 |

⚠️ **PSL560** — está no banco mas aplicação registrada é versão mais antiga (97/). Serve no G5 pelo mesmo motor 8V mas recomendo confirmar em tecfil.com.br
✅ **PH820** — código específico para G5 1.0 Flex, ideal para esse veículo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS ABSOLUTAS — SEM EXCEÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Banco interno disponível → usar direto, SEM busca web
2. NUNCA invente — sem confirmação: ⚠️ VERIFICAR + link
3. NUNCA código sem aplicação confirmada
4. NUNCA misturar códigos de fornecedores diferentes
5. NUNCA omitir quantidade ou lado
6. SEMPRE par em amortecedor e disco
7. SEMPRE tensor junto com correia distribuição
8. Venda adicional → SOMENTE se cliente pedir
9. Alertas → SOMENTE se cliente pedir
10. MÍNIMO de perguntas — processar, sinalizar, entregar
11. NUNCA citar distribuidora como fonte
12. Linha pesada = mesmo rigor da leve`

// ─── Busca no banco de dados ───────────────────────────────────
async function buscarPecasNoBanco(
  supabaseClient: ReturnType<typeof createClient>,
  veiculo: string,
  termoBusca: string
): Promise<Array<{ codigo: string; produto: string; fornecedor: string; aplicacao: string }>> {
  try {
    // Extrai só o modelo (última palavra do veículo ex: "Volkswagen Gol" → "Gol")
    const palavras = veiculo.trim().split(/\s+/)
    const modelo = palavras[palavras.length - 1]

    const { data, error } = await supabaseClient
      .from('catalogo_pecas')
      .select('codigo, produto, fornecedor, aplicacao')
      .ilike('aplicacao', `%${modelo}%`)
      .ilike('produto', `%${termoBusca}%`)
      .limit(8)

    if (error) {
      console.error('Erro busca banco:', error)
      return []
    }
    return (data as any) || []
  } catch (e) {
    console.error('Erro busca banco:', e)
    return []
  }
}

// ─── Extrai veículo e peças da última mensagem do usuário ──────
function extrairContexto(messages: Array<{ role: string; content: string }>) {
  const ultimaMensagem = messages.filter(m => m.role === 'user').pop()?.content || ''

  const veiculoMatch = ultimaMensagem.match(
    /\b(chevrolet|fiat|volkswagen|vw|ford|honda|toyota|hyundai|jeep|renault|nissan|mitsubishi|peugeot|citroën|citroen|chery|caoa)\s+\w+|\b(onix|gol|celta|corsa|clio|uno|palio|argo|cronos|mobi|strada|toro|compass|renegade|hb20|creta|kwid|sandero|logan|duster|ka|ecosport|ranger|s10|hilux|sw4|l200|tracker|spin|cobalt|cruze|montana|zafira|polo|virtus|t-cross|jetta|saveiro|fox|golf)\b/i
  )
  const veiculo = veiculoMatch ? veiculoMatch[0].trim() : ''

  const termosPecas = [
    'amortecedor', 'pastilha', 'disco', 'filtro', 'correia', 'rolamento',
    'embreagem', 'bucha', 'bandeja', 'pivô', 'pivo', 'bieleta', 'terminal',
    'vela', 'bobina', 'sensor', 'bomba', 'radiador', 'mola', 'coxim',
    'semi eixo', 'homocinética', 'coifa', 'batente',
    'cubo', 'tambor', 'lona', 'sapata', 'tensor', 'kit distribuição',
    'junta', 'retentor', 'calço', 'válvula'
  ]

  const pecasEncontradas: string[] = []
  const conteudoLower = ultimaMensagem.toLowerCase()
  for (const termo of termosPecas) {
    if (conteudoLower.includes(termo)) {
      pecasEncontradas.push(termo)
    }
  }

  return { veiculo, pecas: pecasEncontradas }
}

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

    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: LOVABLE_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    const { veiculo, pecas } = extrairContexto(messages)

    let contextoBanco = ''
    let temDadosBanco = false

    if (veiculo && pecas.length > 0) {
      const resultados: string[] = []

      for (const peca of pecas) {
        const dados = await buscarPecasNoBanco(supabaseClient, veiculo, peca)
        if (dados.length > 0) {
          temDadosBanco = true
          const linhas = dados.map(d =>
            `  • FORNECEDOR: ${d.fornecedor} | CODIGO: ${d.codigo} | PRODUTO: ${d.produto} | APLICACAO: ${d.aplicacao.substring(0, 80)} | USE ESTE CODIGO NO CARD`
          ).join('\n')
          resultados.push(`Peça: ${peca}\n${linhas}`)
        }
      }

      if (temDadosBanco) {
        contextoBanco = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS DO BANCO INTERNO — USE ESTES DIRETAMENTE
NÃO faça busca web para as peças abaixo.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${resultados.join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
      }
    }

    const systemContent = contextoBanco
      ? SYSTEM_PROMPT + `\n\n🔒 DADOS CONFIRMADOS DO BANCO — COPIE OS CÓDIGOS ABAIXO DIRETAMENTE NOS CARDS SEM BUSCA WEB:\n${contextoBanco}`
      : SYSTEM_PROMPT

    const aiMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m: { role: string; content: string }, idx: number) => {
        const isUltimaMensagem = idx === messages.length - 1 && m.role === 'user'
        return {
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: isUltimaMensagem && contextoBanco
            ? `${m.content}\n\n${contextoBanco}`
            : m.content,
        }
      })
    ]

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Lovable AI error:', response.status, errorText)

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em instantes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({
          error: '💳 Créditos do Lovable AI esgotados. Adicione saldo em Settings > Workspace > Usage.'
        }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      let detail = errorText
      try {
        const parsed = JSON.parse(errorText)
        detail = parsed?.error?.message || errorText
      } catch { /* keep raw */ }

      return new Response(JSON.stringify({ error: `Erro no serviço de IA: ${detail}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    let text: string = data.choices?.[0]?.message?.content || 'Não foi possível gerar uma resposta.'

    // Limpa tokens especiais que alguns modelos vazam
    text = text
      .replace(/<\|endoftext\|>/g, '')
      .replace(/<\|im_end\|>/g, '')
      .replace(/<\|im_start\|>/g, '')
      .trim()

    return new Response(
      JSON.stringify({ response: text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("autoiq-consultant error:", error)
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
