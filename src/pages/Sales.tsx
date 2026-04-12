import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check, Zap, Search, ArrowRight, Settings,
  Car, Clock, Star, ScanLine, ChevronRight,
  ImageIcon, Shield, Smartphone, BarChart3, TrendingUp, Package
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
              <Search className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold leading-none">ConsultaParts AI</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Consulta de Peças Automotivas</p>
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

      {/* ═══════════════════════════════ */}
      {/* HERO — direto ao ponto */}
      {/* ═══════════════════════════════ */}
      <section className="relative py-20 md:py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'var(--gradient-hero)' }} />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Car className="w-4 h-4" />
            Consulta de Peças por Veículo e Placa
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]">
            Encontre a <span className="text-gradient">peça certa</span>
            <br className="hidden md:block" />
            em segundos
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Digite a <strong>placa</strong> ou selecione o <strong>veículo</strong> — o sistema identifica o modelo e mostra
            apenas peças compatíveis. Sem erro, sem devolução.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link to="/pre-cadastro">
              <Button size="lg" className="text-lg px-10 py-7 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2 w-full sm:w-auto">
                Começar Agora
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button size="lg" variant="outline" className="text-lg px-8 py-7 gap-2 w-full sm:w-auto">
                Ver Como Funciona
                <ChevronRight className="w-5 h-5" />
              </Button>
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> 61+ veículos catalogados</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Consulta por placa</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> 45+ fornecedores</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ */}
      {/* NÚMEROS */}
      {/* ═══════════════════════════════ */}
      <section className="py-12 px-4 border-y border-border/50 bg-card/30">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: "61+", label: "Veículos", sub: "Gol, Onix, HB20, Hilux..." },
              { value: "4", label: "Modos de Busca", sub: "Placa · Veículo · Código · Geral" },
              { value: "45+", label: "Fornecedores", sub: "FRAS-LE, NAKATA, COFAP..." },
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

      {/* ═══════════════════════════════ */}
      {/* COMO FUNCIONA — 3 passos */}
      {/* ═══════════════════════════════ */}
      <section id="como-funciona" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Como funciona em <span className="text-gradient">3 passos</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Simples, rápido e sem erro.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: ScanLine,
                title: "Digite a placa ou selecione o veículo",
                desc: "O sistema identifica marca, modelo, motor, ano e combustível automaticamente via Detran. Ou escolha entre 61+ veículos catalogados.",
              },
              {
                step: "2",
                icon: Search,
                title: "Busque a peça",
                desc: "Digite 'pastilha', 'filtro', 'amortecedor' — os resultados vêm filtrados para o veículo correto. Sem peça errada.",
              },
              {
                step: "3",
                icon: Check,
                title: "Encontrou! Venda com confiança",
                desc: "Veja código, fornecedor, aplicação e preço. Tenha certeza de que a peça é compatível antes de vender.",
              },
            ].map((item, i) => (
              <Card key={i} className="p-7 glass-card hover:border-primary/30 transition-all text-center relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 mt-2">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ */}
      {/* BUSCA POR VEÍCULO — demo */}
      {/* ═══════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
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
                Selecione entre 61+ veículos catalogados. Todas as peças compatíveis aparecem na tela. Busque por nome dentro do catálogo.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Car, title: "61+ veículos em cards visuais", desc: "Gol, Onix, HB20, Hilux, Civic, Creta, Renegade e muito mais." },
                  { icon: Search, title: "Busca dentro do catálogo", desc: "Após selecionar o veículo, filtre por 'pastilha', 'filtro', 'amortecedor'." },
                  { icon: Clock, title: "Atendimento 5x mais rápido", desc: "Sem catálogo físico, sem ligar para distribuidora." },
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

            {/* Demo visual */}
            <Card className="p-6 glass-card border-primary/20">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                <Search className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold flex-1">Consulta de Peças</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {["GOL", "ONIX", "HB20", "HILUX", "CIVIC", "CRETA", "RENEGADE", "COROLLA", "TRACKER"].map((name, i) => (
                  <div key={name} className={`rounded-lg p-2.5 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${i === 0 ? 'bg-primary/10 border-2 border-primary/40' : 'bg-muted/50'}`}>
                    <Car className={`w-5 h-5 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className={`text-[10px] font-bold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>{name}</p>
                  </div>
                ))}
              </div>
              <div className="text-center mb-3">
                <span className="text-[10px] text-muted-foreground">+ 52 veículos disponíveis</span>
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

      {/* ═══════════════════════════════ */}
      {/* BUSCA POR PLACA — demo */}
      {/* ═══════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Demo visual */}
            <Card className="p-6 glass-card border-primary/20 order-2 lg:order-1">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                <ScanLine className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold flex-1">Consulta por Placa</span>
              </div>
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
                O cliente chegou e não sabe o modelo exato? Digite a placa — o sistema consulta o Detran e retorna marca, modelo, motor, ano e combustível.
              </p>
              <div className="space-y-4">
                {[
                  { icon: ScanLine, title: "Identificação automática via Detran", desc: "Funciona com placas antigas e Mercosul." },
                  { icon: Search, title: "Peças filtradas pelo veículo", desc: "Resultados precisos para o modelo identificado." },
                  { icon: Shield, title: "Elimine erros de compra", desc: "Sem peça errada, sem devolução." },
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

      {/* ═══════════════════════════════ */}
      {/* RANKING FROTA — benefícios */}
      {/* ═══════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <BarChart3 className="w-3.5 h-3.5" />
                RANKING DE FROTA
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Saiba quais carros{" "}
                <span className="text-gradient">dominam o mercado</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Dados reais de emplacamentos e frota circulante para você antecipar a demanda e nunca ficar sem as peças que mais vendem.
              </p>
              <div className="space-y-4">
                {[
                  { icon: TrendingUp, title: "Previsão de demanda inteligente", desc: "Identifique os Top 10 veículos mais emplacados e priorize estoque para esses modelos." },
                  { icon: BarChart3, title: "Análise de participação de mercado", desc: "Veja o percentual de cada modelo no total de emplacamentos e tome decisões com dados." },
                  { icon: Package, title: "Detecte oportunidades de venda", desc: "Descubra modelos com alta frota mas poucas peças no seu catálogo — oportunidade de lucro." },
                  { icon: Car, title: "Dados FENABRAVE por ano e tipo", desc: "Automóveis e comerciais leves separados, com histórico por ano para análise de tendências." },
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
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                <BarChart3 className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold flex-1">Inteligência Automotiva</span>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { pos: "1°", model: "VW/GOL", qty: "303.014", share: "12.4%", priority: "🔴 Alta" },
                  { pos: "2°", model: "FIAT/UNO", qty: "250.000", share: "10.2%", priority: "🔴 Alta" },
                  { pos: "3°", model: "GM/ONIX", qty: "218.500", share: "8.9%", priority: "🔴 Alta" },
                  { pos: "4°", model: "HYUNDAI/HB20", qty: "195.000", share: "8.0%", priority: "🔴 Alta" },
                  { pos: "5°", model: "VW/VOYAGE", qty: "142.300", share: "5.8%", priority: "🔴 Alta" },
                ].map((item, i) => (
                  <div key={i} className="bg-card/80 rounded-lg p-2.5 border border-border/50 flex items-center gap-3">
                    <span className="text-primary font-mono text-xs font-bold w-6">{item.pos}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{item.model}</p>
                      <p className="text-[10px] text-muted-foreground">{item.qty} emplacamentos · {item.share} mercado</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-destructive/10 text-destructive rounded-full font-medium">{item.priority}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total Emplacamentos", value: "1.2M+" },
                  { label: "Modelos Analisados", value: "50+" },
                  { label: "Top 10 = Mercado", value: "68.5%" },
                ].map((stat, i) => (
                  <div key={i} className="bg-primary/5 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-primary">{stat.value}</p>
                    <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ */}
      {/* PARA QUEM É */}
      {/* ═══════════════════════════════ */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Feito para quem vive o{" "}
              <span className="text-gradient">setor automotivo</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                emoji: "🏪",
                title: "Loja de Auto Peças",
                desc: "Busque por veículo ou placa e encontre a peça certa para o cliente na hora.",
              },
              {
                emoji: "🔧",
                title: "Oficina Mecânica",
                desc: "O mecânico fala o carro, você digita a placa e já sabe qual peça serve.",
              },
              {
                emoji: "🚗",
                title: "Auto Center",
                desc: "61+ veículos catalogados com busca precisa. Atendimento 5x mais rápido.",
              },
            ].map((seg, i) => (
              <Card key={i} className="p-7 glass-card hover:border-primary/30 transition-all text-center">
                <div className="text-4xl mb-4">{seg.emoji}</div>
                <h3 className="text-xl font-bold mb-2">{seg.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{seg.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════ */}
      {/* DEPOIMENTOS */}
      {/* ═══════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Quem usa, <span className="text-gradient">recomenda</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Ricardo M.", role: "Auto Peças — SP", text: "A busca por veículo é incrível. Seleciono o modelo e já vejo todas as peças. O atendimento ficou 5x mais rápido." },
              { name: "João P.", role: "Oficina Mecânica — RJ", text: "A consulta por placa é sensacional. Digito a placa e já sei o motor, o ano e quais peças servem. Nunca mais comprei peça errada." },
              { name: "Carla S.", role: "Auto Center — MG", text: "Antes perdia tempo procurando em catálogo físico. Agora em segundos encontro a peça certa com código e fornecedor." },
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

      {/* ═══════════════════════════════ */}
      {/* PRICING — simples */}
      {/* ═══════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-lg text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Escolha seu <span className="text-gradient">plano</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto">
            Acesse a consulta de peças mais completa do mercado.
          </p>

          <Card className="p-8 glass-card border-primary/50 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
              MAIS VENDIDO
            </div>

            <h3 className="text-2xl font-bold mb-1 mt-2">Plano Consulta</h3>
            <p className="text-sm text-muted-foreground mb-6">Tudo que você precisa para encontrar peças</p>

            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xl text-muted-foreground line-through">R$ 480,00</span>
                <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">-38%</span>
              </div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-primary">R$ 297</span>
                <span className="text-muted-foreground">/ano</span>
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-sm text-muted-foreground">💳 12x de <span className="font-semibold text-foreground">R$ 30,72</span> no cartão</p>
                <p className="text-sm text-muted-foreground">ou <span className="font-semibold text-foreground">R$ 297,00</span> à vista no PIX</p>
              </div>
            </div>

            <ul className="space-y-3 mb-8 text-left">
              {[
                "Busca por veículo — 61+ modelos",
                "Consulta por placa — motor, ano, combustível",
                "Busca por código e código similar",
                "Busca geral com lateralidade inteligente",
                "45+ fornecedores catalogados",
                "Acesso ilimitado 24h",
                "Suporte via WhatsApp",
              ].map((b, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>

            <Link to="/pre-cadastro" className="block">
              <Button className="w-full text-lg py-6 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2">
                Assinar Agora
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Cancele quando quiser · Sem multa
            </p>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════ */}
      {/* FAQ */}
      {/* ═══════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Perguntas Frequentes
          </h2>

          <div className="space-y-3">
            {[
              { q: "Como funciona a busca por veículo?", a: "Selecione entre 61+ modelos catalogados (Gol, Onix, HB20, Hilux, Civic...). Todas as peças compatíveis aparecem. Busque por nome (pastilha, filtro, etc.) com precisão total." },
              { q: "E a consulta por placa?", a: "Digite a placa e o sistema consulta o Detran em tempo real — retorna marca, modelo, motor, ano e combustível. As peças vêm filtradas para o veículo." },
              { q: "Preciso instalar algo?", a: "Não! Funciona 100% no navegador, celular ou computador." },
              { q: "Posso cancelar a qualquer momento?", a: "Sim! Sem contrato, sem multa. Cancele pelo WhatsApp quando quiser." },
              { q: "Quanto custa?", a: "Plano anual de R$ 297,00 — parcele em 12x de R$ 30,72 no cartão ou pague à vista no PIX." },
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

      {/* ═══════════════════════════════ */}
      {/* CTA FINAL */}
      {/* ═══════════════════════════════ */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center mx-auto mb-6" style={{ boxShadow: 'var(--shadow-glow)' }}>
            <Search className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Encontre a peça certa em segundos
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            61+ veículos, consulta por placa, 45+ fornecedores.
          </p>
          <Link to="/pre-cadastro">
            <Button size="lg" className="text-lg px-8 py-7 bg-primary hover:bg-primary/90 animate-pulse-glow gap-2">
              Começar Agora
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            Sem cartão · Sem contrato · Ativação imediata
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
                <Search className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold">ConsultaParts AI</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/login" className="hover:text-primary transition-colors">Entrar</Link>
              <Link to="/pre-cadastro" className="hover:text-primary transition-colors">Cadastrar</Link>
              <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">WhatsApp</a>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2025 ConsultaParts AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Sales;
