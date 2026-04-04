import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, PlusCircle, ShoppingBag, Package, AlertTriangle, History,
  Users, BookUser, Target, Percent, FileSpreadsheet, PackagePlus, Tag,
  Ticket, UserCog, DollarSign, Calendar, ShieldCheck, CreditCard, Receipt,
  FileBarChart, BellRing, Contact, HelpCircle, ChevronDown, TrendingUp, Shield, FileText,
  Clock, Wallet, PackageCheck, Car
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
  // 🛒 Vender
  { value: 'dashboard', icon: BarChart3, label: 'Painel Geral', group: 'Vender' },
  { value: 'kpis', icon: TrendingUp, label: 'Indicadores', group: 'Vender' },
  { value: 'new-sale', icon: PlusCircle, label: 'Nova Venda', group: 'Vender' },
  { value: 'orders', icon: ShoppingBag, label: 'Pedidos', group: 'Vender' },
  { value: 'history', icon: History, label: 'Histórico', group: 'Vender' },
  { value: 'saved-quotes', icon: ShoppingBag, label: 'Orçamentos', group: 'Vender' },
  { value: 'monthly-report', icon: FileText, label: 'Relatório Mensal', group: 'Vender' },
  { value: 'sales-by-channel', icon: BarChart3, label: 'Vendas por Canal', group: 'Vender' },
  { value: 'demand-forecast', icon: TrendingUp, label: 'Previsão de Demanda', group: 'Vender' },
  { value: 'fleet-rankings', icon: Car, label: 'Tendências de Mercado', group: 'Vender' },
  { value: 'expedition', icon: PackageCheck, label: 'Expedição', group: 'Vender' },

  // 👥 Clientes
  { value: 'customers', icon: Users, label: 'Meus Clientes', group: 'Clientes' },
  { value: 'carteira', icon: BookUser, label: 'Carteira', group: 'Clientes' },
  { value: 'credit', icon: CreditCard, label: 'Aprovação de Crédito', group: 'Clientes' },
  { value: 'repurchase-alerts', icon: BellRing, label: 'Alertas de Recompra', group: 'Clientes' },
  { value: 'customer-profitability', icon: TrendingUp, label: 'Rentabilidade', group: 'Clientes' },
  { value: 'customer-interactions', icon: BookUser, label: 'Interações', group: 'Clientes' },

  // 📦 Produtos & Estoque
  { value: 'inventory', icon: Package, label: 'Consultar Estoque', group: 'Produtos' },
  { value: 'low-stock', icon: AlertTriangle, label: 'Estoque Baixo', group: 'Produtos' },
  { value: 'replenishment', icon: TrendingUp, label: 'Sugestão de Reposição', group: 'Produtos' },
  { value: 'import-inventory', icon: FileSpreadsheet, label: 'Importar Estoque', group: 'Produtos' },
  { value: 'manual-product', icon: PackagePlus, label: 'Cadastrar Produto', group: 'Produtos' },
  { value: 'supplier-contacts', icon: Contact, label: 'Fornecedores', group: 'Produtos' },
  { value: 'product-kits', icon: Package, label: 'Kits de Peças', group: 'Produtos' },
  { value: 'price-history', icon: Clock, label: 'Histórico de Preços', group: 'Produtos' },
  { value: 'distributor-prices', icon: FileSpreadsheet, label: 'Tabela Distribuidor', group: 'Produtos' },

  // 💰 Financeiro
  { value: 'markup', icon: Percent, label: 'Markup', group: 'Financeiro' },
  { value: 'promotions', icon: Tag, label: 'Ofertas & Promoções', group: 'Financeiro' },
  { value: 'coupons', icon: Ticket, label: 'Cupons de Desconto', group: 'Financeiro' },
  { value: 'payment-terms', icon: Calendar, label: 'Prazos de Pagamento', group: 'Financeiro' },
  { value: 'accounts-payable', icon: Receipt, label: 'Contas a Pagar', group: 'Financeiro' },
  { value: 'accounts-receivable', icon: DollarSign, label: 'Contas a Receber', group: 'Financeiro' },
  { value: 'abc-curve', icon: TrendingUp, label: 'Curva ABC', group: 'Financeiro' },
  { value: 'billing-calendar', icon: Calendar, label: 'Agenda de Cobranças', group: 'Financeiro' },
  { value: 'cash-flow', icon: TrendingUp, label: 'Fluxo de Caixa', group: 'Financeiro' },
  { value: 'customer-price-tiers', icon: Tag, label: 'Preços por Cliente', group: 'Financeiro' },

  // 🏢 Equipe
  { value: 'goals', icon: Target, label: 'Metas', group: 'Equipe' },
  { value: 'sellers', icon: UserCog, label: 'Vendedores', group: 'Equipe' },
  { value: 'commissions', icon: DollarSign, label: 'Comissões', group: 'Equipe' },
  { value: 'commission-payments', icon: Wallet, label: 'Pagto. Comissões', group: 'Equipe' },
  { value: 'report', icon: FileBarChart, label: 'Relatório da Equipe', group: 'Equipe' },

  // ❓ Ajuda & Suporte
  { value: 'warranty', icon: ShieldCheck, label: 'Garantia & Devoluções', group: 'Ajuda' },
  { value: 'audit-logs', icon: Shield, label: 'Logs do Sistema', group: 'Ajuda' },
  { value: 'backup-excel', icon: FileSpreadsheet, label: 'Backup Excel', group: 'Ajuda' },
  { value: 'whatsapp-notif', icon: BellRing, label: 'Notificações WhatsApp', group: 'Ajuda' },
  { value: 'help', icon: HelpCircle, label: 'Como Usar', group: 'Ajuda' },
];

const GROUP_ICONS: Record<string, string> = {
  'Vender': '🛒',
  'Clientes': '👥',
  'Produtos': '📦',
  'Financeiro': '💰',
  'Equipe': '🏢',
  'Ajuda': '❓',
};

const GROUPS = ['Vender', 'Clientes', 'Produtos', 'Financeiro', 'Equipe', 'Ajuda'];

interface SalesHubSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  visibleTabs: string[];
  badgeCounts?: Record<string, number>;
}

export function SalesHubSidebar({ activeTab, onTabChange, visibleTabs, badgeCounts = {} }: SalesHubSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const filteredItems = MENU_ITEMS.filter(item => visibleTabs.includes(item.value));

  // Find which group the active tab belongs to
  const activeGroup = MENU_ITEMS.find(i => i.value === activeTab)?.group;

  // Collapsible state: Principal always open, active group open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    GROUPS.forEach(g => { initial[g] = g === 'Vender' || g === activeGroup; });
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
                    {items.map(item => {
                      const badge = badgeCounts[item.value] || 0;
                      return (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          isActive={activeTab === item.value}
                          onClick={() => onTabChange(item.value)}
                          tooltip={item.label}
                          className={`relative ${
                            activeTab === item.value
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {badge > 0 && (
                            <span className="absolute top-0.5 left-5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-0.5">
                              {badge > 9 ? '9+' : badge}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      );
                    })}
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
                      {items.map(item => {
                        const badge = badgeCounts[item.value] || 0;
                        return (
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
                            <span className="flex-1">{item.label}</span>
                            {badge > 0 && (
                              <Badge className="h-5 min-w-5 px-1 text-[10px] bg-destructive text-destructive-foreground border-0 flex items-center justify-center ml-auto">
                                {badge > 99 ? '99+' : badge}
                              </Badge>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        );
                      })}
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
