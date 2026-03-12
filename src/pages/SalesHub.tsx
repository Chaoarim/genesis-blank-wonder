import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSalesData } from '@/hooks/useSalesData';
import { usePartsDatabase } from '@/hooks/usePartsDatabase';
import { useSellerPermissions } from '@/hooks/useSellerPermissions';
import { SalesDashboard } from '@/components/sales/SalesDashboard';
import { RenewalWarning } from '@/components/RenewalWarning';
import { CustomersManager } from '@/components/sales/CustomersManager';
import { CustomerPortfolio } from '@/components/sales/CustomerPortfolio';
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
import { PaymentTermsManager } from '@/components/sales/PaymentTermsManager';
import { WarrantyReturnsManager } from '@/components/sales/WarrantyReturnsManager';
import { CreditApprovalsManager } from '@/components/sales/CreditApprovalsManager';
import { AccountsPayableManager } from '@/components/sales/AccountsPayableManager';
import { SalesHubSidebar, ALL_TAB_VALUES } from '@/components/sales/SalesHubSidebar';
import { RepurchaseAlerts } from '@/components/sales/RepurchaseAlerts';
import { SupplierContactsManager } from '@/components/sales/SupplierContactsManager';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { BarChart3, LogOut, ArrowLeft, Zap, Search, Link2, ExternalLink, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { HelpGuide } from '@/components/sales/HelpGuide';

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
  const visibleTabs = ALL_TAB_VALUES.filter(tab => sellerPerms.hasPermission(tab));

  // If active tab is not visible, fallback to new-sale
  useEffect(() => {
    if (!sellerPerms.loading && !visibleTabs.includes(activeTab)) {
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SalesDashboard stats={salesData.stats} onNewSale={goToNewSale} recentSales={salesData.sales.slice(0, 5)} sellerName={sellerPerms.isAdmin ? null : sellerPerms.sellerRecord?.name || null} />;
      case 'new-sale':
        return (
          <NewSaleForm
            customers={salesData.allCustomers}
            parts={parts}
            onAddCustomer={salesData.addCustomer}
            onCreateSale={salesData.createSale}
            onDone={() => setActiveTab('dashboard')}
            adminUserId={sellerPerms.adminUserId}
            sellerName={sellerPerms.isAdmin ? null : sellerPerms.sellerRecord?.name || null}
            sellerAuthId={sellerPerms.isAdmin ? null : (user?.id || null)}
            sellers={sellerPerms.sellers}
          />
        );
      case 'orders':
        return <CatalogOrdersManager />;
      case 'inventory':
        return <InventorySearch adminUserId={sellerPerms.adminUserId} />;
      case 'low-stock':
        return <LowStockReport adminUserId={sellerPerms.adminUserId} />;
      case 'history':
        return <SalesHistory sales={salesData.sales} onDeleteSale={salesData.deleteSale} getSaleItems={salesData.getSaleItems} />;
      case 'customers':
        return (
          <CustomersManager
            customers={salesData.customers}
            sales={salesData.sales}
            onAdd={salesData.addCustomer}
            onUpdate={salesData.updateCustomer}
            onDelete={salesData.deleteCustomer}
            isAdmin={sellerPerms.isAdmin}
            sellers={sellerPerms.sellers}
          />
        );
      case 'carteira':
        return <CustomerPortfolio customers={salesData.allCustomers} sales={salesData.allSales} isAdmin={sellerPerms.isAdmin} sellers={sellerPerms.sellers} onUpdate={salesData.updateCustomer} />;
      case 'goals':
        return (
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
        );
      case 'markup':
        return <MarkupManager />;
      case 'import-inventory':
        return <ImportInventoryTab adminUserId={sellerPerms.adminUserId} />;
      case 'manual-product':
        return <ManualProductForm onProductAdded={() => toast.success('Produto cadastrado! Veja na aba Estoque.')} />;
      case 'promotions':
        return <PromotionsManager />;
      case 'coupons':
        return <CouponsManager />;
      case 'sellers':
        return sellerPerms.isAdmin ? (
          <SellersManager
            sellers={sellerPerms.sellers}
            onRemoveSeller={sellerPerms.removeSeller}
            onToggleActive={sellerPerms.toggleSellerActive}
            onSetPermissions={sellerPerms.setSellerPermissions}
            onGetPermissions={sellerPerms.getSellerPermissions}
            onRefreshSellers={sellerPerms.refreshSellers}
          />
        ) : null;
      case 'commissions':
        if (sellerPerms.isAdmin && user) return <CommissionsManager userId={user.id} />;
        if (!sellerPerms.isAdmin && user) return <SellerCommissionsReport sales={salesData.sales} userId={sellerPerms.adminUserId ?? user.id} sellerName={sellerPerms.sellerRecord?.name} />;
        return null;
      case 'payment-terms':
        return sellerPerms.isAdmin && user ? <PaymentTermsManager userId={user.id} /> : null;
      case 'warranty':
        return user ? <WarrantyReturnsManager userId={sellerPerms.adminUserId || user.id} customers={salesData.allCustomers} sales={salesData.allSales} getSaleItems={salesData.getSaleItems} /> : null;
      case 'credit':
        return sellerPerms.isAdmin && user ? <CreditApprovalsManager userId={user.id} reviewerName="Admin" /> : null;
      case 'accounts-payable':
        return user ? <AccountsPayableManager userId={sellerPerms.adminUserId || user.id} /> : null;
      case 'repurchase-alerts':
        return <RepurchaseAlerts sales={salesData.sales} customers={salesData.customers} />;
      case 'supplier-contacts':
        return user ? <SupplierContactsManager userId={sellerPerms.adminUserId || user.id} /> : null;
      case 'report':
        if (sellerPerms.isAdmin && user) return <SellerCommissionsReport sales={salesData.allSales} userId={user.id} />;
        if (!sellerPerms.isAdmin && user) return <SellerCommissionsReport sales={salesData.sales} userId={sellerPerms.adminUserId ?? user.id} sellerName={sellerPerms.sellerRecord?.name} />;
        return null;
      case 'help':
        return <HelpGuide />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-b from-background to-muted/20">
        <SalesHubSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          visibleTabs={visibleTabs}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="shrink-0" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-sm font-bold leading-tight">Central de Vendas</h1>
                    <p className="text-[10px] text-muted-foreground">
                      {sellerPerms.isAdmin ? 'Administrador' : `Vendedor: ${sellerPerms.sellerRecord?.name}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick links */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs hidden md:flex" onClick={() => navigate('/buscar-pecas')}>
                  <Search className="w-3.5 h-3.5" />
                  Buscar Peças
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir Catálogo B2B" onClick={() => {
                  const catalogUrl = `${window.location.origin}/catalogo/${sellerPerms.adminUserId || user?.id}`;
                  window.open(catalogUrl, '_blank');
                }}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Copiar Link do Catálogo" onClick={() => {
                  const catalogUrl = `${window.location.origin}/catalogo/${sellerPerms.adminUserId || user?.id}`;
                  navigator.clipboard.writeText(catalogUrl);
                  toast.success('Link do catálogo copiado!');
                }}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Enviar por WhatsApp" onClick={() => {
                  const catalogUrl = `${window.location.origin}/catalogo/${sellerPerms.adminUserId || user?.id}`;
                  const msg = encodeURIComponent(`Confira nosso catálogo de peças: ${catalogUrl}`);
                  window.open(`https://wa.me/?text=${msg}`, '_blank');
                }}>
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-xs">
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-4">
            <RenewalWarning />
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SalesHub;
