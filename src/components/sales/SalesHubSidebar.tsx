import { useState } from 'react';
import {
  BarChart3, PlusCircle, ShoppingBag, Package, AlertTriangle, History,
  Users, BookUser, Target, Percent, FileSpreadsheet, PackagePlus, Tag,
  Ticket, UserCog, DollarSign, Calendar, ShieldCheck, CreditCard, Receipt,
  FileBarChart, BellRing, Contact, HelpCircle, ChevronDown, TrendingUp, Shield, FileText,
  Clock, Wallet
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface TabDef {
  value: string;
  icon: React.ElementType;
  label: string;
  group: string;
}

const MENU_ITEMS: TabDef[] = [
  // 🛒 Vendas
  { value: 'dashboard', icon: BarChart3, label: 'Dashboard', group: 'Vendas' },
  { value: 'kpis', icon: TrendingUp, label: 'KPIs', group: 'Vendas' },
  { value: 'new-sale', icon: PlusCircle, label: 'Nova Venda', group: 'Vendas' },
  { value: 'orders', icon: ShoppingBag, label: 'Pedidos', group: 'Vendas' },
  { value: 'history', icon: History, label: 'Histórico', group: 'Vendas' },
  { value: 'saved-quotes', icon: ShoppingBag, label: 'Orçamentos', group: 'Vendas' },
  { value: 'monthly-report', icon: FileText, label: 'Relatório Mensal', group: 'Vendas' },
  { value: 'sales-by-channel', icon: BarChart3, label: 'Vendas por Canal', group: 'Vendas' },
  { value: 'demand-forecast', icon: TrendingUp, label: 'Previsão Demanda', group: 'Vendas' },

  // 👥 Clientes
  { value: 'customers', icon: Users, label: 'Clientes', group: 'Clientes' },
  { value: 'carteira', icon: BookUser, label: 'Carteira', group: 'Clientes' },
  { value: 'credit', icon: CreditCard, label: 'Crédito', group: 'Clientes' },
  { value: 'repurchase-alerts', icon: BellRing, label: 'Alertas Recompra', group: 'Clientes' },
  { value: 'customer-profitability', icon: TrendingUp, label: 'Rentabilidade', group: 'Clientes' },

  // 📦 Estoque
  { value: 'inventory', icon: Package, label: 'Consulta', group: 'Estoque' },
  { value: 'low-stock', icon: AlertTriangle, label: 'Estoque Baixo', group: 'Estoque' },
  { value: 'import-inventory', icon: FileSpreadsheet, label: 'Importar', group: 'Estoque' },
  { value: 'manual-product', icon: PackagePlus, label: 'Cadastrar', group: 'Estoque' },
  { value: 'supplier-contacts', icon: Contact, label: 'Fornecedores', group: 'Estoque' },

  // 💰 Financeiro
  { value: 'markup', icon: Percent, label: 'Markup', group: 'Financeiro' },
  { value: 'promotions', icon: Tag, label: 'Ofertas', group: 'Financeiro' },
  { value: 'coupons', icon: Ticket, label: 'Cupons', group: 'Financeiro' },
  { value: 'payment-terms', icon: Calendar, label: 'Prazos', group: 'Financeiro' },
  { value: 'accounts-payable', icon: Receipt, label: 'Contas a Pagar', group: 'Financeiro' },
  { value: 'accounts-receivable', icon: DollarSign, label: 'Contas a Receber', group: 'Financeiro' },
  { value: 'abc-curve', icon: TrendingUp, label: 'Curva ABC', group: 'Financeiro' },
  { value: 'billing-calendar', icon: Calendar, label: 'Agenda Cobranças', group: 'Financeiro' },
  { value: 'price-history', icon: Clock, label: 'Histórico Preços', group: 'Estoque' },
  { value: 'customer-price-tiers', icon: Tag, label: 'Preços por Cliente', group: 'Financeiro' },

  // 👥 Equipe
  { value: 'goals', icon: Target, label: 'Metas', group: 'Equipe' },
  { value: 'sellers', icon: UserCog, label: 'Vendedores', group: 'Equipe' },
  { value: 'commissions', icon: DollarSign, label: 'Comissões', group: 'Equipe' },
  { value: 'commission-payments', icon: Wallet, label: 'Pgto Comissões', group: 'Equipe' },
  { value: 'report', icon: FileBarChart, label: 'Relatório', group: 'Equipe' },

  // ❓ Ajuda
  { value: 'warranty', icon: ShieldCheck, label: 'Garantia', group: 'Suporte' },
  { value: 'audit-logs', icon: Shield, label: 'Logs', group: 'Suporte' },
  { value: 'backup-excel', icon: FileSpreadsheet, label: 'Backup Excel', group: 'Suporte' },
  { value: 'help', icon: HelpCircle, label: 'Como Usar', group: 'Suporte' },
];

const GROUP_ICONS: Record<string, string> = {
  'Vendas': '🛒',
  'Clientes': '👥',
  'Estoque': '📦',
  'Financeiro': '💰',
  'Equipe': '🏢',
  'Suporte': '❓',
};

const GROUPS = ['Vendas', 'Clientes', 'Estoque', 'Financeiro', 'Equipe', 'Suporte'];

interface SalesHubSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  visibleTabs: string[];
}

export function SalesHubSidebar({ activeTab, onTabChange, visibleTabs }: SalesHubSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const filteredItems = MENU_ITEMS.filter(item => visibleTabs.includes(item.value));

  // Find which group the active tab belongs to
  const activeGroup = MENU_ITEMS.find(i => i.value === activeTab)?.group;

  // Collapsible state: Principal always open, active group open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { Vendas: true };
    GROUPS.forEach(g => { initial[g] = g === 'Principal' || g === activeGroup; });
    return initial;
  });

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border hidden md:flex">
      <SidebarContent className="pt-2">
        {GROUPS.map(group => {
          const items = filteredItems.filter(i => i.group === group);
          if (items.length === 0) return null;

          const isOpen = openGroups[group] ?? false;
          const hasActiveItem = items.some(i => i.value === activeTab);

          // In collapsed mode, show all items without collapsible
          if (collapsed) {
            return (
              <SidebarGroup key={group}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map(item => (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          isActive={activeTab === item.value}
                          onClick={() => onTabChange(item.value)}
                          tooltip={item.label}
                          className={
                            activeTab === item.value
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted/50'
                          }
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <Collapsible
              key={group}
              open={isOpen || hasActiveItem}
              onOpenChange={() => toggleGroup(group)}
            >
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold cursor-pointer hover:text-muted-foreground flex items-center justify-between pr-2">
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs">{GROUP_ICONS[group] || ''}</span>
                      {group}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen || hasActiveItem ? 'rotate-180' : ''}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items.map(item => (
                        <SidebarMenuItem key={item.value}>
                          <SidebarMenuButton
                            isActive={activeTab === item.value}
                            onClick={() => onTabChange(item.value)}
                            tooltip={item.label}
                            className={
                              activeTab === item.value
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-muted/50'
                            }
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}

export const ALL_TAB_VALUES = MENU_ITEMS.map(m => m.value);
