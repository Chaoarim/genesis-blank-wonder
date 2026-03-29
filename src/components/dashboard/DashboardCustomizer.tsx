import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Settings2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export interface DashboardCard {
  id: string;
  label: string;
  visible: boolean;
}

const STORAGE_KEY = 'dashboard_card_order';

const defaultCards: DashboardCard[] = [
  { id: 'search', label: 'Buscar Peças', visible: true },
  { id: 'shortcuts', label: 'Central de Vendas', visible: true },
  { id: 'catalog', label: 'Catálogo B2B', visible: true },
];

export function useDashboardCards() {
  const [cards, setCards] = useState<DashboardCard[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: DashboardCard[] = JSON.parse(saved);
        // Merge with defaults to handle new cards
        return defaultCards.map(d => {
          const found = parsed.find(p => p.id === d.id);
          return found ? { ...d, visible: found.visible } : d;
        }).sort((a, b) => {
          const ai = parsed.findIndex(p => p.id === a.id);
          const bi = parsed.findIndex(p => p.id === b.id);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
      }
    } catch { /* ignore */ }
    return defaultCards;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  const toggleCard = useCallback((id: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  }, []);

  const moveCard = useCallback((fromIndex: number, toIndex: number) => {
    setCards(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  return { cards, toggleCard, moveCard };
}

interface DashboardCustomizerProps {
  cards: DashboardCard[];
  onToggle: (id: string) => void;
  onMove: (from: number, to: number) => void;
}

export function DashboardCustomizer({ cards, onToggle, onMove }: DashboardCustomizerProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px]">
        <SheetHeader>
          <SheetTitle>Personalizar Dashboard</SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mt-2 mb-4">
          Arraste para reordenar e alterne a visibilidade dos cards.
        </p>
        <div className="space-y-2">
          {cards.map((card, idx) => (
            <div
              key={card.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                if (dragIdx !== null && dragIdx !== idx) onMove(dragIdx, idx);
                setDragIdx(null);
              }}
              className={`flex items-center gap-3 p-3 rounded-lg border bg-card cursor-grab active:cursor-grabbing transition-all ${
                dragIdx === idx ? 'opacity-50 scale-95' : ''
              }`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-medium">{card.label}</span>
              <Switch checked={card.visible} onCheckedChange={() => onToggle(card.id)} />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
