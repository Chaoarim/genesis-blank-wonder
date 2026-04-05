import { BarChart3, Package, FileSpreadsheet, Search, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  value: string;
  icon: React.ElementType;
  label: string;
}

const ADMIN_ITEMS: NavItem[] = [
  { value: 'dashboard', icon: BarChart3, label: 'Início' },
  { value: 'help', icon: HelpCircle, label: 'Ajuda' },
];

const SELLER_ITEMS: NavItem[] = [
  { value: 'dashboard', icon: BarChart3, label: 'Início' },
  { value: 'help', icon: HelpCircle, label: 'Ajuda' },
];

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  visibleTabs: string[];
  isAdmin?: boolean;
  badgeCounts?: Record<string, number>;
}

export function BottomNav({ activeTab, onTabChange, visibleTabs, isAdmin = true, badgeCounts = {} }: BottomNavProps) {
  const baseItems = isAdmin ? ADMIN_ITEMS : SELLER_ITEMS;
  const items = baseItems.filter(i => visibleTabs.includes(i.value));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {items.map(({ value, icon: Icon, label }) => {
          const active = activeTab === value;
          const badge = badgeCounts[value] || 0;
          return (
            <button
              key={value}
              onClick={() => onTabChange(value)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-0 flex-1 ${
                active
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground px-0.5">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
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
