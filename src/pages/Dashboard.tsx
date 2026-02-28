import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Zap, LogOut, AlertCircle, BarChart3, PlusCircle, ShoppingBag, Package, History, Users, Target, Percent, Link2, Search } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import type { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const fetchSubscriptionStatus = useCallback(async (userId: string) => {
    const { data: status, error } = await supabase.rpc('check_subscription_status', {
      p_user_id: userId
    });

    if (error) throw error;

    setSubscriptionStatus(status);
    return status;
  }, []);

  const handleRefreshStatus = useCallback(async () => {
    if (!user) return;

    setCheckingStatus(true);
    try {
      const status = await fetchSubscriptionStatus(user.id);
      if (status === 'active') {
        toast.success("Acesso liberado! Recarregando...");
      } else {
        toast.message("Ainda não recebemos a confirmação do pagamento. Tente novamente em instantes.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Não consegui verificar sua assinatura agora. Tente novamente.");
    } finally {
      setCheckingStatus(false);
    }
  }, [user, fetchSubscriptionStatus]);

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        // Use cached session first for faster load
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate("/login");
          return;
        }

        if (isMounted) {
          setUser(session.user);
          // Show content immediately, check subscription in background
          setLoading(false);
          
          // Fetch subscription status in background
          fetchSubscriptionStatus(session.user.id).catch(console.error);
        }
      } catch (e) {
        console.error(e);
        if (isMounted) {
          toast.error("Erro ao carregar sua conta. Tente novamente.");
          setLoading(false);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, fetchSubscriptionStatus]);

  // Enquanto a assinatura estiver inativa/pendente, revalidar automaticamente
  useEffect(() => {
    if (!user || subscriptionStatus === 'active') return;

    const interval = setInterval(() => {
      fetchSubscriptionStatus(user.id);
    }, 10_000);

    return () => clearInterval(interval);
  }, [user, subscriptionStatus, fetchSubscriptionStatus]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta");
    navigate("/login");
  };

  // Aguardar carregamento OU verificação de assinatura
  if (loading || subscriptionStatus === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  // Se não tem assinatura ativa, mostrar mensagem
  if (subscriptionStatus !== 'active') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-lg">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Query Car Parts</span>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-20 max-w-2xl">
          <Card className="p-8 glass-card text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            
            <h1 className="text-2xl font-bold mb-4">Assinatura Necessária</h1>
            
            <p className="text-muted-foreground mb-6">
              Para acessar o sistema de consulta de peças, você precisa ter uma assinatura ativa.
              {subscriptionStatus === 'canceled' && (
                <span className="block mt-2 text-destructive">
                  Sua assinatura foi cancelada.
                </span>
              )}
            </p>



            <p className="text-sm text-muted-foreground mt-4">
              Entre em contato com Mauricio Chaparim pelo{" "}
              <a 
                href="https://wa.me/5519981878489" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-400 font-medium"
              >
                Suporte WhatsApp 19 98187-8489
              </a>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const shortcuts = [
    { label: 'Dashboard', icon: BarChart3, tab: 'dashboard', color: 'from-blue-500 to-blue-700' },
    { label: 'Nova Venda', icon: PlusCircle, tab: 'new-sale', color: 'from-green-500 to-green-700' },
    { label: 'Pedidos', icon: ShoppingBag, tab: 'orders', color: 'from-purple-500 to-purple-700' },
    { label: 'Estoque', icon: Package, tab: 'inventory', color: 'from-amber-500 to-amber-700' },
    { label: 'Histórico', icon: History, tab: 'history', color: 'from-cyan-500 to-cyan-700' },
    { label: 'Clientes', icon: Users, tab: 'customers', color: 'from-pink-500 to-pink-700' },
    { label: 'Metas', icon: Target, tab: 'goals', color: 'from-red-500 to-red-700' },
    { label: 'Markup', icon: Percent, tab: 'markup', color: 'from-indigo-500 to-indigo-700' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">ConsultaParts AI</h1>
              <p className="text-xs text-muted-foreground">Painel Principal</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl flex-1 space-y-6">
        {/* Busca de Peças - abre catálogos por fornecedor */}
        <Card
          className="p-5 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow border-primary/30"
          onClick={() => window.open('/buscar-pecas', '_blank')}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shrink-0">
            <Search className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">Buscar Peças</h2>
            <p className="text-sm text-muted-foreground">Catálogos por fornecedor</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Online
          </span>
        </Card>

        

        {/* Central de Vendas - Grid de Atalhos */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Central de Vendas</h2>
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
            {shortcuts.map(({ label, icon: Icon, tab, color }) => (
              <Card
                key={tab}
                className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.03] active:scale-95"
                onClick={() => navigate(`/vendas?tab=${tab}`)}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-center leading-tight">{label}</span>
              </Card>
            ))}
          </div>
        </div>

        {/* Catálogo B2B */}
        <Card
          className="p-5 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            if (user) window.open(`/catalogo/${user.id}`, '_blank');
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shrink-0">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Catálogo B2B Online</h2>
            <p className="text-sm text-muted-foreground">Acesse o link do seu catálogo para clientes</p>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
