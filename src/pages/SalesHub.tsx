import { useEffect, useState, useCallback, lazy, Suspense, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSalesData } from '@/hooks/useSalesData';
import { usePartsDatabase } from '@/hooks/usePartsDatabase';
import { useSellerPermissions } from '@/hooks/useSellerPermissions';
import { RenewalWarning } from '@/components/RenewalWarning';
import { SalesHubSidebar, ALL_TAB_VALUES } from '@/components/sales/SalesHubSidebar';
import { CommandPalette } from '@/components/sales/CommandPalette';
import { BottomNav } from '@/components/sales/BottomNav';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { BarChart3, LogOut, Zap, Search, ExternalLink, Copy, Share2, Loader2, Keyboard } from 'lucide-react';
import { CatalogQRCode } from '@/components/dashboard/CatalogQRCode';
import { ThemeToggle } from '@/components/sales/ThemeToggle';
import { toast } from 'sonner';
import { NotificationsDropdown } from '@/components/sales/NotificationsDropdown';
import type { User } from '@supabase/supabase-js';

// Lazy-loaded tab components
const SalesDashboard = lazy(() => import('@/components/sales/SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const NewSaleForm = lazy(() => import('@/components/sales/NewSaleForm').then(m => ({ default: m.NewSaleForm })));
const CatalogOrdersManager = lazy(() => import('@/components/sales/CatalogOrdersManager').then(m => ({ default: m.CatalogOrdersManager })));
const InventorySearch = lazy(() => import('@/components/sales/InventorySearch').then(m => ({ default: m.InventorySearch })));
const LowStockReport = lazy(() => import('@/components/sales/LowStockReport').then(m => ({ default: m.LowStockReport })));
const ImportInventoryTab = lazy(() => import('@/components/sales/ImportInventoryTab').then(m => ({ default: m.ImportInventoryTab })));
const SalesHistory = lazy(() => import('@/components/sales/SalesHistory').then(m => ({ default: m.SalesHistory })));
const CustomersManager = lazy(() => import('@/components/sales/CustomersManager').then(m => ({ default: m.CustomersManager })));
const CustomerPortfolio = lazy(() => import('@/components/sales/CustomerPortfolio').then(m => ({ default: m.CustomerPortfolio })));
const GoalsManager = lazy(() => import('@/components/sales/GoalsManager').then(m => ({ default: m.GoalsManager })));
const MarkupManager = lazy(() => import('@/components/sales/MarkupManager').then(m => ({ default: m.MarkupManager })));
const ManualProductForm = lazy(() => import('@/components/sales/ManualProductForm').then(m => ({ default: m.ManualProductForm })));
const PromotionsManager = lazy(() => import('@/components/sales/PromotionsManager').then(m => ({ default: m.PromotionsManager })));
const CouponsManager = lazy(() => import('@/components/sales/CouponsManager').then(m => ({ default: m.CouponsManager })));
const SellersManager = lazy(() => import('@/components/sales/SellersManager').then(m => ({ default: m.SellersManager })));
const CommissionsManager = lazy(() => import('@/components/sales/CommissionsManager').then(m => ({ default: m.CommissionsManager })));
const SellerCommissionsReport = lazy(() => import('@/components/sales/SellerCommissionsReport').then(m => ({ default: m.SellerCommissionsReport })));
const PaymentTermsManager = lazy(() => import('@/components/sales/PaymentTermsManager').then(m => ({ default: m.PaymentTermsManager })));
const WarrantyReturnsManager = lazy(() => import('@/components/sales/WarrantyReturnsManager').then(m => ({ default: m.WarrantyReturnsManager })));
const CreditApprovalsManager = lazy(() => import('@/components/sales/CreditApprovalsManager').then(m => ({ default: m.CreditApprovalsManager })));
const AccountsPayableManager = lazy(() => import('@/components/sales/AccountsPayableManager').then(m => ({ default: m.AccountsPayableManager })));
const AccountsReceivableManager = lazy(() => import('@/components/sales/AccountsReceivableManager').then(m => ({ default: m.AccountsReceivableManager })));
const RepurchaseAlerts = lazy(() => import('@/components/sales/RepurchaseAlerts').then(m => ({ default: m.RepurchaseAlerts })));
const SupplierContactsManager = lazy(() => import('@/components/sales/SupplierContactsManager').then(m => ({ default: m.SupplierContactsManager })));
const HelpGuide = lazy(() => import('@/components/sales/HelpGuide').then(m => ({ default: m.HelpGuide })));
const OnboardingWizard = lazy(() => import('@/components/sales/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const ABCCurveReport = lazy(() => import('@/components/sales/ABCCurveReport').then(m => ({ default: m.ABCCurveReport })));
const AuditLogsViewer = lazy(() => import('@/components/sales/AuditLogsViewer').then(m => ({ default: m.AuditLogsViewer })));
const MonthlyReport = lazy(() => import('@/components/sales/MonthlyReport').then(m => ({ default: m.MonthlyReport })));
const PriceHistoryViewer = lazy(() => import('@/components/sales/PriceHistoryViewer').then(m => ({ default: m.PriceHistoryViewer })));
const BillingCalendar = lazy(() => import('@/components/sales/BillingCalendar').then(m => ({ default: m.BillingCalendar })));

const TabLoader = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

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

  // Load payables for BillingCalendar
  const [payables, setPayables] = useState<any[]>([]);
  useEffect(() => {
    if (!sellerPerms.adminUserId) return;
    supabase.from('accounts_payable').select('id, supplier_name, amount, due_date, status, paid_at, description')
      .then(({ data }) => { if (data) setPayables(data); });
  }, [sellerPerms.adminUserId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Você saiu');
    navigate('/login');
  };

  const goToNewSale = useCallback(() => setActiveTab('new-sale'), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); setActiveTab('new-sale'); }
      if (e.ctrlKey && e.key === 'h') { e.preventDefault(); setActiveTab('history'); }
      if (e.ctrlKey && e.key === 'd') { e.preventDefault(); setActiveTab('dashboard'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
        return <SalesDashboard stats={salesData.stats} onNewSale={goToNewSale} recentSales={salesData.sales.slice(0, 5)} allSales={salesData.allSales} sellerName={sellerPerms.isAdmin ? null : sellerPerms.sellerRecord?.name || null} />;
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
        return <SalesHistory sales={salesData.sales} onDeleteSale={salesData.deleteSale} getSaleItems={salesData.getSaleItems} onDuplicateSale={(sale, items) => {
          setActiveTab('new-sale');
          toast.success(`Venda duplicada! Preencha os dados e confirme.`);
        }} />;
      case 'monthly-report':
        return <MonthlyReport allSales={salesData.allSales} getSaleItems={salesData.getSaleItems} />;
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
            userId={sellerPerms.adminUserId}
            onRefresh={salesData.fetchAll}
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
        return <ManualProductForm adminUserId={sellerPerms.adminUserId} onProductAdded={() => toast.success('Produto cadastrado! Veja na aba Estoque.')} />;
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
      case 'accounts-receivable':
        return <AccountsReceivableManager sales={salesData.allSales} customers={salesData.allCustomers} onRefresh={salesData.fetchAll} />;
      case 'repurchase-alerts':
        return <RepurchaseAlerts sales={salesData.sales} customers={salesData.customers} />;
      case 'supplier-contacts':
        return user ? <SupplierContactsManager userId={sellerPerms.adminUserId || user.id} /> : null;
      case 'report':
        if (sellerPerms.isAdmin && user) return <SellerCommissionsReport sales={salesData.allSales} userId={user.id} />;
        if (!sellerPerms.isAdmin && user) return <SellerCommissionsReport sales={salesData.sales} userId={sellerPerms.adminUserId ?? user.id} sellerName={sellerPerms.sellerRecord?.name} />;
        return null;
      case 'abc-curve':
        return <ABCCurveReport sales={salesData.allSales} getSaleItems={salesData.getSaleItems} />;
      case 'audit-logs':
        return sellerPerms.isAdmin ? <AuditLogsViewer /> : null;
      case 'price-history':
        return <PriceHistoryViewer adminUserId={sellerPerms.adminUserId} />;
      case 'billing-calendar':
        return <BillingCalendar sales={salesData.allSales} customers={salesData.allCustomers} payables={payables} />;
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
                <ThemeToggle />
                {(sellerPerms.isAdmin || !sellerPerms.isAdmin) && (
                  <NotificationsDropdown
                    adminUserId={sellerPerms.adminUserId}
                    currentAuthId={user?.id || null}
                    sales={salesData.allSales}
                    customers={salesData.allCustomers}
                    onNavigate={setActiveTab}
                  />
                )}
                <CommandPalette onNavigate={setActiveTab} visibleTabs={visibleTabs} />
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
                <CatalogQRCode url={`${window.location.origin}/catalogo/${sellerPerms.adminUserId || user?.id}`} />
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

          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 max-w-6xl mx-auto w-full space-y-4">
            <RenewalWarning />
            <Suspense fallback={<TabLoader />}>
              {renderContent()}
            </Suspense>
          </main>
        </div>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} visibleTabs={visibleTabs} />
        <Suspense fallback={null}>
          <OnboardingWizard onNavigate={setActiveTab} />
        </Suspense>
      </div>
    </SidebarProvider>
  );
};

export default SalesHub;
