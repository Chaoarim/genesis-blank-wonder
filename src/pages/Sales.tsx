import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check, Zap, Database, Search, ArrowRight, Settings,
  Globe, Users, Wrench, Car, Clock, BarChart3, Package,
  ChevronRight, Star, BookOpen, ShoppingCart, Target, Percent,
  Link2, ImageIcon, Smartphone, Receipt,
  ScanLine, Eye, FileSpreadsheet, TrendingUp
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
      {/* HERO — foco em busca por veículo e placa */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'var(--gradient-hero)' }} />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

        <div className="container mx-auto text-center max-w-5xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Car className="w-4 h-4" />
            partsai.online/buscar-pecas
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]">
            Selecione o veículo,{" "}
            <br className="hidden md:block" />
            encontre a <span className="text-gradient">peça certa</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Escolha entre 61+ veículos catalogados ou digite a placa — o sistema identifica marca, modelo, motor e ano.
            Encontre peças compatíveis em segundos e venda com catálogo B2B online 24 horas no ar.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link to="/pre-cadastro">
              <Button size="lg" className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2 w-full sm:w-auto">
                Começar Agora — R$ 14,99/mês
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#busca-veiculo">
              <Button size="lg" variant="outline" className="text-lg px-8 py-7 gap-2 w-full sm:w-auto">
                Ver Como Funciona
                <ChevronRight className="w-5 h-5" />
              </Button>
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> 61+ veículos catalogados</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Consulta por placa</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Catálogo B2B online</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> 21 módulos de gestão</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* NÚMEROS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-12 px-4 border-y border-border/50 bg-card/30">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "61+", label: "Veículos Catalogados", sub: "Gol, Onix, HB20, Hilux..." },
              { value: "4", label: "Modos de Busca", sub: "Veículo · Placa · Código · Geral" },
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
      {/* BUSCA POR VEÍCULO — destaque principal */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section id="busca-veiculo" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <Car className="w-3.5 h-3.5" />
                BUSCA POR VEÍCULO
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                O cliente falou o carro?{" "}
                <span className="text-gradient">Achou a peça.</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Selecione o veículo na grade de 61+ modelos catalogados — Gol, Onix, HB20, Hilux, Civic, Creta, Renegade e muito mais.
                Todas as peças compatíveis aparecem na tela. Busque por nome dentro do catálogo com precisão total.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Car, title: "61+ veículos organizados em cards", desc: "Navegação visual: selecione o modelo e veja todas as peças disponíveis. Sem digitar, sem erro." },
                  { icon: Search, title: "Busca estrita dentro do catálogo", desc: "Após selecionar o veículo, pesquise 'pastilha', 'filtro', 'amortecedor' — só mostra o que pertence ao modelo." },
                  { icon: BookOpen, title: "Catálogos por fornecedor integrados", desc: "Além de veículos, navegue por 45+ fornecedores (FRAS-LE, NAKATA, COFAP, URBA, VIEMAR...)." },
                  { icon: Clock, title: "Atendimento 5x mais rápido", desc: "O balconista encontra a peça em segundos. Sem catálogo físico, sem ligar para distribuidora." },
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

            {/* Simulação: grade de veículos */}
            <Card className="p-6 glass-card border-primary/20">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                <Search className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold flex-1">Consulta de Peças</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">buscar-pecas</span>
              </div>

              {/* Tabs simuladas — VEÍCULO ativo */}
              <div className="grid grid-cols-4 gap-1 bg-muted/50 rounded-lg p-1 mb-4">
                {["PLACA", "VEÍCULO", "CÓDIGO", "GERAL"].map((tab, i) => (
                  <div key={tab} className={`text-center py-1.5 rounded text-[10px] font-semibold ${i === 1 ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>
                    {tab}
                  </div>
                ))}
              </div>

              {/* Grade de veículos */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {["GOL", "ONIX", "HB20", "HILUX", "CIVIC", "CRETA", "RENEGADE", "COROLLA", "TRACKER"].map((name, i) => (
                  <div key={name} className={`rounded-lg p-2.5 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${i === 0 ? 'bg-primary/10 border-2 border-primary/40' : 'bg-muted/50 hover:bg-muted/80'}`}>
                    <Car className={`w-5 h-5 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className={`text-[10px] font-bold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>{name}</p>
                  </div>
                ))}
              </div>
              <div className="text-center mb-3">
                <span className="text-[10px] text-muted-foreground">+ 52 veículos disponíveis</span>
              </div>

              {/* Resultado ao selecionar GOL */}
              <div className="bg-muted/30 rounded-lg p-2.5 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Buscar peças para GOL...</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {[
                  { code: "SYL-1234", name: "Pastilha de Freio Dianteira", supplier: "FRAS-LE", app: "Gol G5/G6 · Voyage · Fox" },
                  { code: "NK-5678", name: "Amortecedor Traseiro", supplier: "NAKATA", app: "Gol G5 · Saveiro · 2009→" },
                  { code: "CF-9012", name: "Kit Embreagem", supplier: "SACHS", app: "Gol 1.0/1.6 · 2008→" },
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
                      <p className="text-[8px] text-muted-foreground">{item.app}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* BUSCA POR PLACA */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Simulação visual — placa */}
            <Card className="p-6 glass-card border-primary/20 order-2 lg:order-1">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                <ScanLine className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold flex-1">Consulta por Placa</span>
              </div>

              {/* Tabs — PLACA ativo */}
              <div className="grid grid-cols-4 gap-1 bg-muted/50 rounded-lg p-1 mb-4">
                {["PLACA", "VEÍCULO", "CÓDIGO", "GERAL"].map((tab, i) => (
                  <div key={tab} className={`text-center py-1.5 rounded text-[10px] font-semibold ${i === 0 ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground'}`}>
                    {tab}
                  </div>
                ))}
              </div>

              {/* Input de placa */}
              <div className="flex flex-col items-center py-3 mb-4">
                <div className="relative">
                  <div className="bg-muted/50 border-2 border-primary/30 rounded-lg px-8 py-3 text-center">
                    <span className="text-3xl font-bold tracking-[0.2em] text-foreground">BRA2E19</span>
                  </div>
                  <div className="absolute top-1.5 right-2 w-5 h-4 bg-primary/80 rounded-sm flex items-center justify-center">
                    <span className="text-[6px] font-bold text-primary-foreground">BR</span>
                  </div>
                </div>
              </div>

              {/* Veículo identificado */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3">
                <p className="text-[10px] font-bold uppercase text-primary opacity-80">Veículo Identificado:</p>
                <p className="text-sm font-bold text-primary">VOLKSWAGEN GOL</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-[10px] text-primary/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />Ano: 2019
                  </span>
                  <span className="text-[10px] text-primary/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />Motor: 1.0
                  </span>
                  <span className="text-[10px] text-primary/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />Flex
                  </span>
                </div>
              </div>

              {/* Busca + resultados */}
              <div className="bg-muted/30 rounded-lg p-2 mb-2 flex items-center gap-2">
                <Search className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">pastilha</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { code: "PD-4521", name: "Pastilha de Freio Dianteira", supplier: "FRAS-LE" },
                  { code: "PT-8923", name: "Pastilha de Freio Traseira", supplier: "COBREQ" },
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
              <p className="text-[10px] text-muted-foreground text-center mt-2">2 resultados filtrados para Gol 1.0 Flex 2019</p>
            </Card>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <ScanLine className="w-3.5 h-3.5" />
                BUSCA POR PLACA
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Digite a placa, o sistema{" "}
                <span className="text-gradient">faz o resto</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                O cliente chegou com o carro e não sabe o modelo exato? Sem problema.
                Digite a placa e o sistema consulta o Detran em tempo real — retorna marca, modelo,
                motor (1.0, 1.4, 1.6...), ano e combustível (flex, gasolina, diesel) automaticamente.
              </p>
              <div className="space-y-4">
                {[
                  { icon: ScanLine, title: "Identificação automática via Detran", desc: "Placa → marca, modelo, motor, ano e combustível em segundos. Funciona com placas antigas e Mercosul." },
                  { icon: Search, title: "Peças já filtradas pelo veículo", desc: "Após identificar, pesquise qualquer peça e os resultados vêm filtrados para aquele modelo específico." },
                  { icon: Clock, title: "Elimine erros de compra", desc: "Sem confundir modelo, sem peça errada, sem devolução. O veículo é identificado com precisão." },
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
                CATÁLOGO B2B ONLINE
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Seu estoque vendendo{" "}
                <span className="text-gradient">24 horas por dia</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Publique seu estoque na internet com um link exclusivo. Seus clientes acessam pelo celular,
                pesquisam por código ou nome, veem preços atualizados e montam o pedido sozinhos.
                Você recebe o pedido pronto — sem ligação, sem WhatsApp, sem espera.
              </p>

              <div className="space-y-4 mb-6">
                {[
                  { icon: Link2, title: "Link exclusivo da sua loja", desc: "partsai.online/catalogo/sua-loja — compartilhe por WhatsApp, Instagram, cartão de visita ou QR Code." },
                  { icon: ShoppingCart, title: "Carrinho de compras completo", desc: "Seu cliente seleciona itens, escolhe quantidade e envia o pedido com nome e telefone." },
                  { icon: Eye, title: "Preços com markup automático", desc: "Configure o markup uma vez. Os preços de revenda são calculados automaticamente para o cliente." },
                  { icon: TrendingUp, title: "Promoções com cronômetro", desc: "Crie ofertas temporárias com desconto e cronômetro regressivo. Indicadores de prova social (ex: '🔥 150 vendidos')." },
                  { icon: Users, title: "Cadastro de clientes B2B", desc: "Clientes criam login e acessam condições especiais. Pedidos sincronizados automaticamente na Central de Vendas." },
                  { icon: Smartphone, title: "100% mobile e responsivo", desc: "Interface otimizada para celular. Seu cliente faz pedido na obra, na oficina, onde estiver — a qualquer hora." },
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

              {/* Busca */}
              <div className="bg-muted/50 rounded-lg p-2.5 flex items-center gap-2 mb-3">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Buscar no catálogo...</span>
              </div>

              {/* Filtros de marca */}
              <div className="flex gap-1.5 mb-3 overflow-hidden">
                {["Todas", "FRAS-LE", "NAKATA", "COFAP", "URBA"].map((brand, i) => (
                  <span key={brand} className={`text-[10px] px-2 py-1 rounded-full border shrink-0 ${i === 0 ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
                    {brand}
                  </span>
                ))}
              </div>

              <div className="space-y-2">
                {[
                  { code: "AM-3456", name: "Amortecedor Dianteiro", price: "R$ 189,90", stock: 8, badge: "🔥 150 vendidos" },
                  { code: "PF-1234", name: "Pastilha de Freio Diant.", price: "R$ 79,90", stock: 24, badge: "" },
                  { code: "CR-7890", name: "Correia Dentada", price: "R$ 45,00", stock: 15, badge: "⏰ Oferta" },
                ].map((item, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-mono text-primary font-semibold">{item.code}</p>
                        {item.badge && <span className="text-[9px] text-muted-foreground">{item.badge}</span>}
                      </div>
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
                <span className="text-xs text-muted-foreground">🛒 Carrinho: 3 itens</span>
                <span className="text-sm font-bold text-primary">R$ 314,80</span>
              </div>
              <div className="mt-2 text-center">
                <span className="text-[10px] text-muted-foreground">✅ Enviar pedido → Pedido aparece na Central de Vendas</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CENTRAL DE VENDAS — 21 MÓDULOS */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <BarChart3 className="w-3.5 h-3.5" />
              CENTRAL DE VENDAS
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              21 módulos para{" "}
              <span className="text-gradient">gerenciar tudo</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
              Vendas, clientes, estoque, financeiro, equipe e comercial — tudo integrado em um único painel.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: BarChart3,
                title: 'Vendas',
                items: ['Dashboard com faturamento em tempo real', 'Nova Venda com busca por veículo integrada', 'Pedidos B2B (recebidos do catálogo)', 'Histórico completo de vendas'],
              },
              {
                icon: Users,
                title: 'Clientes',
                items: ['CRM completo com dados e histórico', 'Carteira de clientes por vendedor', 'Aprovação de crédito com limites', 'Alertas de recompra automáticos'],
              },
              {
                icon: Package,
                title: 'Estoque',
                items: ['Consulta rápida de estoque', 'Relatório de estoque baixo', 'Importar planilhas Excel/CSV', 'Cadastro manual de produto', 'Upload de fotos em lote por código'],
              },
              {
                icon: Percent,
                title: 'Comercial',
                items: ['Markup configurável (distribuidor/revenda)', 'Promoções com cronômetro regressivo', 'Cupons de desconto personalizados', 'Regras de prazo de pagamento', 'Contatos de fornecedores'],
              },
              {
                icon: Target,
                title: 'Equipe',
                items: ['Metas mensais por loja e vendedor', 'Gestão de vendedores com permissões', 'Comissões automáticas por venda', 'Relatórios de performance'],
              },
              {
                icon: Receipt,
                title: 'Financeiro',
                items: ['Garantias e devoluções', 'Contas a pagar com vencimentos', 'Controle de recebimentos'],
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
      {/* PARA QUEM É */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Feito para quem vive o{" "}
              <span className="text-gradient">setor automotivo</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Package,
                title: "Loja de Auto Peças",
                desc: "Busque por veículo, placa ou código. Publique seu catálogo B2B e gerencie tudo com a Central de Vendas.",
                highlights: ["Busca por veículo e placa", "Catálogo B2B 24h online", "Estoque com importação de planilhas"]
              },
              {
                icon: Car,
                title: "Auto Center",
                desc: "O mecânico fala o carro e você acha a peça na hora. 61+ veículos catalogados com busca precisa.",
                highlights: ["61+ veículos catalogados", "Consulta por placa com motor e ano", "CRM e carteira de clientes"]
              },
              {
                icon: Wrench,
                title: "Oficina Mecânica",
                desc: "Cruze referências, encontre códigos similares e descubra qual peça serve — sem devolução por erro.",
                highlights: ["4 modos de busca", "Códigos similares integrados", "Busca por fornecedor"]
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
                emoji: "🚗",
                title: "Busca por Veículo = Precisão",
                desc: "Selecione o modelo entre 61+ veículos e veja só peças compatíveis. Sem resultado irrelevante, sem erro de aplicação."
              },
              {
                emoji: "📱",
                title: "Consulta por Placa = Velocidade",
                desc: "Digite a placa e em segundos o sistema retorna marca, modelo, motor e combustível. As peças já vêm filtradas."
              },
              {
                emoji: "🌐",
                title: "Catálogo B2B = Vendas 24h",
                desc: "Seu estoque publicado online com link exclusivo. Clientes fazem pedido pelo celular a qualquer hora — você recebe pronto na Central."
              },
              {
                emoji: "📊",
                title: "21 Módulos = Gestão Completa",
                desc: "Vendas, estoque, CRM, markup, comissões, metas, financeiro. Tudo integrado, sem software pesado, sem mensalidade cara."
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
              { name: "Ricardo M.", role: "Auto Peças — SP", text: "A busca por veículo é incrível. Seleciono o modelo e já vejo todas as peças. Reduzi erros de compra a quase zero e o atendimento ficou 5x mais rápido." },
              { name: "Carla S.", role: "Auto Center — MG", text: "O catálogo B2B mudou meu negócio. Meus clientes fazem pedido pelo celular a qualquer hora. Acordo com pedidos prontos todo dia — sem precisar atender telefone." },
              { name: "João P.", role: "Oficina Mecânica — RJ", text: "A consulta por placa é sensacional. O cliente chega, digito a placa e já sei o motor, o ano e quais peças servem. Nunca mais comprei peça errada." },
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
              Quanto você perde por dia com consultas lentas e peças erradas? A ConsultaParts se paga no primeiro atendimento.
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
            <p className="text-sm text-muted-foreground mb-5">Todos os recursos inclusos</p>

            <ul className="space-y-2 mb-8">
              {[
                "Busca por veículo — 61+ modelos catalogados",
                "Consulta por placa — identifica motor, ano e combustível",
                "Busca por código e código similar",
                "Busca geral com lateralidade inteligente",
                "Catálogos por fornecedor (45+ fornecedores)",
                "Catálogo B2B online com link exclusivo",
                "Central de Vendas completa (21 módulos)",
                "Controle de estoque + importação de planilhas",
                "Upload de fotos em lote por código",
                "CRM, carteira de clientes e aprovação de crédito",
                "Markup, promoções, cupons e prazos de pagamento",
                "Gestão de vendedores, comissões e metas",
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
              { q: "Como funciona a busca por veículo?", a: "Você acessa partsai.online/buscar-pecas, clica na aba VEÍCULO e seleciona entre 61+ modelos catalogados (Gol, Onix, HB20, Hilux, Civic...). Ao selecionar, todas as peças compatíveis aparecem. Você pode buscar dentro do catálogo por nome (pastilha, filtro, etc.) com precisão total." },
              { q: "E a consulta por placa?", a: "Na aba PLACA, digite a placa do veículo. O sistema consulta o Detran em tempo real e retorna marca, modelo, motor (1.0, 1.4, 1.6...), ano e combustível. A partir daí, pesquise qualquer peça já filtrada para aquele veículo." },
              { q: "Preciso instalar algum programa?", a: "Não! Funciona 100% no navegador, no celular ou computador. Basta acessar partsai.online e fazer login." },
              { q: "O que é o Catálogo B2B Online?", a: "É uma loja virtual do seu estoque com link exclusivo (partsai.online/catalogo/sua-loja). Seus clientes acessam pelo celular, pesquisam peças, veem preços com markup e fazem pedidos — 24 horas por dia, sem precisar ligar." },
              { q: "Como importo meu estoque?", a: "Na Central de Vendas, vá em 'Importar'. O sistema aceita planilhas Excel e CSV, reconhece variações de cabeçalho e formatos de moeda brasileira automaticamente. Você também pode cadastrar produtos manualmente." },
              { q: "Quantos módulos tem a Central de Vendas?", a: "São 21 módulos: Dashboard, Nova Venda (com busca por veículo integrada), Pedidos B2B, Histórico, Clientes, Carteira, Crédito, Estoque, Estoque Baixo, Importar, Cadastrar Produto, Markup, Ofertas, Cupons, Prazos, Alertas de Recompra, Fornecedores, Metas, Vendedores, Comissões, Garantias e Contas a Pagar." },
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
            Busca por veículo, consulta por placa, catálogo B2B 24h e central de vendas completa.
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
