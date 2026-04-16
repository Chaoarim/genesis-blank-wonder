import { useState } from "react";

const faqs = [
  {
    q: "O AutoIQ inventa códigos de peças?",
    a: "Nunca. É regra absoluta: todo código é buscado na web em tempo real antes de responder. Se não encontrar confirmação, informa com alerta ⚠️ VERIFICAR e indica o catálogo oficial do fornecedor.",
  },
  {
    q: "Funciona para caminhão e ônibus também?",
    a: "Sim. O AutoIQ cobre linha pesada com o mesmo nível de precisão que a linha leve — incluindo Cummins, Eaton, Meritor, Knorr-Bremse, Wabco e mais de 30 fornecedores mapeados.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Sem contrato de fidelidade. Você cancela quando quiser diretamente na sua conta, sem burocracia.",
  },
  {
    q: "Quantos usuários por assinatura?",
    a: "A assinatura é por login individual. Para equipes ou múltiplos usuários, entre em contato para condições especiais.",
  },
];

const features = [
  { icon: "🔍", title: "Códigos verificados na web", desc: "Nunca usa código de memória. Busca nos catálogos oficiais em tempo real antes de responder." },
  { icon: "📋", title: "Lista pronta para o balcão", desc: "Fornecedor, código, quantidade e lado. O cliente vai direto comprar — sem dúvida, sem erro." },
  { icon: "🚛", title: "Linha leve e pesada", desc: "Do Gol ao caminhão Cummins. Mesmo nível de precisão para qualquer veículo do mercado brasileiro." },
  { icon: "💰", title: "Sugestão de venda adicional", desc: "Para cada peça, sugere complementos que aumentam o ticket médio da venda." },
  { icon: "⚠️", title: "Alertas de instalação", desc: "Troca em par, confirmação de lado, variação por versão. Evita devolução e retrabalho." },
  { icon: "📅", title: "Plano de manutenção", desc: "Ciclos de 5.000 a 120.000 km com todas as peças que precisam ser verificadas." },
];

