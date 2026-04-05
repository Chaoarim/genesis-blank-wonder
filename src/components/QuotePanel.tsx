import { useState } from 'react';
import { Trash2, Send, ShoppingCart, X, Save, FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { QuoteItem, SavedQuote } from '@/hooks/useQuoteCart';

interface QuotePanelProps {
  items: QuoteItem[];
  quoteName: string;
  onSetQuoteName: (name: string) => void;
  onUpdateItem: (id: string, field: 'quantidade', value: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onSendWhatsApp: (phone?: string) => void;
  onSaveQuote: (name: string) => SavedQuote | undefined;
  savedQuotes: SavedQuote[];
  onLoadQuote: (id: string) => void;
  onDeleteSavedQuote: (id: string) => void;
}

export function QuotePanel({
  items, quoteName, onSetQuoteName, onUpdateItem, onRemoveItem, onClearCart,
  onSendWhatsApp, onSaveQuote, savedQuotes, onLoadQuote, onDeleteSavedQuote,
}: QuotePanelProps) {
  const [tab, setTab] = useState<'current' | 'saved'>('current');

  const handleSave = () => {
    const name = quoteName.trim();
    if (!name) { toast.error('Digite um nome de referência para a cotação'); return; }
    if (items.length === 0) { toast.error('Adicione peças antes de salvar'); return; }
    onSaveQuote(name);
    toast.success(`Cotação "${name}" salva com sucesso!`);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Cotação
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
            Cotações
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-1 mt-2 border-b border-border pb-0">
          <button
            onClick={() => setTab('current')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'current' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" />
            Atual ({items.length})
          </button>
          <button
            onClick={() => setTab('saved')}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <FolderOpen className="w-3.5 h-3.5 inline mr-1" />
            Salvas ({savedQuotes.length})
          </button>
        </div>

        {tab === 'current' ? (
          <>
            {/* Quote name */}
            <div className="mt-3">
              <label className="text-xs font-medium text-muted-foreground">Nome da cotação *</label>
              <Input
                value={quoteName}
                onChange={e => onSetQuoteName(e.target.value)}
                placeholder="Ex: Cotação Filtros HB20, Revisão Civic 2020..."
                className="h-9 text-sm mt-1"
              />
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Nenhum item. Adicione peças dos resultados de busca.
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 mt-3 pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.codigo}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.produto}</p>
                          <p className="text-xs text-muted-foreground/70">{item.fornecedor}</p>
                          {item.aplicacao && <p className="text-xs text-muted-foreground/50 truncate">{item.aplicacao}</p>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onRemoveItem(item.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <label className="text-[10px] text-muted-foreground">Qtde</label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantidade}
                            onChange={e => onUpdateItem(item.id, 'quantidade', Math.max(1, parseInt(e.target.value) || 1))}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total de itens</span>
                    <span className="text-lg font-bold text-primary">{items.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onClearCart} className="flex-1">
                      <X className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleSave} className="flex-1">
                      <Save className="w-4 h-4 mr-1" />
                      Salvar
                    </Button>
                    <Button size="sm" onClick={() => onSendWhatsApp()} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                      <Send className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          /* Saved quotes tab */
          <div className="flex-1 overflow-y-auto mt-3 space-y-3">
            {savedQuotes.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-16">
                Nenhuma cotação salva.
              </div>
            ) : (
              savedQuotes.map(q => (
                <div key={q.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{q.name}</p>
                      <p className="text-xs text-muted-foreground">{q.items.length} itens • {new Date(q.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                      onDeleteSavedQuote(q.id);
                      toast.success('Cotação excluída');
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5 max-h-20 overflow-hidden">
                    {q.items.slice(0, 3).map((item, i) => (
                      <p key={i} className="truncate">• {item.codigo} - {item.produto}</p>
                    ))}
                    {q.items.length > 3 && <p className="text-muted-foreground/50">+{q.items.length - 3} mais...</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      onLoadQuote(q.id);
                      setTab('current');
                      toast.success(`Cotação "${q.name}" carregada`);
                    }}>
                      <FolderOpen className="w-3.5 h-3.5 mr-1" />
                      Carregar
                    </Button>
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                      const today = new Date().toLocaleDateString('pt-BR');
                      const text = formatQuoteWhatsApp(q.name, q.items, today);
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                    }}>
                      <Send className="w-3.5 h-3.5 mr-1" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
