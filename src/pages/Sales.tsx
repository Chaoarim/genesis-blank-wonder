import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check, Zap, Database, Search, MessageSquare, Shield, ArrowRight, Settings,
  Globe, Users, Wrench, Car, Clock, TrendingUp, BarChart3, Package,
  ChevronRight, Star, BookOpen, ShoppingCart, Target, Layers, Percent,
  PlusCircle, History, Link2, ImageIcon, FileSpreadsheet, Smartphone, Receipt,
  CreditCard, Truck, ScanLine, Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Sales = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [spotsLeft, setSpotsLeft] = useState(23);

  useEffect(() => {
    const randomSpots = Math.floor(Math.random() * 17) + 12;
    setSpotsLeft(randomSpots);

    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg" style={{ boxShadow: 'var(--shadow-glow)' }}>
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold leading-none">ConsultaParts AI</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Sistema Completo para Auto Peças</p>
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
                Começar
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HERO */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'var(--gradient-hero)' }} />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

        <div className="container mx-auto text-center max-w-5xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Plataforma Completa para o Setor Automotivo
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]">
            Encontre a peça certa{" "}
            <br className="hidden md:block" />
            pela <span className="text-gradient">placa do veículo</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Digite a placa, identifique o veículo automaticamente e encontre peças compatíveis em segundos.
            Consulta por placa, por veículo, por código e busca geral — tudo integrado com catálogo B2B online,
            central de vendas com 21 módulos e controle total do seu negócio.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link to="/pre-cadastro">
              <Button size="lg" className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2 w-full sm:w-auto">
                Começar Agora — R$ 14,99/mês
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#beneficios">
              <Button size="lg" variant="outline" className="text-lg px-8 py-7 gap-2 w-full sm:w-auto">
                Ver Benefícios
                <ChevronRight className="w-5 h-5" />
              </Button>
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Sem contrato</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Acesso completo</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Suporte WhatsApp</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* NÚMEROS / PROVA SOCIAL */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-12 px-4 border-y border-border/50 bg-card/30">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "4", label: "Modos de Busca", sub: "Placa · Veículo · Código · Geral" },
              { value: "61+", label: "Veículos Catalogados", sub: "Gol, Onix, HB20, Hilux..." },
              { value: "45+", label: "Fornecedores", sub: "FRAS-LE, NAKATA, COFAP..." },
              { value: "21", label: "Módulos de Gestão", sub: "Vendas, estoque, CRM..." },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-3xl md:text-4xl font-bold text-primary">{s.value}</p>
                <p className="text-sm font-semibold mt-1">{s.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* BENEFÍCIO PRINCIPAL: CONSULTA POR PLACA */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="beneficios" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <ScanLine className="w-3.5 h-3.5" />
                DESTAQUE
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Consulta por Placa do Veículo
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                O cliente chegou com o carro? Digite a placa e pronto. O sistema consulta o Detran,
                identifica marca, modelo, motor e combustível automaticamente — e já mostra
                todas as peças compatíveis. Sem perguntas, sem erros.
              </p>

              <div className="space-y-4">
                {[
                  { icon: ScanLine, title: "Identificação automática", desc: "Digite a placa e o sistema retorna marca, modelo, motor (1.0, 1.4, 1.6...), ano e combustível (flex, gasolina, diesel)." },
                  { icon: Search, title: "Busca integrada de peças", desc: "Após identificar o veículo, pesquise pastilha, filtro, amortecedor ou qualquer peça — os resultados já filtram pelo modelo correto." },
                  { icon: Clock, title: "De 5 minutos para 10 segundos", desc: "Sem ligar para distribuidora, sem consultar catálogo físico. O balcão fica mais ágil e o cliente sai satisfeito." },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{f.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulação visual da tela de placa */}
            <Card className="p-6 glass-card border-primary/20">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                <Search className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold flex-1">Consulta de Peças</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">partsai.online/buscar-pecas</span>
              </div>

              {/* Tabs simuladas */}
              <div className="grid grid-cols-4 gap-1 bg-muted/50 rounded-lg p-1 mb-4">
                {["PLACA", "VEÍCULO", "CÓDIGO", "GERAL"].map((tab, i) => (
                  <div key={tab} className={`text-center py-1.5 rounded text-[10px] font-semibold ${i === 0 ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>
                    {tab}
                  </div>
                ))}
              </div>

              {/* Input de placa simulado */}
              <div className="flex flex-col items-center py-4 mb-4">
                <div className="relative">
                  <div className="bg-muted/50 border-2 border-primary/30 rounded-lg px-6 py-3 text-center">
                    <span className="text-2xl font-bold tracking-widest text-foreground">ABC1D23</span>
                  </div>
                  <div className="absolute top-1 right-2 w-5 h-3 bg-blue-700 rounded-sm flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white">BR</span>
                  </div>
                </div>
              </div>

              {/* Veículo identificado */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3">
                <p className="text-[10px] font-bold uppercase text-primary opacity-80">Veículo Identificado:</p>
                <p className="text-sm font-bold text-primary">VOLKSWAGEN GOL</p>
                <p className="text-[10px] text-primary/70 flex gap-3 mt-0.5">
                  <span>Ano: 2019</span>
                  <span>Motor: 1.0</span>
                  <span>Flex</span>
                </p>
              </div>

              {/* Resultados */}
              <div className="space-y-1.5">
                {[
                  { code: "PD-4521", name: "Pastilha de Freio Dianteira", supplier: "FRAS-LE" },
                  { code: "FO-1234", name: "Filtro de Óleo", supplier: "TECFIL" },
                  { code: "AM-7890", name: "Amortecedor Dianteiro", supplier: "COFAP" },
                ].map((item, i) => (
                  <div key={i} className="bg-card/80 rounded p-2 border border-border/50 flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-muted/50 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-primary font-mono text-[10px] font-semibold">{item.code}</span>
                        <span className="text-[8px] px-1 py-0.5 bg-primary/10 text-primary rounded">{item.supplier}</span>
                      </div>
                      <p className="text-[10px] text-foreground">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 4 MODOS DE BUSCA */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <Search className="w-3.5 h-3.5" />
              BUSCA AVANÇADA
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              4 formas de encontrar a peça certa
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Não importa o que o cliente tem em mãos — placa, nome do carro, código da peça ou descrição — o sistema encontra.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: ScanLine,
                title: "Por Placa",
                desc: "Digite a placa, o sistema identifica o veículo via Detran e mostra peças compatíveis automaticamente.",
                highlight: "Mais rápido"
              },
              {
                icon: Car,
                title: "Por Veículo",
                desc: "Selecione entre 61+ modelos catalogados (Gol, Onix, HB20, Hilux, Civic...) e navegue pelas peças.",
                highlight: "61+ modelos"
              },
              {
                icon: Database,
                title: "Por Código",
                desc: "Pesquise pelo código do fabricante ou código similar. Ideal para quem já sabe a referência exata.",
                highlight: "Código exato"
              },
              {
                icon: Search,
                title: "Busca Geral",
                desc: "Pesquisa livre por nome, marca, descrição, aplicação. O motor entende lateralidade e filtra com precisão.",
                highlight: "Busca livre"
              },
            ].map((mode, i) => (
              <Card key={i} className="p-6 glass-card hover:border-primary/40 transition-all group relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{mode.highlight}</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <mode.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{mode.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{mode.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CATÁLOGO B2B ONLINE */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <Globe className="w-3.5 h-3.5" />
                VENDA MAIS
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Seu estoque vendendo{" "}
                <span className="text-gradient">24 horas por dia</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Com o Catálogo B2B Online, seus clientes acessam seu estoque pelo celular,
                pesquisam por código ou nome, veem preços atualizados e fazem pedidos —
                sem precisar ligar, sem WhatsApp, sem espera. Você recebe o pedido pronto.
              </p>

              <div className="space-y-4 mb-6">
                {[
                  { icon: Link2, title: "Link exclusivo para sua loja", desc: "Compartilhe por WhatsApp, Instagram ou imprima em cartão de visita. Ex: partsai.online/catalogo/sua-loja" },
                  { icon: ShoppingCart, title: "Carrinho de compras completo", desc: "Seu cliente seleciona itens, escolhe quantidade e envia o pedido com nome e telefone." },
                  { icon: Eye, title: "Estoque em tempo real", desc: "Preços com markup de revenda aplicado automaticamente. Itens esgotados ficam marcados." },
                  { icon: Users, title: "Cadastro de clientes B2B", desc: "Seus clientes criam login próprio e acessam condições especiais, promoções e histórico." },
                  { icon: Smartphone, title: "100% mobile", desc: "Interface otimizada para celular. Seu cliente faz pedido na obra, na oficina, onde estiver." },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{f.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="p-6 glass-card border-primary/20">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold">Auto Peças Silva</span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'hsl(var(--success))' }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'hsl(var(--success))' }} />
                  Online 24h
                </span>
              </div>

              {/* Busca simulada */}
              <div className="bg-muted/50 rounded-lg p-2.5 flex items-center gap-2 mb-4">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Buscar no catálogo...</span>
              </div>

              {/* Filtros de marca */}
              <div className="flex gap-1.5 mb-4 overflow-hidden">
                {["Todas", "FRAS-LE", "NAKATA", "COFAP", "URBA"].map((brand, i) => (
                  <span key={brand} className={`text-[10px] px-2 py-1 rounded-full border shrink-0 ${i === 0 ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                    {brand}
                  </span>
                ))}
              </div>

              <div className="space-y-2">
                {[
                  { code: "AM-3456", name: "Amortecedor Dianteiro", price: "R$ 189,90", stock: 8, sold: "🔥 150 vendidos" },
                  { code: "PF-1234", name: "Pastilha de Freio", price: "R$ 79,90", stock: 24, sold: "" },
                  { code: "CR-7890", name: "Correia Dentada", price: "R$ 45,00", stock: 15, sold: "" },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-primary font-semibold">{item.code}</p>
                      <p className="text-xs text-foreground">{item.name}</p>
                      {item.sold && <p className="text-[10px] text-muted-foreground">{item.sold}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{item.price}</p>
                      <p className="text-[10px] text-muted-foreground">Estoque: {item.stock}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between bg-primary/5 rounded-lg p-3 border border-primary/10">
                <span className="text-xs text-muted-foreground">🛒 Carrinho: 3 itens</span>
                <span className="text-sm font-bold text-primary">R$ 314,80</span>
              </div>
              <div className="mt-2 text-center">
                <span className="text-[10px] text-muted-foreground">Enviar pedido via WhatsApp →</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PARA QUEM É */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 px-4 border-y border-border/50 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Feito para quem vive o{" "}
              <span className="text-gradient">setor automotivo</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Cada recurso resolve problemas reais do dia a dia.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Package,
                title: "Loja de Auto Peças",
                desc: "Consulte por placa, código ou descrição. Gerencie estoque, venda com markup e compartilhe seu catálogo B2B.",
                highlights: ["Consulta por placa do veículo", "Catálogo B2B 24h online", "Importação de planilhas"]
              },
              {
                icon: Car,
                title: "Auto Center",
                desc: "O mecânico fala o carro e você acha a peça na hora. Filtro por veículo, modelo, motor e ano — sem erro.",
                highlights: ["61+ veículos catalogados", "Orçamentos instantâneos", "Gestão de clientes (CRM)"]
              },
              {
                icon: Wrench,
                title: "Oficina Mecânica",
                desc: "Cruze referências de fabricantes, encontre similares e descubra qual peça serve. Sem devoluções por erro.",
                highlights: ["Busca por código similar", "Cruzamento de referências", "4 modos de busca"]
              },
            ].map((seg, i) => (
              <Card key={i} className="p-7 glass-card hover:border-primary/40 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <seg.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">{seg.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{seg.desc}</p>
                <ul className="space-y-1.5">
                  {seg.highlights.map((h, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CENTRAL DE VENDAS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              GESTÃO COMPLETA
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Central de Vendas com 21 Módulos
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Tudo que sua loja precisa em um só lugar: vendas, clientes, estoque, comercial, equipe e financeiro.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: BarChart3,
                title: 'Principal',
                items: ['Dashboard com faturamento', 'Nova Venda (Estoque + Catálogo Global)', 'Pedidos B2B integrados', 'Histórico completo', 'Guia Como Usar'],
              },
              {
                icon: Users,
                title: 'Clientes',
                items: ['CRM completo', 'Carteira por vendedor', 'Aprovação de crédito'],
              },
              {
                icon: Package,
                title: 'Estoque',
                items: ['Consulta de estoque', 'Alerta de estoque baixo', 'Importar planilhas Excel/CSV', 'Cadastro manual de produto', 'Upload de fotos em lote'],
              },
              {
                icon: Percent,
                title: 'Comercial',
                items: ['Markup configurável', 'Promoções com cronômetro', 'Cupons de desconto', 'Prazos de pagamento', 'Alertas de recompra', 'Contatos de fornecedores'],
              },
              {
                icon: Target,
                title: 'Equipe',
                items: ['Metas por loja e vendedor', 'Gestão de vendedores', 'Comissões automáticas', 'Relatórios de performance'],
              },
              {
                icon: Receipt,
                title: 'Financeiro',
                items: ['Garantias e devoluções', 'Contas a pagar', 'Controle de recebimentos'],
              },
            ].map((group, i) => (
              <Card key={i} className="p-5 glass-card hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <group.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="font-bold text-sm">{group.title}</h4>
                </div>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-xs text-muted-foreground flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* DIFERENCIAIS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Por que a ConsultaParts é{" "}
              <span className="text-gradient">diferente</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                emoji: "⚡",
                title: "Consulta por Placa = Velocidade",
                desc: "Enquanto o concorrente liga para distribuidora, você já digitou a placa, identificou o veículo e encontrou a peça. Cada segundo conta no balcão."
              },
              {
                emoji: "🌐",
                title: "Catálogo B2B = Vendas 24h",
                desc: "Seu estoque vende sozinho. Clientes acessam pelo celular, pesquisam, montam pedido e enviam — de madrugada, fim de semana, feriado."
              },
              {
                emoji: "🧠",
                title: "Feito para Auto Peças",
                desc: "Não é ferramenta genérica. O sistema entende lateralidade (dianteiro/traseiro), modelos, anos, fabricantes e aplicações do universo automotivo."
              },
              {
                emoji: "📊",
                title: "Gestão sem Complicação",
                desc: "Estoque, vendas, clientes e metas em um lugar. Importe planilhas, acompanhe faturamento, controle comissões. Sem softwares pesados ou mensalidades caras."
              },
            ].map((b, i) => (
              <Card key={i} className="p-7 glass-card hover:border-primary/40 transition-all">
                <div className="text-4xl mb-3">{b.emoji}</div>
                <h3 className="text-lg font-bold mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* DEPOIMENTOS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Quem usa, recomenda
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Ricardo M.", role: "Auto Peças — SP", text: "A consulta por placa mudou tudo. O cliente chega, digito a placa e já sei exatamente quais peças servem. Reduzi erros de compra a quase zero." },
              { name: "Carla S.", role: "Auto Center — MG", text: "O catálogo B2B foi o melhor investimento. Meus clientes fazem pedido pelo celular a qualquer hora. Acordo com pedidos prontos todo dia." },
              { name: "João P.", role: "Oficina Mecânica — RJ", text: "Antes eu perdia 5 minutos por consulta. Agora com a busca por veículo e por placa, encontro a peça certa em segundos." },
            ].map((t, i) => (
              <Card key={i} className="p-6 glass-card">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PRICING */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Tudo isso por menos de{" "}
              <span className="text-gradient">R$ 2 por dia</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Quanto você perde por dia com consultas lentas e erros de compra? A ConsultaParts se paga no primeiro atendimento.
            </p>
          </div>

          <Card className="max-w-lg mx-auto p-8 glass-card border-primary/50 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
              ACESSO COMPLETO
            </div>

            <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-4 mb-6 text-primary-foreground">
              <p className="text-xs uppercase tracking-wide font-semibold mb-1 text-center">⚡ Preço Especial de Lançamento</p>
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-lg line-through opacity-70">R$ 49,00</span>
                <span className="text-4xl font-bold">R$ 14,99</span>
                <span className="text-sm opacity-80">/mês</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-primary-foreground/15 rounded-full py-1.5 px-4">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Restam <strong>{spotsLeft}</strong> vagas neste preço!
                </span>
              </div>
            </div>

            <h3 className="text-xl font-bold mb-1">Plano Profissional</h3>
            <p className="text-sm text-muted-foreground mb-5">Todos os módulos inclusos</p>

            <ul className="space-y-2 mb-8">
              {[
                "Consulta por placa — identifica veículo automaticamente",
                "4 modos de busca (placa, veículo, código, geral)",
                "Catálogos por Veículo — 61+ modelos",
                "Catálogos por Fornecedor — 45+ fornecedores",
                "Catálogo B2B online com link exclusivo",
                "Central de Vendas completa (21 módulos)",
                "Controle de estoque com importação de planilhas",
                "Upload de fotos em lote por código",
                "Gestão de clientes (CRM) e carteira",
                "Markup configurável (distribuidor/revenda)",
                "Promoções, cupons e prazos de pagamento",
                "Comissões, metas e relatórios de equipe",
                "Garantias, devoluções e contas a pagar",
                "Suporte via WhatsApp",
              ].map((b, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <div className="w-4.5 h-4.5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FAQ */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Perguntas Frequentes
          </h2>

          <div className="space-y-3">
            {[
              { q: "Como funciona a consulta por placa?", a: "Você digita a placa do veículo e o sistema consulta o Detran em tempo real. Em segundos retorna marca, modelo, motor (1.0, 1.4, 1.6...), ano e combustível. A partir daí, você pesquisa peças que já vêm filtradas para aquele veículo." },
              { q: "Preciso instalar algum programa?", a: "Não! Funciona 100% no navegador, no celular ou computador. Basta acessar partsai.online e fazer login." },
              { q: "O que é o Catálogo B2B Online?", a: "É uma loja virtual do seu estoque com link exclusivo. Seus clientes acessam pelo celular, pesquisam peças, veem preços e fazem pedidos — sem precisar ligar. Funciona 24 horas." },
              { q: "Quais são os 4 modos de busca?", a: "1) Por Placa — identifica o veículo automaticamente. 2) Por Veículo — 61+ modelos catalogados. 3) Por Código — busca por referência do fabricante ou similar. 4) Geral — pesquisa livre por nome, marca ou aplicação." },
              { q: "Posso importar meu estoque de uma planilha?", a: "Sim! O sistema aceita arquivos Excel e CSV. Ele reconhece variações de cabeçalho e formatos de moeda brasileira automaticamente." },
              { q: "Quantos módulos tem a Central de Vendas?", a: "São 21 módulos: Dashboard, Nova Venda, Pedidos B2B, Histórico, Clientes, Carteira, Crédito, Estoque, Estoque Baixo, Importar, Cadastrar Produto, Markup, Ofertas, Cupons, Prazos, Alertas de Recompra, Fornecedores, Metas, Vendedores, Comissões, Garantias e Contas a Pagar." },
              { q: "Posso cancelar a qualquer momento?", a: "Sim! Sem contrato, sem multa. Cancele pelo WhatsApp quando quiser." },
            ].map((faq, i) => (
              <Card key={i} className="p-5 glass-card">
                <h4 className="font-bold text-sm mb-1.5 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] text-primary font-bold">?</span>
                  </span>
                  {faq.q}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed pl-7">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CTA FINAL */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center mx-auto mb-6" style={{ boxShadow: 'var(--shadow-glow)' }}>
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para vender mais e errar menos?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Consulta por placa, catálogo B2B 24h, central de vendas completa.
            Tudo que sua loja precisa por R$ 14,99/mês.
          </p>
          <Link to="/pre-cadastro">
            <Button size="lg" className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2">
              Começar Agora — R$ 14,99/mês
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            R$ 14,99/mês · Sem contrato · Ativação em até 24h
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold">ConsultaParts AI</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2025 ConsultaParts AI. Todos os direitos reservados. Criado por Mauricio Chaparim.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Sales;
