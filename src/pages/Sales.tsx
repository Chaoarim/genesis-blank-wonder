import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Zap, Database, Search, MessageSquare, Shield, ArrowRight, Settings, Globe, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Sales = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [spotsLeft, setSpotsLeft] = useState(23);

  useEffect(() => {
    // Simulate scarcity counter immediately (no waiting)
    const randomSpots = Math.floor(Math.random() * 17) + 12;
    setSpotsLeft(randomSpots);
    
    // Mark as loaded after a short delay to show content quickly
    const loadTimer = setTimeout(() => setIsLoading(false), 100);

    // Check admin in background (non-blocking)
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.log('Admin check failed, continuing as regular user');
      }
    };
    checkAdmin();
    
    // Occasionally decrease the counter for urgency effect
    const interval = setInterval(() => {
      setSpotsLeft(prev => {
        if (prev > 8) {
          return prev - 1;
        }
        return prev;
      });
    }, 45000);

    return () => {
      clearInterval(interval);
      clearTimeout(loadTimer);
    };
  }, []);

  const features = [
    { icon: Search, text: "Consulta inteligente de peças automotivas" },
    { icon: Database, text: "Base de dados completa e atualizada" },
    { icon: MessageSquare, text: "Nossa inteligência para busca por descrição" },
    { icon: Zap, text: "Respostas instantâneas e precisas" },
    { icon: Shield, text: "Dados verificados de fabricantes" },
    { icon: Globe, text: "Dados unificados para decisões rápidas" },
  ];

  const benefits = [
    "Economize tempo na busca de peças",
    "Encontre códigos de fabricantes rapidamente",
    "Consulte aplicações por veículo",
    "Suporte via chat inteligente",
    "Atualizações constantes da base",
    "Pesquisa Web em Tempo Real",
  ];

  const detailedBenefits = [
    {
      emoji: "🚗",
      title: "Agilidade Incomparável nas Consultas",
      description: "Deixe de lado as buscas demoradas! Com o nosso agente de IA, você realiza consultas em massa de peças de forma instantânea, encontrando Fornecedor, Código do Fabricante, Produto e Aplicação em segundos. Otimize seu tempo e foque no que realmente importa: seu cliente e seu negócio."
    },
    {
      emoji: "⏱️",
      title: "Aumento Dramático da Produtividade",
      description: "Liberte sua equipe de tarefas repetitivas. Ao automatizar a consulta de peças, você otimiza o tempo de trabalho, permitindo que sua equipe seja mais produtiva e foque no atendimento e na expansão do seu negócio."
    },
    {
      emoji: "✅",
      title: "Precisão que Reduz Erros e Custos",
      description: "Acesso a dados detalhados e organizados por Fornecedor, Código, Produto e Aplicação. Minimize erros de compra, devoluções e retrabalho, reduzindo custos operacionais e aumentando a satisfação dos seus clientes."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">ConsultaParts AI</span>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/pre-cadastro">
              <Button className="bg-primary hover:bg-primary/90">
                Pré-Cadastro
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Consulta de Peças Automotivas com inteligência
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Encontre peça automotiva em{" "}
            <span className="text-gradient">segundos</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Utilize nossa inteligência para consultar códigos de peças, 
            fabricantes e aplicações de forma rápida e precisa.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/pre-cadastro">
              <Button size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 animate-pulse-glow">
                Fazer Pré-Cadastro
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            ✓ Cadastro rápido &nbsp; ✓ Ativação manual &nbsp; ✓ Suporte incluso
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Tudo que você precisa para consultar peças
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 glass-card hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="text-lg font-medium">{feature.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Por que escolher o ConsultaParts AI?
          </h2>
          <p className="text-muted-foreground text-center mb-12 text-lg max-w-2xl mx-auto">
            Descubra como nossa plataforma pode transformar a forma como você trabalha
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {detailedBenefits.map((benefit, index) => (
              <Card key={index} className="p-8 glass-card hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
                <div className="text-5xl mb-4">{benefit.emoji}</div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Plano simples e acessível
          </h2>
          <p className="text-muted-foreground text-center mb-12 text-lg">
            Acesso completo a todas as funcionalidades
          </p>

          <Card className="max-w-md mx-auto p-8 glass-card border-primary/50 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
              MAIS POPULAR
            </div>
            
            {/* Flash Offer Banner */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-4 mb-6 -mx-2">
              <p className="text-xs uppercase tracking-wide font-semibold mb-1 text-center">⚡ Oferta Relâmpago</p>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-lg line-through opacity-70">R$ 47,00</span>
                <span className="text-3xl font-bold">R$ 20,00</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/20 rounded-full py-1 px-3">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Restam apenas <strong>{spotsLeft}</strong> vagas dos 100 primeiros!
                </span>
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-2">Plano Mensal</h3>
            <p className="text-muted-foreground mb-6">Acesso completo à plataforma</p>
            
            <div className="mb-6">
              <span className="text-lg text-muted-foreground line-through mr-2">R$ 47</span>
              <span className="text-5xl font-bold text-primary">R$ 20</span>
              <span className="text-muted-foreground">/mês</span>
            </div>

            <ul className="space-y-3 mb-8">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm">{benefit}</span>
                </li>
              ))}
            </ul>

            <Link to="/pre-cadastro" className="block">
              <Button className="w-full text-lg py-6 bg-primary hover:bg-primary/90">
                Fazer Pré-Cadastro
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            
            <p className="text-center text-xs text-muted-foreground mt-4">
              Ativação realizada manualmente após análise
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para agilizar suas consultas?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Junte-se a centenas de profissionais que já economizam tempo com o ConsultaParts AI.
          </p>
          <Link to="/pre-cadastro">
            <Button size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90">
              Fazer Pré-Cadastro
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground text-sm space-y-2">
          <p>© 2024 ConsultaParts AI. Todos os direitos reservados.</p>
          <p>Criado por Mauricio Chaparim</p>
        </div>
      </footer>
    </div>
  );
};

export default Sales;
