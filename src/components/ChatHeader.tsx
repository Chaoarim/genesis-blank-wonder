import { Car, Database, Zap, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CatalogsSheet } from './CatalogsSheet';
import { QuotePanel } from './QuotePanel';
import { Part } from '@/hooks/usePartsDatabase';
import type { QuoteItem } from '@/hooks/useQuoteCart';

interface ChatHeaderProps {
  totalParts: number;
  isLoadingDatabase: boolean;
  loadProgress?: number;
  onLogout?: () => void;
  parts: Part[];
  onConsultAI?: (supplierName: string) => void;
  quoteCart: {
    items: QuoteItem[];
    total: number;
    addItem: (part: { codigo: string; fornecedor: string; produto: string; aplicacao: string }) => void;
    removeItem: (id: string) => void;
    updateItem: (id: string, field: 'quantidade' | 'precoUnitario', value: number) => void;
    clearCart: () => void;
    sendToWhatsApp: (phone?: string) => void;
  };
}

export function ChatHeader({ totalParts, isLoadingDatabase, loadProgress = 0, onLogout, parts, onConsultAI, quoteCart }: ChatHeaderProps) {

  return (
    <header className="glass-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center animate-pulse-glow">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              ConsultaParts <span className="text-gradient">AI</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Assistente inteligente para peças automotivas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">

          <div className="flex items-center gap-2 text-sm">
            <Database className="w-4 h-4 text-primary" />
            {isLoadingDatabase ? (
              <span className="text-muted-foreground">
                {loadProgress > 0 ? `${loadProgress}%` : 'Carregando...'}
              </span>
            ) : (
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">{totalParts.toLocaleString()}</span> peças
              </span>
            )}
          </div>
          <QuotePanel
            items={quoteCart.items}
            total={quoteCart.total}
            onUpdateItem={quoteCart.updateItem}
            onRemoveItem={quoteCart.removeItem}
            onClearCart={quoteCart.clearCart}
            onSendWhatsApp={quoteCart.sendToWhatsApp}
          />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30">
            <Zap className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-medium text-success">Online</span>
          </div>
          {onLogout && (
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
