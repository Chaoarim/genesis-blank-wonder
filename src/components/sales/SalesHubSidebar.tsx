import {
  BarChart3, PlusCircle, ShoppingBag, Package, AlertTriangle, History,
  Users, BookUser, Target, Percent, FileSpreadsheet, PackagePlus, Tag,
  Ticket, UserCog, DollarSign, Calendar, ShieldCheck, CreditCard, Receipt,
  FileBarChart, BellRing, Contact
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';

interface TabDef {
  value: string;
  icon: React.ElementType;
  label: string;
  group: string;
}

const MENU_ITEMS: TabDef[] = [
  { value: 'dashboard', icon: BarChart3, label: 'Dashboard', group: 'Principal' },
  { value: 'new-sale', icon: PlusCircle, label: 'Nova Venda', group: 'Principal' },
  { value: 'orders', icon: ShoppingBag, label: 'Pedidos', group: 'Principal' },
  { value: 'history', icon: History, label: 'Histórico', group: 'Principal' },

  { value: 'customers', icon: Users, label: 'Clientes', group: 'Clientes' },
  { value: 'carteira', icon: BookUser, label: 'Carteira', group: 'Clientes' },
  { value: 'credit', icon: CreditCard, label: 'Crédito', group: 'Clientes' },

  { value: 'inventory', icon: Package, label: 'Estoque', group: 'Estoque' },
  { value: 'low-stock', icon: AlertTriangle, label: 'Estoque Baixo', group: 'Estoque' },
  { value: 'import-inventory', icon: FileSpreadsheet, label: 'Importar', group: 'Estoque' },
  { value: 'manual-product', icon: PackagePlus, label: 'Cadastrar Produto', group: 'Estoque' },

  { value: 'markup', icon: Percent, label: 'Markup', group: 'Comercial' },
  { value: 'promotions', icon: Tag, label: 'Ofertas', group: 'Comercial' },
  { value: 'coupons', icon: Ticket, label: 'Cupons', group: 'Comercial' },
  { value: 'payment-terms', icon: Calendar, label: 'Prazos', group: 'Comercial' },

  { value: 'goals', icon: Target, label: 'Metas', group: 'Equipe' },
  { value: 'sellers', icon: UserCog, label: 'Vendedores', group: 'Equipe' },
  { value: 'commissions', icon: DollarSign, label: 'Comissões', group: 'Equipe' },
  { value: 'report', icon: FileBarChart, label: 'Relatório', group: 'Equipe' },

  { value: 'repurchase-alerts', icon: BellRing, label: 'Alertas de Recompra', group: 'Comercial' },
  { value: 'supplier-contacts', icon: Contact, label: 'Fornecedores', group: 'Comercial' },

  { value: 'warranty', icon: ShieldCheck, label: 'Garantia', group: 'Financeiro' },
  { value: 'accounts-payable', icon: Receipt, label: 'Contas a Pagar', group: 'Financeiro' },
];

const GROUPS = ['Principal', 'Clientes', 'Estoque', 'Comercial', 'Equipe', 'Financeiro'];

interface SalesHubSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  visibleTabs: string[];
}

export function SalesHubSidebar({ activeTab, onTabChange, visibleTabs }: SalesHubSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const filteredItems = MENU_ITEMS.filter(item => visibleTabs.includes(item.value));

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-2">
        {GROUPS.map(group => {
          const items = filteredItems.filter(i => i.group === group);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                {group}
              </SidebarGroupLabel>
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
                        {!collapsed && <span>{item.label}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}

export const ALL_TAB_VALUES = MENU_ITEMS.map(m => m.value);
