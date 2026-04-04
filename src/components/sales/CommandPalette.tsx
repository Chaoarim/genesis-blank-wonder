import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import {
  BarChart3, PlusCircle, ShoppingBag, Package, AlertTriangle, History,
  Users, BookUser, Target, Percent, FileSpreadsheet, PackagePlus, Tag,
  Ticket, UserCog, DollarSign, Calendar, ShieldCheck, CreditCard, Receipt,
  FileBarChart, BellRing, Contact, HelpCircle, Search, User, BoxIcon, TrendingUp,
  Clock, Wallet, PackageCheck, Car, Shield, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const ICON_MAP: Record<string, React.ElementType> = {
  dashboard: BarChart3, kpis: TrendingUp, 'new-sale': PlusCircle, orders: ShoppingBag,
  history: History, help: HelpCircle, customers: Users, carteira: BookUser,
  credit: CreditCard, inventory: Package, 'low-stock': AlertTriangle,
  'import-inventory': FileSpreadsheet, 'manual-product': PackagePlus,
  markup: Percent, promotions: Tag, coupons: Ticket,
  'payment-terms': Calendar, goals: Target, sellers: UserCog,
  commissions: DollarSign, report: FileBarChart,
  'repurchase-alerts': BellRing, 'supplier-contacts': Contact,
  warranty: ShieldCheck, 'accounts-payable': Receipt,
  'accounts-receivable': DollarSign, 'saved-quotes': ShoppingBag,
  'monthly-report': FileText, 'sales-by-channel': BarChart3,
  'demand-forecast': TrendingUp, 'fleet-rankings': Car,
  expedition: PackageCheck, 'customer-profitability': TrendingUp,
  'customer-interactions': BookUser, 'product-kits': Package,
  'price-history': Clock, 'distributor-prices': FileSpreadsheet,
  'abc-curve': TrendingUp, 'billing-calendar': Calendar,
  'cash-flow': TrendingUp, 'customer-price-tiers': Tag,
  'commission-payments': Wallet, 'backup-excel': FileSpreadsheet,
  'whatsapp-notif': BellRing, 'audit-logs': Shield,
  replenishment: TrendingUp,
};

const LABELS: Record<string, { label: string; keywords: string }> = {
  dashboard: { label: 'Painel Geral', keywords: 'painel resumo gráficos início' },
  kpis: { label: 'Indicadores', keywords: 'kpi métricas indicador' },
  'new-sale': { label: 'Nova Venda', keywords: 'vender criar pedido' },
  orders: { label: 'Pedidos', keywords: 'pedidos catálogo' },
  history: { label: 'Histórico de Vendas', keywords: 'vendas anteriores' },
  'saved-quotes': { label: 'Orçamentos', keywords: 'orçamento cotação' },
  'monthly-report': { label: 'Relatório Mensal', keywords: 'relatório mensal' },
  'sales-by-channel': { label: 'Vendas por Canal', keywords: 'canal balcão' },
  'demand-forecast': { label: 'Previsão de Demanda', keywords: 'previsão demanda' },
  'fleet-rankings': { label: 'Tendências de Mercado', keywords: 'frota emplacamento ranking' },
  expedition: { label: 'Expedição', keywords: 'expedição conferência' },
  help: { label: 'Como Usar', keywords: 'ajuda guia tutorial' },
  customers: { label: 'Meus Clientes', keywords: 'cliente cadastro' },
  carteira: { label: 'Carteira de Clientes', keywords: 'portfólio carteira' },
  credit: { label: 'Aprovação de Crédito', keywords: 'limite crédito' },
  'repurchase-alerts': { label: 'Alertas de Recompra', keywords: 'recompra alerta' },
  'customer-profitability': { label: 'Rentabilidade', keywords: 'rentabilidade lucro cliente' },
  'customer-interactions': { label: 'Interações', keywords: 'interação contato histórico' },
  inventory: { label: 'Consultar Estoque', keywords: 'produtos peças estoque buscar' },
  'low-stock': { label: 'Estoque Baixo', keywords: 'alerta faltando' },
  replenishment: { label: 'Sugestão de Reposição', keywords: 'reposição sugestão compra' },
  'import-inventory': { label: 'Importar Estoque', keywords: 'planilha excel csv importar' },
  'manual-product': { label: 'Cadastrar Produto', keywords: 'novo produto manual cadastrar' },
  'supplier-contacts': { label: 'Fornecedores', keywords: 'fornecedor contato distribuidora' },
  'product-kits': { label: 'Kits de Peças', keywords: 'kit combo conjunto' },
  'price-history': { label: 'Histórico de Preços', keywords: 'preço histórico variação' },
  'distributor-prices': { label: 'Tabela Distribuidor', keywords: 'tabela preço distribuidor' },
  markup: { label: 'Markup', keywords: 'margem preço lucro markup' },
  promotions: { label: 'Ofertas / Promoções', keywords: 'desconto oferta promoção' },
  coupons: { label: 'Cupons de Desconto', keywords: 'cupom código desconto' },
  'payment-terms': { label: 'Prazos de Pagamento', keywords: 'parcelas prazo pagamento' },
  'accounts-payable': { label: 'Contas a Pagar', keywords: 'boleto conta pagar fornecedor' },
  'accounts-receivable': { label: 'Contas a Receber', keywords: 'receber cobrança cliente' },
  'abc-curve': { label: 'Curva ABC', keywords: 'abc pareto análise' },
  'billing-calendar': { label: 'Agenda de Cobranças', keywords: 'agenda cobrança calendario' },
  'cash-flow': { label: 'Fluxo de Caixa', keywords: 'fluxo caixa projeção' },
  'customer-price-tiers': { label: 'Preços por Cliente', keywords: 'preço tabela tier' },
  goals: { label: 'Metas', keywords: 'meta objetivo vendas' },
  sellers: { label: 'Vendedores', keywords: 'equipe vendedor' },
  commissions: { label: 'Comissões', keywords: 'comissão percentual' },
  'commission-payments': { label: 'Pagto. Comissões', keywords: 'pagamento comissão' },
  report: { label: 'Relatório da Equipe', keywords: 'relatório equipe vendedor' },
  warranty: { label: 'Garantia / Devoluções', keywords: 'garantia devolução troca' },
  'audit-logs': { label: 'Logs do Sistema', keywords: 'log auditoria sistema' },
  'backup-excel': { label: 'Backup Excel', keywords: 'backup excel exportar' },
  'whatsapp-notif': { label: 'Notificações WhatsApp', keywords: 'whatsapp notificação' },
};

interface SearchResult {
  id: string;
  type: 'customer' | 'product' | 'sale';
  label: string;
  sublabel: string;
  tab: string;
}

interface CommandPaletteProps {
  onNavigate: (tab: string) => void;
  visibleTabs: string[];
}

export function CommandPalette({ onNavigate, visibleTabs }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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

  // Reset on close
  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); }
  }, [open]);

  const searchData = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const term = `%${q}%`;

    const [custRes, invRes, saleRes] = await Promise.all([
      supabase.from('customers').select('id, name, phone, empresa').ilike('name', term).limit(5),
      supabase.from('inventory_items').select('id, codigo, produto, fornecedor').or(`codigo.ilike.${term},produto.ilike.${term}`).limit(5),
      supabase.from('sales').select('id, customer_name, total, created_at').ilike('customer_name', term).order('created_at', { ascending: false }).limit(5),
    ]);

    const items: SearchResult[] = [];

    if (custRes.data) {
      for (const c of custRes.data) {
        items.push({
          id: `cust-${c.id}`,
          type: 'customer',
          label: c.name,
          sublabel: c.empresa || c.phone || '',
          tab: 'customers',
        });
      }
    }

    if (invRes.data) {
      for (const p of invRes.data) {
        items.push({
          id: `inv-${p.id}`,
          type: 'product',
          label: `${p.codigo} — ${p.produto}`,
          sublabel: p.fornecedor || '',
          tab: 'inventory',
        });
      }
    }

    if (saleRes.data) {
      for (const s of saleRes.data) {
        items.push({
          id: `sale-${s.id}`,
          type: 'sale',
          label: s.customer_name || 'Venda',
          sublabel: `R$ ${Number(s.total).toFixed(2)} — ${new Date(s.created_at).toLocaleDateString('pt-BR')}`,
          tab: 'history',
        });
      }
    }

    setResults(items);
    setSearching(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchData(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchData]);

  const moduleItems = useMemo(
    () => visibleTabs.filter(t => LABELS[t]).map(t => ({
      value: t,
      label: LABELS[t].label,
      keywords: LABELS[t].keywords,
      Icon: ICON_MAP[t] || Package,
    })),
    [visibleTabs]
  );

  const typeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer': return User;
      case 'product': return BoxIcon;
      case 'sale': return Receipt;
    }
  };

  const typeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer': return 'Clientes';
      case 'product': return 'Produtos';
      case 'sale': return 'Vendas';
    }
  };

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    }
    return groups;
  }, [results]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar cliente, produto, venda ou módulo..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {searching ? 'Buscando...' : 'Nenhum resultado encontrado.'}
          </CommandEmpty>

          {/* Data results */}
          {Object.entries(groupedResults).map(([type, items]) => {
            const TypeIcon = typeIcon(type as SearchResult['type']);
            return (
              <CommandGroup key={type} heading={typeLabel(type as SearchResult['type'])}>
                {items.map(item => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.sublabel}`}
                    onSelect={() => { onNavigate(item.tab); setOpen(false); }}
                  >
                    <TypeIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm">{item.label}</span>
                      {item.sublabel && (
                        <span className="text-[11px] text-muted-foreground truncate">{item.sublabel}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          {/* Modules */}
          <CommandGroup heading="Módulos">
            {moduleItems.map(({ value, label, keywords, Icon }) => (
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
