import { useState } from 'react';
import { Trash2, Send, ShoppingCart, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { QuoteItem } from '@/hooks/useQuoteCart';

interface QuotePanelProps {
  items: QuoteItem[];
  total: number;
  onUpdateItem: (id: string, field: 'quantidade' | 'precoUnitario', value: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onSendWhatsApp: (phone?: string) => void;
}

export function QuotePanel({ items, total, onUpdateItem, onRemoveItem, onClearCart, onSendWhatsApp }: QuotePanelProps) {
  const [saving, setSaving] = useState(false);

  const handleSaveQuote = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Faça login para salvar'); return; }

      const quoteItems = items.map(i => ({
        codigo: i.codigo,
        produto: i.produto,
        fornecedor: i.fornecedor,
        quantidade: i.quantidade,
        preco_unitario: i.precoUnitario,
      }));

      const { error } = await supabase.from('saved_quotes').insert({
        user_id: session.user.id,
        items: quoteItems,
        total,
        discount: 0,
        status: 'pending',
      });

      if (error) { toast.error('Erro ao salvar orçamento'); return; }
      toast.success('Orçamento salvo! Acesse em Central de Vendas → Orçamentos.');
      onClearCart();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Orçamento
          {items.length > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {items.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Orçamento ({items.length} {items.length === 1 ? 'item' : 'itens'})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Nenhum item no orçamento. Adicione peças dos resultados de busca.
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 mt-4 pr-1">
              {items.map((item) => {
                const subtotal = item.quantidade * item.precoUnitario;
                return (
                  <div key={item.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.codigo}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.produto}</p>
                        <p className="text-xs text-muted-foreground/70">{item.fornecedor}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onRemoveItem(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground">Qtde</label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantidade}
                          onChange={e => onUpdateItem(item.id, 'quantidade', Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-muted-foreground">Preço Unit. (R$)</label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.precoUnitario || ''}
                          onChange={e => onUpdateItem(item.id, 'precoUnitario', Math.max(0, parseFloat(e.target.value) || 0))}
                          className="h-8 text-sm"
                          placeholder="0,00"
                        />
                      </div>
                      <div className="text-right min-w-[70px]">
                        <label className="text-[10px] text-muted-foreground">Subtotal</label>
                        <p className="text-sm font-medium text-primary">R$ {subtotal.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border pt-4 mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold text-primary">R$ {total.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClearCart} className="flex-1">
                  <X className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
                <Button size="sm" variant="secondary" onClick={handleSaveQuote} disabled={saving} className="flex-1">
                  <Save className="w-4 h-4 mr-1" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button size="sm" onClick={() => onSendWhatsApp()} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <Send className="w-4 h-4 mr-1" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