export default function Sales() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubscribe = () => {
    window.open("https://pay.kiwify.com.br/mOT3bbr", "_blank");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* NAV */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border bg-background sticky top-0 z-50">
        <div className="flex items-center gap-2.5 font-medium text-base">
          <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center text-white text-sm">⚡</div>
          AutoIQ
        </div>
        <div className="flex items-center gap-3">
          <a href="/login" className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors">
            Entrar
          </a>
          <button
            onClick={handleSubscribe}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Assinar R$49,00
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="text-center px-6 pt-16 pb-12 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-1.5 rounded-full text-xs font-medium mb-7">
          ⚡ Consultor de Peças IA 24h
        </div>
        <h1 className="text-4xl md:text-5xl font-medium leading-tight tracking-tight mb-5">
          O segundo cérebro de{" "}
          <span className="text-amber-600">Maurício Chaparim</span>
          <br />trabalhando por você
        </h1>
        <p className="text-muted-foreground text-base max-w-lg mx-auto mb-8 leading-relaxed">
          25 anos de experiência em peças automotivas transformados em IA. Códigos certos, fornecedores certos, sem erro — disponível 24h por dia.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={handleSubscribe}
            className="bg-amber-600 hover:bg-amber-700 text-white px-7 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Assinar por R$49/mês →
          </button>
          <a
            href="/autoiq"
            className="bg-background border border-border hover:bg-muted text-foreground px-7 py-3 rounded-xl text-sm transition-colors"
          >
            Ver como funciona
          </a>
        </div>
        <div className="flex gap-6 justify-center mt-7 flex-wrap">
          {["Linha leve e pesada", "Busca web em tempo real", "Sem código inventado", "Disponível 24h"].map((item) => (
            <span key={item} className="text-muted-foreground text-xs flex items-center gap-1.5">
              <span className="text-amber-600 font-semibold">✓</span> {item}
            </span>
          ))}
        </div>
      </section>

      {/* DEMO CHAT */}
      <div className="max-w-xl mx-auto mb-16 px-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-muted px-4 py-2.5 flex items-center gap-2 border-b border-border">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="flex-1 text-center text-xs text-muted-foreground">⚡ AutoIQ — Consultor em ação</span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {/* User message */}
            <div className="flex flex-row-reverse gap-2.5">
              <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">EU</div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 text-sm max-w-xs">
                Preciso de amortecedor + kit suspensão para Gol G4 1.0 2008
              </div>
            </div>
            {/* AI message */}
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center text-xs text-white flex-shrink-0">⚡</div>
              <div className="bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm max-w-sm">
                <p className="font-medium mb-2">🚗 VW Gol G4 — 1.0 8V — 2008</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1 px-1.5 text-amber-600 font-medium">Peça</th>
                      <th className="text-left py-1 px-1.5 text-amber-600 font-medium">Fornecedor</th>
                      <th className="text-left py-1 px-1.5 text-amber-600 font-medium">Código</th>
                      <th className="text-left py-1 px-1.5 text-amber-600 font-medium">Qtd</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ["Amortecedor Diant.", "Cofap", "GP30742", "2x"],
                      ["Amortecedor Tras.", "Cofap", "GP30743", "2x"],
                      ["Bandeja Inf. Diant.", "Nakata", "NJ71843", "2x"],
                      ["Pivô Suspensão", "Nakata", "NJ15084", "2x"],
                    ].map(([peca, forn, cod, qtd]) => (
                      <tr key={cod} className="border-b border-border/50">
                        <td className="py-1 px-1.5 text-foreground">{peca}</td>
                        <td className="py-1 px-1.5">{forn}</td>
                        <td className="py-1 px-1.5">{cod}</td>
                        <td className="py-1 px-1.5">{qtd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-1.5 flex-wrap mt-2.5">
                  <span className="bg-amber-50 text-amber-700 border border-amber-100 rounded px-2 py-0.5 text-xs">⚠️ Trocar amortecedores sempre em par</span>
                  <span className="bg-amber-50 text-amber-700 border border-amber-100 rounded px-2 py-0.5 text-xs">💰 Sugestão: Kit batente + coifa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* FEATURES */}
      <section className="px-6 py-14 max-w-5xl mx-auto">
        <p className="text-amber-600 text-xs font-medium tracking-widest uppercase mb-3">O que você recebe</p>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-3">
          Tudo que um especialista sabe,<br />disponível em <span className="text-amber-600">segundos</span>
        </h2>
        <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
          Sem precisar ligar, esperar ou depender de ninguém. O AutoIQ responde como Maurício Chaparim responderia.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {features.map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-5 hover:border-border/80 transition-colors">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-lg mb-4">{f.icon}</div>
              <h3 className="font-medium text-sm mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-border" />

      {/* ABOUT */}
      <section className="px-6 py-14 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-600 mx-auto mb-3 flex items-center justify-center text-white text-2xl font-medium">MC</div>
            <p className="font-medium text-sm mb-0.5">Maurício Chaparim</p>
            <p className="text-muted-foreground text-xs mb-4">Especialista em Peças Automotivas</p>
            <div className="flex gap-4 justify-center">
              {[["25+", "anos mercado"], ["100%", "precisão"], ["24h", "disponível"]].map(([n, l]) => (
                <div key={l} className="text-center">
                  <div className="text-xl font-medium text-amber-600">{n}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="text-amber-600 text-xs font-medium tracking-widest uppercase mb-3">Quem está por trás</p>
            <h2 className="text-2xl md:text-3xl font-medium tracking-tight mb-4 leading-tight">
              Conhecimento real.<br /><span className="text-amber-600">Resultado garantido.</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-3">
              Maurício Chaparim transformou 25 anos de experiência no mercado automotivo brasileiro em inteligência artificial. Quando você assina o AutoIQ, está contratando Maurício como seu especialista particular.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Sem invenção. Sem estimativa. Sem chute. Código errado custa dinheiro — e isso é inaceitável.
            </p>
            <ul className="flex flex-col gap-2.5">
              {[
                "Especialista em linha leve e pesada",
                "Reconhecido nacionalmente no mercado de autopeças",
                "60+ fornecedores mapeados e priorizados",
                "Busca na web antes de cada resposta",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-amber-600 font-semibold flex-shrink-0 mt-0.5">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* PRICING */}
      <section className="px-6 py-14 max-w-5xl mx-auto">
        <div className="text-center mb-2">
          <p className="text-amber-600 text-xs font-medium tracking-widest uppercase mb-3">Plano único</p>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight">
            Simples. Direto. <span className="text-amber-600">Sem surpresa.</span>
          </h2>
        </div>
        <div className="max-w-sm mx-auto mt-10">
          <div className="bg-card border-2 border-amber-600 rounded-2xl p-8 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs font-medium px-4 py-1 rounded-full">
              Mais popular
            </div>
            <p className="text-amber-600 text-xs font-medium tracking-widest uppercase mb-2">AutoIQ Mensal</p>
            <div className="text-5xl font-medium tracking-tight mb-1">
              <sup className="text-xl align-super mr-1 font-normal">R$</sup>49
              <sub className="text-sm text-muted-foreground font-normal">/mês</sub>
            </div>
            <p className="text-muted-foreground text-xs mb-6">Cancele quando quiser. Sem contrato de fidelidade.</p>
            <ul className="text-left flex flex-col gap-2.5 mb-6">
              {[
                "Consultor IA ilimitado 24h por dia",
                "Linha leve e pesada completa",
                "Busca de código em tempo real",
                "Sugestão de venda adicional automática",
                "Alertas de instalação incluídos",
                "Plano de manutenção por quilometragem",
                "Atualizações automáticas inclusas",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-amber-600 font-semibold flex-shrink-0">✓</span> {item}
                </li>
              ))}
            </ul>
            <button
              onClick={handleSubscribe}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3.5 rounded-xl text-sm font-medium transition-colors mb-3"
            >
              Assinar agora →
            </button>
            <p className="text-muted-foreground text-xs">🔒 Pagamento seguro · Cancele a qualquer momento</p>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      {/* FAQ */}
      <section className="px-6 py-14 max-w-5xl mx-auto">
        <p className="text-amber-600 text-xs font-medium tracking-widest uppercase mb-3">Dúvidas</p>
        <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-8">
          Perguntas <span className="text-amber-600">frequentes</span>
        </h2>
        <div className="max-w-2xl flex flex-col gap-2.5">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-left hover:text-amber-600 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {faq.q}
                <span className="w-5 h-5 border border-border rounded-full flex items-center justify-center text-muted-foreground text-sm flex-shrink-0 ml-4 transition-transform" style={{ transform: openFaq === i ? "rotate(45deg)" : "none" }}>
                  +
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <div className="max-w-5xl mx-auto px-6 mb-16">
        <div className="bg-card border border-border rounded-2xl px-8 py-14 text-center">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
            Pronto para ter o especialista<br />trabalhando por <span className="text-amber-600">você?</span>
          </h2>
          <p className="text-muted-foreground text-sm mb-7 max-w-sm mx-auto leading-relaxed">
            Assine agora e tenha Maurício Chaparim como seu consultor particular de peças automotivas — 24 horas por dia.
          </p>
          <button
            onClick={handleSubscribe}
            className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3.5 rounded-xl text-sm font-medium transition-colors"
          >
            Assinar por R$49/mês →
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-border px-8 py-5 text-center text-muted-foreground text-xs">
        ⚡ AutoIQ · Consultor de Peças IA 24h · Conhecimento técnico: Maurício Chaparim
      </footer>

    </div>
  );
}
