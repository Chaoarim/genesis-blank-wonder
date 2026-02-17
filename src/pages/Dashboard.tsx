import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChatContainer } from "@/components/ChatContainer";
import { Button } from "@/components/ui/button";
import { Zap, LogOut, AlertCircle, ExternalLink } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Chat Container */}
      <div className="flex-1 overflow-hidden">
        <ChatContainer onLogout={handleLogout} />
      </div>
    </div>
  );
};

export default Dashboard;
