import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSalesData } from '@/hooks/useSalesData';
import { usePartsDatabase } from '@/hooks/usePartsDatabase';
import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { CustomersManager } from '@/components/sales/CustomersManager';
import { NewSaleForm } from '@/components/sales/NewSaleForm';
import { SalesHistory } from '@/components/sales/SalesHistory';
import { GoalsManager } from '@/components/sales/GoalsManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, PlusCircle, History, Target, LogOut, ArrowLeft, Zap, Percent } from 'lucide-react';
import { MarkupManager } from '@/components/sales/MarkupManager';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

const SalesHub = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      setLoading(false);
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/login');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const salesData = useSalesData(user?.id ?? null);
  const { parts } = usePartsDatabase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Você saiu');
    navigate('/login');
  };

  const goToNewSale = useCallback(() => setActiveTab('new-sale'), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Central de Vendas</h1>
                <p className="text-xs text-muted-foreground">Gerencie tudo em um lugar</p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6 h-auto">
            <TabsTrigger value="dashboard" className="flex flex-col gap-1 py-2.5 text-xs">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="new-sale" className="flex flex-col gap-1 py-2.5 text-xs">
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Venda</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex flex-col gap-1 py-2.5 text-xs">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex flex-col gap-1 py-2.5 text-xs">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex flex-col gap-1 py-2.5 text-xs">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Metas</span>
            </TabsTrigger>
            <TabsTrigger value="markup" className="flex flex-col gap-1 py-2.5 text-xs">
              <Percent className="w-4 h-4" />
              <span className="hidden sm:inline">Markup</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <SalesDashboard stats={salesData.stats} onNewSale={goToNewSale} recentSales={salesData.sales.slice(0, 5)} />
          </TabsContent>

          <TabsContent value="new-sale">
            <NewSaleForm
              customers={salesData.customers}
              parts={parts}
              onAddCustomer={salesData.addCustomer}
              onCreateSale={salesData.createSale}
              onDone={() => setActiveTab('dashboard')}
            />
          </TabsContent>

          <TabsContent value="history">
            <SalesHistory
              sales={salesData.sales}
              onDeleteSale={salesData.deleteSale}
              getSaleItems={salesData.getSaleItems}
            />
          </TabsContent>

          <TabsContent value="customers">
            <CustomersManager
              customers={salesData.customers}
              sales={salesData.sales}
              onAdd={salesData.addCustomer}
              onUpdate={salesData.updateCustomer}
              onDelete={salesData.deleteCustomer}
            />
          </TabsContent>

          <TabsContent value="goals">
            <GoalsManager
              goals={salesData.goals}
              stats={salesData.stats}
              onSetGoal={salesData.setGoal}
            />
          </TabsContent>

          <TabsContent value="markup">
            <MarkupManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SalesHub;
