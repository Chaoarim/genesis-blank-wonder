import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSalesData } from '@/hooks/useSalesData';
import { usePartsDatabase } from '@/hooks/usePartsDatabase';
import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { CustomersManager } from '@/components/sales/CustomersManager';
import { NewSaleForm } from '@/components/sales/NewSaleForm';
import { SalesHistory } from '@/components/sales/SalesHistory';
import { CatalogOrdersManager } from '@/components/sales/CatalogOrdersManager';
import { GoalsManager } from '@/components/sales/GoalsManager';
import { InventorySearch } from '@/components/sales/InventorySearch';
import { LowStockReport } from '@/components/sales/LowStockReport';
import { ImportInventoryTab } from '@/components/sales/ImportInventoryTab';
import { ManualProductForm } from '@/components/sales/ManualProductForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, PlusCircle, History, Target, LogOut, ArrowLeft, Zap, Percent, Package, ShoppingBag, AlertTriangle, FileSpreadsheet, PackagePlus } from 'lucide-react';
import { MarkupManager } from '@/components/sales/MarkupManager';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

const SalesHub = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');

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
          <TabsList className="flex flex-wrap w-full mb-6 h-auto gap-1">
            <TabsTrigger value="dashboard" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="new-sale" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Venda</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="low-stock" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline text-[10px]">Est. Baixo</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Metas</span>
            </TabsTrigger>
            <TabsTrigger value="markup" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <Percent className="w-4 h-4" />
              <span className="hidden sm:inline text-[10px]">Markup</span>
            </TabsTrigger>
            <TabsTrigger value="import-inventory" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline text-[10px]">Importar</span>
            </TabsTrigger>
            <TabsTrigger value="manual-product" className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
              <PackagePlus className="w-4 h-4" />
              <span className="hidden sm:inline text-[10px]">Cadastrar</span>
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

          <TabsContent value="orders">
            <CatalogOrdersManager />
          </TabsContent>

          <TabsContent value="inventory">
            <InventorySearch />
          </TabsContent>

          <TabsContent value="low-stock">
            <LowStockReport />
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

          <TabsContent value="import-inventory">
            <ImportInventoryTab />
          </TabsContent>

          <TabsContent value="manual-product">
            <ManualProductForm onProductAdded={() => toast.success('Produto cadastrado! Veja na aba Estoque.')} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SalesHub;
