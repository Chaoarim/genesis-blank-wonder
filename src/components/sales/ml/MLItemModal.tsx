import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import type { MLResultItem } from '@/services/mercadolivreService';

interface MLItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MLResultItem[];
  pecaNome: string;
}

export function MLItemModal({ open, onOpenChange, items, pecaNome }: MLItemModalProps) {
  const top5 = items
    .sort((a, b) => (b.sold_quantity || 0) - (a.sold_quantity || 0))
    .slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Top 5 Anúncios ML — {pecaNome}</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
          {top5.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-3 py-3">
              <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}</span>
              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-12 h-12 rounded object-cover bg-muted shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-primary">
                    R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {(item.sold_quantity || 0).toLocaleString('pt-BR')} vendidos
                  </Badge>
                  {item.shipping?.free_shipping && (
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/30">
                      Frete Grátis
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Vendedor: {item.seller?.nickname || 'N/A'}
                </p>
              </div>
              <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1 text-xs h-7">
                  <ExternalLink className="w-3 h-3" /> Abrir no ML
                </Button>
              </a>
            </div>
          ))}
          {top5.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado encontrado</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
