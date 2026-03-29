import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GripVertical, Phone, Send, CheckCircle, Trash2, Clock } from 'lucide-react';
import type { Customer, Sale } from '@/hooks/useSalesData';

interface QuoteItem {
  codigo: string;
  produto: string;
  fornecedor?: string;
  quantidade: number;
  preco_unitario: number;
}

interface SavedQuote {
  id: string;
  user_id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: QuoteItem[];
  total: number;
  discount: number;
  notes: string | null;
  status: string;
  pipeline_stage: string;
  expires_at: string | null;
  converted_sale_id: string | null;
  created_at: string;
  updated_at: string;
}

const PIPELINE_STAGES = [
  { key: 'novo', label: 'Novo', color: 'bg-blue-500/15 border-blue-500/30', dotColor: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400' },
  { key: 'em_negociacao', label: 'Em Negociação', color: 'bg-amber-500/15 border-amber-500/30', dotColor: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-400' },
  { key: 'aguardando', label: 'Aguardando Aprovação', color: 'bg-purple-500/15 border-purple-500/30', dotColor: 'bg-purple-500', textColor: 'text-purple-700 dark:text-purple-400' },
  { key: 'fechado', label: 'Fechado / Convertido', color: 'bg-emerald-500/15 border-emerald-500/30', dotColor: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-400' },
  { key: 'perdido', label: 'Perdido', color: 'bg-destructive/10 border-destructive/30', dotColor: 'bg-destructive', textColor: 'text-destructive' },
];

interface Props {
  quotes: SavedQuote[];
  onRefresh: () => void;
  onConvertToSale: (quote: SavedQuote) => Promise<void>;
  onSendWhatsApp: (quote: SavedQuote) => void;
  onDelete: (id: string) => Promise<void>;
}

export function QuotesKanban({ quotes, onRefresh, onConvertToSale, onSendWhatsApp, onDelete }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, quoteId: string) => {
    setDraggedId(quoteId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageKey);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedId) return;

    const quote = quotes.find(q => q.id === draggedId);
    if (!quote || quote.pipeline_stage === stageKey) {
      setDraggedId(null);
      return;
    }

    // Update pipeline_stage in DB
    const updates: Record<string, string> = {
      pipeline_stage: stageKey,
      updated_at: new Date().toISOString(),
    };

    // Auto-sync status
    if (stageKey === 'fechado') updates.status = 'approved';
    if (stageKey === 'perdido') updates.status = 'rejected';

    const { error } = await supabase
      .from('saved_quotes')
      .update(updates)
      .eq('id', draggedId);

    if (error) {
      toast.error('Erro ao mover orçamento');
    } else {
      toast.success(`Movido para "${PIPELINE_STAGES.find(s => s.key === stageKey)?.label}"`);
      onRefresh();
    }
    setDraggedId(null);
  };

  const getQuotesForStage = (stageKey: string) =>
    quotes.filter(q => (q.pipeline_stage || 'novo') === stageKey);

  const getStageTotal = (stageKey: string) =>
    getQuotesForStage(stageKey).reduce((s, q) => s + Number(q.total), 0);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
      {PIPELINE_STAGES.map(stage => {
        const stageQuotes = getQuotesForStage(stage.key);
        const stageTotal = getStageTotal(stage.key);
        const isDragOver = dragOverStage === stage.key;

        return (
          <div
            key={stage.key}
            className={`flex-shrink-0 w-[280px] rounded-xl border-2 transition-colors ${
              isDragOver ? stage.color + ' scale-[1.01]' : 'border-border/50 bg-muted/30'
            }`}
            onDragOver={e => handleDragOver(e, stage.key)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, stage.key)}
          >
            {/* Column header */}
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                <h3 className={`text-sm font-semibold ${stage.textColor}`}>{stage.label}</h3>
                <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
                  {stageQuotes.length}
                </Badge>
              </div>
              {stageTotal > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {stageTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[120px]">
              {stageQuotes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 italic">
                  Arraste orçamentos aqui
                </p>
              )}
              {stageQuotes.map(quote => (
                <Card
                  key={quote.id}
                  draggable
                  onDragStart={e => handleDragStart(e, quote.id)}
                  className={`cursor-grab active:cursor-grabbing border-border/60 hover:border-border transition-all ${
                    draggedId === quote.id ? 'opacity-40 scale-95' : ''
                  }`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {quote.customer_name || 'Sem cliente'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          #{quote.id.slice(0, 6)} • {format(new Date(quote.created_at), 'dd/MM', { locale: ptBR })}
                        </p>
                      </div>
                      <span className="text-sm font-bold shrink-0">
                        R$ {Number(quote.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      {quote.items.length} {quote.items.length === 1 ? 'item' : 'itens'}
                      {quote.items.length > 0 && ` • ${quote.items[0].produto.substring(0, 25)}${quote.items[0].produto.length > 25 ? '...' : ''}`}
                    </p>

                    {quote.expires_at && new Date(quote.expires_at) > new Date() && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Até {format(new Date(quote.expires_at), 'dd/MM', { locale: ptBR })}
                      </p>
                    )}

                    {/* Quick actions */}
                    <div className="flex gap-1 pt-1 border-t border-border/40">
                      {stage.key !== 'fechado' && stage.key !== 'perdido' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] gap-1"
                          onClick={e => { e.stopPropagation(); onConvertToSale(quote); }}
                        >
                          <CheckCircle className="w-3 h-3" /> Vender
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[10px] gap-1"
                        onClick={e => { e.stopPropagation(); onSendWhatsApp(quote); }}
                      >
                        <Send className="w-3 h-3" /> WhatsApp
                      </Button>
                      {stage.key !== 'fechado' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] gap-1 text-destructive ml-auto"
                          onClick={e => { e.stopPropagation(); onDelete(quote.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
