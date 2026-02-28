import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check, Zap, Database, Search, MessageSquare, Shield, ArrowRight, Settings,
  Globe, Users, Wrench, Car, Clock, TrendingUp, BarChart3, Package,
  ChevronRight, Star, BookOpen, ShoppingCart, Target, Cpu, Layers
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Sales = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState(23);

  useEffect(() => {
    const randomSpots = Math.floor(Math.random() * 17) + 12;
    setSpotsLeft(randomSpots);

    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.log('Admin check failed');
      }
    };
    checkAdmin();

    const interval = setInterval(() => {
      setSpotsLeft(prev => (prev > 8 ? prev - 1 : prev));
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const segments = [
    { icon: Package, title: "Loja de Auto Peças", desc: "Consulte peças, cruze referências de fabricantes e atenda seu cliente com rapidez e precisão." },
    { icon: Car, title: "Auto Center", desc: "Encontre a peça certa para cada serviço. Agilize orçamentos e reduza o tempo de espera do cliente." },
    { icon: Wrench, title: "Oficina Mecânica", desc: "Identifique peças por veículo, modelo e ano. Evite erros de compra e devoluções desnecessárias." },
  ];

  const features = [
    { icon: Search, title: "Busca Inteligente", desc: "Pesquise por código, descrição, veículo ou fabricante. O motor de busca entende o que você precisa." },
    { icon: Database, title: "Catálogo Completo", desc: "Base com milhares de peças de múltiplos fornecedores, organizada e sempre atualizada." },
    { icon: BookOpen, title: "Catálogos por Fornecedor", desc: "Navegue pelo portfólio de cada fornecedor em uma interface visual e intuitiva." },
    { icon: MessageSquare, title: "Chat com IA", desc: "Converse com nossa IA para encontrar peças, verificar aplicações e tirar dúvidas técnicas." },
    { icon: Cpu, title: "Motor de Busca Avançado", desc: "Filtra por lateralidade, modelo de veículo e tipo de produto com precisão cirúrgica." },
    { icon: Globe, title: "Pesquisa Visual Web", desc: "Visualize imagens reais das peças direto do Google para confirmar antes de comprar." },
  ];

  const workflow = [
    { step: "01", title: "Pesquise", desc: "Digite o código, nome da peça ou veículo no buscador inteligente.", icon: Search },
    { step: "02", title: "Compare", desc: "Veja resultados de múltiplos fornecedores com detalhes de aplicação.", icon: Layers },
    { step: "03", title: "Consulte a IA", desc: "Use o chat para dúvidas técnicas, cruzamento de referências e aplicações.", icon: MessageSquare },
    { step: "04", title: "Venda", desc: "Monte orçamentos, gerencie estoque e feche vendas com confiança.", icon: ShoppingCart },
  ];

  const testimonials = [
    { name: "Ricardo M.", role: "Dono de Auto Peças — SP", text: "Reduzi o tempo de consulta de 5 minutos para 10 segundos. Meus vendedores atendem o dobro de clientes agora.", stars: 5 },
    { name: "Carla S.", role: "Gerente de Auto Center — MG", text: "A busca por veículo é sensacional. O mecânico fala o carro e a gente acha a peça na hora, sem erro.", stars: 5 },
    { name: "João P.", role: "Oficina Mecânica — RJ", text: "O chat com IA me salvou várias vezes. Pergunto a aplicação e ele responde certinho, melhor que ficar ligando pra distribuidora.", stars: 5 },
  ];

  const benefits = [
    "Consulta inteligente de peças por código ou descrição",
    "Base de dados com milhares de peças de fabricantes",
    "Chat com IA para dúvidas técnicas e cruzamento",
    "Catálogos visuais por fornecedor",
    "Pesquisa visual de imagens integrada",
    "Central de Vendas com estoque e orçamentos",
    "Suporte dedicado via WhatsApp",
    "Atualizações constantes da base de dados",
  ];

  const stats = [
    { value: "50k+", label: "Peças Cadastradas" },
    { value: "<1s", label: "Tempo de Busca" },
    { value: "30+", label: "Fornecedores" },
    { value: "24/7", label: "Disponível Sempre" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg" style={{ boxShadow: 'var(--shadow-glow)' }}>
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold leading-none">ConsultaParts AI</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Inteligência para Auto Peças</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-1.5 hidden sm:flex">
                  <Settings className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/pre-cadastro">
              <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5">
                Começar Agora
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 md:py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'var(--gradient-hero)' }} />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

        <div className="container mx-auto text-center max-w-5xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            A Revolução na Consulta de Peças Automotivas
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]">
            Encontre qualquer peça{" "}
            <br className="hidden md:block" />
            automotiva em{" "}
            <span className="text-gradient">segundos</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Plataforma com inteligência artificial para lojas de auto peças, auto centers e oficinas mecânicas.
            Consulte códigos, fabricantes e aplicações com rapidez e precisão.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link to="/pre-cadastro">
              <Button size="lg" className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2 w-full sm:w-auto">
                Começar Agora — R$ 20/mês
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button size="lg" variant="outline" className="text-lg px-8 py-7 gap-2 w-full sm:w-auto">
                Como Funciona
                <ChevronRight className="w-5 h-5" />
              </Button>
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Sem contrato</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Cancele quando quiser</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Suporte incluso</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segmentos */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Feito para quem vive o{" "}
              <span className="text-gradient">setor automotivo</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Seja loja de balcão, auto center ou oficina — a ConsultaParts AI se adapta ao seu fluxo de trabalho.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {segments.map((seg, i) => (
              <Card key={i} className="p-8 glass-card hover:border-primary/50 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <seg.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{seg.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{seg.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ferramentas poderosas para seu negócio
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tudo que você precisa para consultar, vender e gerenciar peças automotivas em um só lugar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Card key={i} className="p-6 glass-card hover:border-primary/40 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Como funciona na prática
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Em 4 passos simples, você transforma a forma como consulta e vende peças.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {workflow.map((w, i) => (
              <div key={i} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <w.icon className="w-7 h-7 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">Passo {w.step}</span>
                <h3 className="font-bold text-lg mt-1 mb-2">{w.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{w.desc}</p>
                {i < workflow.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-primary/30 absolute top-8 -right-3 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios Detalhados */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Pare de perder tempo com{" "}
                <span className="text-gradient">consultas manuais</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Enquanto seus concorrentes ainda ligam para distribuidoras e folheiam catálogos em PDF,
                você consulta qualquer peça em segundos com inteligência artificial.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Clock, title: "Economia de Tempo", desc: "De 5 minutos para 10 segundos por consulta. Multiplique isso por 50 atendimentos/dia." },
                  { icon: Target, title: "Precisão nas Compras", desc: "Reduza devoluções e erros. A IA cruza código, aplicação e fornecedor automaticamente." },
                  { icon: TrendingUp, title: "Mais Vendas", desc: "Atenda mais clientes no mesmo tempo. Velocidade no balcão é sinônimo de faturamento." },
                  { icon: BarChart3, title: "Gestão Integrada", desc: "Estoque, vendas, orçamentos e clientes em um único painel inteligente." },
                ].map((b, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <b.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold mb-0.5">{b.title}</h4>
                      <p className="text-sm text-muted-foreground">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Card className="p-6 glass-card border-primary/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium text-primary">Simulação de Busca</span>
                </div>
                <div className="space-y-3 font-mono text-sm">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <span className="text-muted-foreground">Buscar:</span>{" "}
                    <span className="text-foreground">"pastilha freio gol g5"</span>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-semibold">SYL-1234</span>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">FRAS-LE</span>
                    </div>
                    <p className="text-foreground text-xs">Pastilha de Freio Dianteira</p>
                    <p className="text-muted-foreground text-xs">VW Gol G5/G6 · Voyage · Fox · 2008→</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-semibold">PD-789</span>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">COBREQ</span>
                    </div>
                    <p className="text-foreground text-xs">Pastilha de Freio Dianteira</p>
                    <p className="text-muted-foreground text-xs">VW Gol G5 · Saveiro · 2009→</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">3 resultados em 0.2s</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Quem usa, recomenda
            </h2>
            <p className="text-muted-foreground text-lg">
              Veja o que profissionais do setor automotivo estão falando.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="p-6 glass-card">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-foreground mb-4 leading-relaxed italic">"{t.text}"</p>
                <div>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Investimento que se paga no{" "}
              <span className="text-gradient">primeiro dia</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Quanto custa 10 minutos perdidos por consulta × 50 atendimentos/dia?
              Com a ConsultaParts AI, você recupera esse tempo por menos de R$ 1/dia.
            </p>
          </div>

          <Card className="max-w-lg mx-auto p-8 glass-card border-primary/50 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
              MAIS POPULAR
            </div>

            <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-4 mb-6 text-primary-foreground">
              <p className="text-xs uppercase tracking-wide font-semibold mb-1 text-center">⚡ Oferta para Primeiros Clientes</p>
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-lg line-through opacity-70">R$ 47,00</span>
                <span className="text-4xl font-bold">R$ 20,00</span>
                <span className="text-sm opacity-80">/mês</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-primary-foreground/15 rounded-full py-1.5 px-4">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Restam apenas <strong>{spotsLeft}</strong> vagas neste preço!
                </span>
              </div>
            </div>

            <h3 className="text-2xl font-bold mb-1">Plano Profissional</h3>
            <p className="text-muted-foreground mb-6">Acesso completo a todas as ferramentas</p>

            <ul className="space-y-2.5 mb-8">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>

            <Link to="/pre-cadastro" className="block">
              <Button className="w-full text-lg py-6 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2">
                Fazer Pré-Cadastro
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Ativação em até 24h · Sem contrato · Cancele quando quiser
            </p>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Perguntas Frequentes
          </h2>

          <div className="space-y-4">
            {[
              { q: "Preciso instalar algum programa?", a: "Não! A ConsultaParts AI funciona 100% no navegador, no celular ou computador. Basta acessar o site e fazer login." },
              { q: "A base de dados é atualizada?", a: "Sim! Atualizamos constantemente com novos fornecedores, fabricantes e peças. Você sempre terá acesso aos dados mais recentes." },
              { q: "Posso usar no celular?", a: "Sim! A plataforma é totalmente responsiva e funciona perfeitamente em smartphones e tablets." },
              { q: "Como funciona o chat com IA?", a: "Você digita sua dúvida (ex: 'qual pastilha serve no Gol G5?') e nossa IA consulta a base para dar a resposta mais precisa possível." },
              { q: "Posso cancelar a qualquer momento?", a: "Sim! Não há contrato de fidelidade. Você pode cancelar quando quiser, sem multas ou taxas." },
              { q: "Serve para qualquer tipo de veículo?", a: "Nosso foco principal é veículos nacionais e importados populares. A base cobre a grande maioria dos veículos do mercado brasileiro." },
            ].map((faq, i) => (
              <Card key={i} className="p-5 glass-card">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs text-primary font-bold">?</span>
                  </span>
                  {faq.q}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed pl-8">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-card/30 border-t border-border/50">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para revolucionar suas consultas?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Junte-se a profissionais de auto peças, auto centers e oficinas que já economizam horas por dia com a ConsultaParts AI.
          </p>
          <Link to="/pre-cadastro">
            <Button size="lg" className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2">
              Começar Agora
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            R$ 20/mês · Sem contrato · Ativação em até 24h
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold">ConsultaParts AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 ConsultaParts AI. Todos os direitos reservados. Criado por Mauricio Chaparim.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Sales;
