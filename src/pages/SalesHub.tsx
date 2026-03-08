import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSalesData } from '@/hooks/useSalesData';
import { usePartsDatabase } from '@/hooks/usePartsDatabase';
import { useSellerPermissions } from '@/hooks/useSellerPermissions';
import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { CustomersManager } from '@/components/sales/CustomersManager';
import { NewSaleForm } from '@/components/sales/NewSaleForm';
import { SalesHistory } from '@/components/sales/SalesHistory';
import { CatalogOrdersManager } from '@/components/sales/CatalogOrdersManager';
import { GoalsManager } from '@/components/sales/GoalsManager';
import { InventorySearch } from '@/components/sales/InventorySearch';
import { LowStockReport } from '@/components/sales/LowStockReport';
import { ImportInventoryTab } from '@/components/sales/ImportInventoryTab';
import { PromotionsManager } from '@/components/sales/PromotionsManager';
import { CouponsManager } from '@/components/sales/CouponsManager';
import { ManualProductForm } from '@/components/sales/ManualProductForm';
import { SellersManager } from '@/components/sales/SellersManager';
import { CommissionsManager } from '@/components/sales/CommissionsManager';
import { SellerCommissionsReport } from '@/components/sales/SellerCommissionsReport';
import { MarkupManager } from '@/components/sales/MarkupManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, PlusCircle, History, Target, LogOut, ArrowLeft, Zap, Percent, Package, ShoppingBag, AlertTriangle, FileSpreadsheet, PackagePlus, Tag, Ticket, UserCog, DollarSign, FileBarChart } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

interface TabDef {
  value: string;
  icon: React.ElementType;
  label: string;
  shortLabel?: string;
}

const ALL_TABS: TabDef[] = [
  { value: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { value: 'new-sale', icon: PlusCircle, label: 'Nova Venda' },
  { value: 'orders', icon: ShoppingBag, label: 'Pedidos' },
  { value: 'inventory', icon: Package, label: 'Estoque' },
  { value: 'low-stock', icon: AlertTriangle, label: 'Est. Baixo', shortLabel: 'Est. Baixo' },
  { value: 'history', icon: History, label: 'Histórico' },
  { value: 'customers', icon: Users, label: 'Clientes' },
  { value: 'goals', icon: Target, label: 'Metas' },
  { value: 'markup', icon: Percent, label: 'Markup' },
  { value: 'import-inventory', icon: FileSpreadsheet, label: 'Importar' },
  { value: 'manual-product', icon: PackagePlus, label: 'Cadastrar' },
  { value: 'promotions', icon: Tag, label: 'Ofertas' },
  { value: 'coupons', icon: Ticket, label: 'Cupons' },
  { value: 'sellers', icon: UserCog, label: 'Vendedores' },
  { value: 'commissions', icon: DollarSign, label: 'Comissões' },
  { value: 'report', icon: FileBarChart, label: 'Relatório' },
];

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

  const sellerPerms = useSellerPermissions(user?.id ?? null);
  const sellerAuthId = sellerPerms.isAdmin ? null : (user?.id || null);
  const salesData = useSalesData(sellerPerms.adminUserId ?? null, sellerAuthId);
  const { parts } = usePartsDatabase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Você saiu');
    navigate('/login');
  };

  const goToNewSale = useCallback(() => setActiveTab('new-sale'), []);

  // Filter visible tabs based on permissions
  const visibleTabs = ALL_TABS.filter(tab => sellerPerms.hasPermission(tab.value));

  // If active tab is not visible, fallback to new-sale
  useEffect(() => {
    if (!sellerPerms.loading && !visibleTabs.find(t => t.value === activeTab)) {
      setActiveTab('new-sale');
    }
  }, [sellerPerms.loading, visibleTabs, activeTab]);

  if (loading || sellerPerms.loading) {
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
                <p className="text-xs text-muted-foreground">
                  {sellerPerms.isAdmin ? 'Administrador' : `Vendedor: ${sellerPerms.sellerRecord?.name}`}
                </p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap w-full mb-6 h-auto gap-1">
            {visibleTabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col gap-1 py-2.5 text-xs flex-1 min-w-[60px]">
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline text-[10px]">{tab.shortLabel || tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard">
            <SalesDashboard stats={salesData.stats} onNewSale={goToNewSale} recentSales={salesData.sales.slice(0, 5)} sellerName={sellerPerms.isAdmin ? null : sellerPerms.sellerRecord?.name || null} />
          </TabsContent>

          <TabsContent value="new-sale">
            <NewSaleForm
              customers={salesData.customers}
              parts={parts}
              onAddCustomer={salesData.addCustomer}
              onCreateSale={salesData.createSale}
              onDone={() => setActiveTab('dashboard')}
              adminUserId={sellerPerms.adminUserId}
              sellerName={sellerPerms.isAdmin ? null : sellerPerms.sellerRecord?.name || null}
              sellerAuthId={sellerPerms.isAdmin ? null : (user?.id || null)}
            />
          </TabsContent>

          <TabsContent value="orders">
            <CatalogOrdersManager />
          </TabsContent>

          <TabsContent value="inventory">
            <InventorySearch adminUserId={sellerPerms.adminUserId} />
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
              isAdmin={sellerPerms.isAdmin}
              sellers={sellerPerms.sellers}
            />
          </TabsContent>

          <TabsContent value="goals">
            <GoalsManager
              goals={salesData.goals}
              stats={salesData.stats}
              onSetGoal={salesData.setGoal}
              onDeleteGoal={salesData.deleteGoal}
              isAdmin={sellerPerms.isAdmin}
              sellers={sellerPerms.sellers}
              sales={salesData.allSales}
              sellerAuthId={sellerAuthId}
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

          <TabsContent value="promotions">
            <PromotionsManager />
          </TabsContent>

          <TabsContent value="coupons">
            <CouponsManager />
          </TabsContent>

          <TabsContent value="sellers">
            {sellerPerms.isAdmin && (
              <SellersManager
                sellers={sellerPerms.sellers}
                onAddSeller={sellerPerms.addSeller}
                onRemoveSeller={sellerPerms.removeSeller}
                onToggleActive={sellerPerms.toggleSellerActive}
                onSetPermissions={sellerPerms.setSellerPermissions}
                onGetPermissions={sellerPerms.getSellerPermissions}
              />
            )}
          </TabsContent>

          <TabsContent value="commissions">
            {sellerPerms.isAdmin && user && (
              <CommissionsManager userId={user.id} />
            )}
            {!sellerPerms.isAdmin && user && (
              <SellerCommissionsReport sales={salesData.sales} userId={sellerPerms.adminUserId ?? user.id} sellerName={sellerPerms.sellerRecord?.name} />
            )}
          </TabsContent>

          <TabsContent value="report">
            {sellerPerms.isAdmin && user && (
              <SellerCommissionsReport sales={salesData.allSales} userId={user.id} />
            )}
            {!sellerPerms.isAdmin && user && (
              <SellerCommissionsReport sales={salesData.sales} userId={sellerPerms.adminUserId ?? user.id} />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SalesHub;
