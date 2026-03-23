import { useEffect, useState, useMemo } from 'react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  BarChart3, PlusCircle, ShoppingBag, Package, AlertTriangle, History,
  Users, BookUser, Target, Percent, FileSpreadsheet, PackagePlus, Tag,
  Ticket, UserCog, DollarSign, Calendar, ShieldCheck, CreditCard, Receipt,
  FileBarChart, BellRing, Contact, HelpCircle, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: BarChart3, 'new-sale': PlusCircle, orders: ShoppingBag,
  history: History, help: HelpCircle, customers: Users, carteira: BookUser,
  credit: CreditCard, inventory: Package, 'low-stock': AlertTriangle,
  'import-inventory': FileSpreadsheet, 'manual-product': PackagePlus,
  markup: Percent, promotions: Tag, coupons: Ticket,
  'payment-terms': Calendar, goals: Target, sellers: UserCog,
  commissions: DollarSign, report: FileBarChart,
  'repurchase-alerts': BellRing, 'supplier-contacts': Contact,
  warranty: ShieldCheck, 'accounts-payable': Receipt,
};

const LABELS: Record<string, { label: string; keywords: string }> = {
  dashboard: { label: 'Dashboard', keywords: 'painel resumo gráficos' },
  'new-sale': { label: 'Nova Venda', keywords: 'vender criar pedido' },
  orders: { label: 'Pedidos', keywords: 'pedidos catálogo' },
  history: { label: 'Histórico de Vendas', keywords: 'vendas anteriores' },
  help: { label: 'Como Usar', keywords: 'ajuda guia tutorial' },
  customers: { label: 'Clientes', keywords: 'cliente cadastro' },
  carteira: { label: 'Carteira de Clientes', keywords: 'portfólio' },
  credit: { label: 'Aprovação de Crédito', keywords: 'limite crédito' },
  inventory: { label: 'Estoque', keywords: 'produtos peças estoque' },
  'low-stock': { label: 'Estoque Baixo', keywords: 'alerta faltando' },
  'import-inventory': { label: 'Importar Estoque', keywords: 'planilha excel csv' },
  'manual-product': { label: 'Cadastrar Produto', keywords: 'novo produto manual' },
  markup: { label: 'Markup', keywords: 'margem preço lucro' },
  promotions: { label: 'Ofertas / Promoções', keywords: 'desconto oferta' },
  coupons: { label: 'Cupons de Desconto', keywords: 'cupom código' },
  'payment-terms': { label: 'Prazos de Pagamento', keywords: 'parcelas prazo' },
  goals: { label: 'Metas', keywords: 'meta objetivo' },
  sellers: { label: 'Vendedores', keywords: 'equipe vendedor' },
  commissions: { label: 'Comissões', keywords: 'comissão percentual' },
  report: { label: 'Relatório de Comissões', keywords: 'relatório report' },
  'repurchase-alerts': { label: 'Alertas de Recompra', keywords: 'recompra alerta' },
  'supplier-contacts': { label: 'Fornecedores', keywords: 'fornecedor contato' },
  warranty: { label: 'Garantia / Devoluções', keywords: 'garantia devolução troca' },
  'accounts-payable': { label: 'Contas a Pagar', keywords: 'boleto conta pagar' },
};

interface CommandPaletteProps {
  onNavigate: (tab: string) => void;
  visibleTabs: string[];
}

export function CommandPalette({ onNavigate, visibleTabs }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const items = useMemo(
    () => visibleTabs.filter(t => LABELS[t]).map(t => ({
      value: t,
      label: LABELS[t].label,
      keywords: LABELS[t].keywords,
      Icon: ICON_MAP[t] || Package,
    })),
    [visibleTabs]
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs text-muted-foreground hidden md:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="w-3.5 h-3.5" />
        Buscar...
        <kbd className="pointer-events-none ml-1 inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar módulo, cliente, ação..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Módulos">
            {items.map(({ value, label, keywords, Icon }) => (
              <CommandItem
                key={value}
                value={`${label} ${keywords}`}
                onSelect={() => { onNavigate(value); setOpen(false); }}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
