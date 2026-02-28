import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check, Zap, Database, Search, MessageSquare, Shield, ArrowRight, Settings,
  Globe, Users, Wrench, Car, Clock, TrendingUp, BarChart3, Package,
  ChevronRight, Star, BookOpen, ShoppingCart, Target, Layers, Percent,
  PlusCircle, History, Link2, ImageIcon, FileSpreadsheet, Smartphone
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
            Consulte, venda e gerencie{" "}
            <br className="hidden md:block" />
            peças automotivas com{" "}
            <span className="text-gradient">inteligência</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Busca inteligente de peças, chat especializado, catálogos por fornecedor, central de vendas completa
            e catálogo B2B online — tudo em uma única plataforma feita para lojas de auto peças, auto centers e oficinas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link to="/pre-cadastro">
              <Button size="lg" className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2 w-full sm:w-auto">
                Começar Agora — R$ 49/mês
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#funcionalidades">
              <Button size="lg" variant="outline" className="text-lg px-8 py-7 gap-2 w-full sm:w-auto">
                Ver Funcionalidades
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
              Cada recurso foi pensado para resolver problemas reais do dia a dia.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Package,
                title: "Loja de Auto Peças",
                desc: "Consulte peças em segundos, gerencie estoque, crie orçamentos e compartilhe seu catálogo B2B com clientes.",
                highlights: ["Busca por código e descrição", "Controle de estoque", "Catálogo online para clientes"]
              },
              {
                icon: Car,
                title: "Auto Center",
                desc: "Encontre a peça certa por veículo, modelo e ano. Agilize o atendimento no balcão e reduza erros de compra.",
                highlights: ["Filtro por veículo e modelo", "Orçamentos via WhatsApp", "Gestão de clientes (CRM)"]
              },
              {
                icon: Wrench,
                title: "Oficina Mecânica",
                desc: "Use o sistema inteligente para encontrar qual peça serve em cada carro, cruze referências de fabricantes e evite devoluções.",
                highlights: ["Chat especializado em peças", "Cruzamento de referências", "Pesquisa visual de peças"]
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
      {/* MÓDULO 1: BUSCA DE PEÇAS & CATÁLOGOS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="funcionalidades" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <Search className="w-3.5 h-3.5" />
                MÓDULO 1
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Busca Inteligente de Peças
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Pesquise por código do fabricante, descrição do produto, veículo ou fornecedor.
                O motor de busca entende lateralidade (dianteiro/traseiro, esquerdo/direito),
                filtra por modelo de veículo com precisão e exclui peças irrelevantes automaticamente.
              </p>

              <div className="space-y-3">
                {[
                  { icon: BookOpen, text: "Catálogos organizados por fornecedor com contagem de peças" },
                  { icon: Search, text: "Busca por código, produto, veículo, marca e modelo" },
                  { icon: ImageIcon, text: "Pesquisa visual integrada — veja fotos reais via Google" },
                  { icon: Database, text: "Base com milhares de peças sempre atualizada" },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{f.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulação visual */}
            <Card className="p-6 glass-card border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">Catálogos por Fornecedor</span>
                <span className="ml-auto text-xs text-muted-foreground">30+ fornecedores</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {["FRAS-LE", "NAKATA", "COFAP", "URBA", "MARCON", "VIEMAR"].map((name) => (
                  <div key={name} className="bg-muted/50 rounded-lg p-3 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                      {name.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{name}</p>
                      <p className="text-[10px] text-muted-foreground">1.200+ peças</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">pastilha freio gol g5</span>
                </div>
                <div className="space-y-2">
                  <div className="bg-card/80 rounded p-2.5 border border-border/50">
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-mono text-xs font-semibold">SYL-1234</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">FRAS-LE</span>
                    </div>
                    <p className="text-xs text-foreground mt-1">Pastilha de Freio Dianteira</p>
                    <p className="text-[10px] text-muted-foreground">VW Gol G5/G6 · Voyage · Fox · 2008→</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MÓDULO 2: CONSULTA POR FORNECEDOR */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Simulação da página de busca */}
            <Card className="p-6 glass-card border-primary/20 order-2 lg:order-1">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold flex-1">Catálogos por Fornecedor</span>
                <span className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'hsl(var(--success))' }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'hsl(var(--success))' }} />
                  Online
                </span>
              </div>

              {/* Barra de busca simulada */}
              <div className="bg-muted/50 rounded-lg p-2.5 flex items-center gap-2 mb-4">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Buscar código, peça ou veículo...</span>
              </div>

              {/* Resultado selecionado de um fornecedor */}
              <div className="bg-muted/30 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">FR</div>
                  <div>
                    <p className="text-xs font-bold">FRAS-LE</p>
                    <p className="text-[10px] text-muted-foreground">1.850 peças</p>
                  </div>
                </div>
              </div>

              {/* Resultados de peças */}
              <div className="space-y-2">
                {[
                  { code: "SYL-1234", product: "Pastilha de Freio Dianteira", app: "VW Gol G5/G6 · Voyage · Fox · 2008→", supplier: "FRAS-LE" },
                  { code: "PD-5678", product: "Pastilha de Freio Traseira", app: "VW Gol G5 · Saveiro · 2009→", supplier: "FRAS-LE" },
                  { code: "SL-3421", product: "Sapata de Freio Traseira", app: "VW Gol G4/G5 · Parati · 2006→", supplier: "FRAS-LE" },
                ].map((item, i) => (
                  <div key={i} className="bg-card/80 rounded-lg p-2.5 border border-border/50 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                      <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-mono text-xs font-semibold">{item.code}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{item.supplier}</span>
                      </div>
                      <p className="text-xs text-foreground mt-0.5">{item.product}</p>
                      <p className="text-[10px] text-muted-foreground">{item.app}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-3">3 resultados em 0.2s</p>
            </Card>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <BookOpen className="w-3.5 h-3.5" />
                MÓDULO 2
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Consulta Rápida por Fornecedor
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Acesse o catálogo completo de cada fornecedor em uma interface visual e intuitiva.
                Selecione o fornecedor, pesquise por código, descrição ou veículo e encontre
                a peça certa em segundos — com indicador de status em tempo real.
              </p>
              <div className="space-y-3">
                {[
                  "Navegue por 30+ fornecedores organizados em cards visuais",
                  "Busca dentro de cada catálogo por código, peça ou veículo",
                  "Indicador Online/Carregando em tempo real",
                  "Pesquisa visual integrada com Google Imagens",
                  "Resultados com código, fabricante, produto e aplicação",
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-sm text-muted-foreground">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MÓDULO 3: CENTRAL DE VENDAS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              MÓDULO 3
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Central de Vendas Completa
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Gerencie todo o ciclo de vendas: do orçamento à entrega. Dashboard, estoque, clientes, metas e markup — tudo integrado.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: BarChart3, label: "Dashboard", desc: "Resumo de faturamento, vendas e metas do mês", color: "from-blue-500 to-blue-700" },
              { icon: PlusCircle, label: "Nova Venda", desc: "Crie vendas com preenchimento automático de preços", color: "from-green-500 to-green-700" },
              { icon: ShoppingCart, label: "Pedidos B2B", desc: "Receba e gerencie pedidos do catálogo online", color: "from-purple-500 to-purple-700" },
              { icon: Package, label: "Estoque", desc: "Controle quantidades, importe planilhas, fotos em lote", color: "from-amber-500 to-amber-700" },
              { icon: History, label: "Histórico", desc: "Todas as vendas com detalhes, impressão e filtros", color: "from-cyan-500 to-cyan-700" },
              { icon: Users, label: "Clientes (CRM)", desc: "Cadastre clientes com telefone, email e notas", color: "from-pink-500 to-pink-700" },
              { icon: Target, label: "Metas", desc: "Defina metas mensais e acompanhe o progresso", color: "from-red-500 to-red-700" },
              { icon: Percent, label: "Markup", desc: "Configure margens por tipo (distribuidor/revenda)", color: "from-indigo-500 to-indigo-700" },
            ].map((item, i) => (
              <Card key={i} className="p-4 glass-card hover:border-primary/30 transition-all text-center group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-3`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-bold text-sm mb-1">{item.label}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MÓDULO 4: CATÁLOGO B2B */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <Link2 className="w-3.5 h-3.5" />
                MÓDULO 4
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Catálogo B2B Online
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Seu catálogo de peças publicado na internet com link exclusivo.
                Seus clientes acessam, pesquisam no seu estoque e fazem pedidos direto pelo celular —
                sem precisar ligar ou ir até a loja.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Globe, text: "Link exclusivo para compartilhar com clientes" },
                  { icon: Search, text: "Busca integrada no seu estoque com preços de revenda" },
                  { icon: ShoppingCart, text: "Carrinho de compras com envio de pedido" },
                  { icon: Users, text: "Cadastro de clientes com login e senha" },
                  { icon: Smartphone, text: "100% responsivo — funciona perfeito no celular" },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{f.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="p-6 glass-card border-primary/20">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold">Seu Catálogo Online</span>
                </div>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">partsai.online/catalogo/...</span>
              </div>
              <div className="space-y-2">
                {[
                  { code: "AM-3456", name: "Amortecedor Dianteiro", price: "R$ 189,90", stock: 8 },
                  { code: "PF-1234", name: "Pastilha de Freio", price: "R$ 79,90", stock: 24 },
                  { code: "CR-7890", name: "Correia Dentada", price: "R$ 45,00", stock: 15 },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-primary font-semibold">{item.code}</p>
                      <p className="text-xs text-foreground">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{item.price}</p>
                      <p className="text-[10px] text-muted-foreground">Estoque: {item.stock}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between bg-primary/5 rounded-lg p-3 border border-primary/10">
                <span className="text-xs text-muted-foreground">Carrinho: 3 itens</span>
                <span className="text-sm font-bold text-primary">R$ 314,80</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* DIFERENCIAIS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4">
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
                title: "Velocidade que Vende",
                desc: "Enquanto seu concorrente liga para distribuidora e espera, você já consultou, orçou e mandou no WhatsApp. Cada segundo conta no balcão."
              },
              {
                emoji: "🧠",
                title: "Sistema que Entende Auto Peças",
                desc: "Não é uma ferramenta genérica. Nosso sistema inteligente foi construído para o universo automotivo — entende lateralidade, modelos, anos, fabricantes e aplicações."
              },
              {
                emoji: "📊",
                title: "Gestão sem Complicação",
                desc: "Estoque, vendas, clientes e metas em um único lugar. Importe planilhas, ajuste quantidades, acompanhe faturamento. Sem softwares pesados."
              },
              {
                emoji: "🌐",
                title: "Seu Catálogo 24h no Ar",
                desc: "Seus clientes pesquisam e compram no seu estoque a qualquer hora. Você recebe o pedido pronto, com nome, telefone e itens selecionados."
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
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Quem usa, recomenda
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Ricardo M.", role: "Auto Peças — SP", text: "Reduzi o tempo de consulta de 5 minutos para 10 segundos. Meus vendedores atendem o dobro de clientes agora." },
              { name: "Carla S.", role: "Auto Center — MG", text: "A busca por veículo é sensacional. O mecânico fala o carro e a gente acha a peça na hora, sem erro." },
              { name: "João P.", role: "Oficina Mecânica — RJ", text: "O chat inteligente me salvou várias vezes. Pergunto a aplicação e ele responde certinho. Melhor que ligar pra distribuidora." },
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
      <section className="py-20 px-4">
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
                <span className="text-lg line-through opacity-70">R$ 97,00</span>
                <span className="text-4xl font-bold">R$ 49,00</span>
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
                "Busca inteligente de peças (código, descrição, veículo)",
                "Chat inteligente especializado em auto peças",
                "Catálogos visuais por fornecedor",
                "Central de Vendas completa (8 módulos)",
                "Catálogo B2B online com link exclusivo",
                "Controle de estoque com importação de planilhas",
                "Upload de fotos em lote por código",
                "Gestão de clientes (CRM)",
                "Markup configurável (distribuidor/revenda)",
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
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Perguntas Frequentes
          </h2>

          <div className="space-y-3">
            {[
              { q: "Preciso instalar algum programa?", a: "Não! Funciona 100% no navegador, no celular ou computador. Basta acessar e fazer login." },
              { q: "Como funciona o chat inteligente?", a: "Você digita sua dúvida em português normal (ex: 'qual pastilha serve no Gol G5?') e o sistema consulta toda a base para dar a resposta mais precisa." },
              { q: "Posso importar meu estoque de uma planilha?", a: "Sim! O sistema aceita arquivos Excel e CSV. Ele reconhece variações de cabeçalho e formatos de moeda brasileira automaticamente." },
              { q: "O que é o Catálogo B2B?", a: "É uma loja online do seu estoque com link exclusivo. Seus clientes acessam, pesquisam e fazem pedidos direto pelo celular." },
              { q: "A base de peças é atualizada?", a: "Sim! Adicionamos novos fornecedores e peças constantemente. Você sempre terá acesso aos dados mais recentes." },
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
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center mx-auto mb-6" style={{ boxShadow: 'var(--shadow-glow)' }}>
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para transformar seu negócio?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Lojas de auto peças, auto centers e oficinas já estão economizando horas por dia com a ConsultaParts.
          </p>
          <Link to="/pre-cadastro">
            <Button size="lg" className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2">
              Começar Agora — R$ 49/mês
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            R$ 49/mês · Sem contrato · Ativação em até 24h
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
