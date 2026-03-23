import { BarChart3, PlusCircle, Package, Users, ShoppingBag } from 'lucide-react';

const NAV_ITEMS = [
  { value: 'dashboard', icon: BarChart3, label: 'Início' },
  { value: 'new-sale', icon: PlusCircle, label: 'Vender' },
  { value: 'orders', icon: ShoppingBag, label: 'Pedidos' },
  { value: 'inventory', icon: Package, label: 'Estoque' },
  { value: 'customers', icon: Users, label: 'Clientes' },
];

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  visibleTabs: string[];
}

export function BottomNav({ activeTab, onTabChange, visibleTabs }: BottomNavProps) {
  const items = NAV_ITEMS.filter(i => visibleTabs.includes(i.value));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {items.map(({ value, icon: Icon, label }) => {
          const active = activeTab === value;
          return (
            <button
              key={value}
              onClick={() => onTabChange(value)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-0 flex-1 ${
                active
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
              <span className={`text-[10px] truncate ${active ? 'font-semibold' : ''}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
