import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, RotateCcw, Package, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Part } from '@/hooks/usePartsDatabase';
import { supabase } from '@/integrations/supabase/client';
import { PartsTable, parseMarkdownTable } from './PartsTable';
import { PartsCards, parseListToParts } from './PartsCards';
import { getRelevantPartsForAIFromList } from '@/features/catalogs/getRelevantPartsForAIFromList';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SupplierChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierName: string;
  parts: Part[];
  onAddToQuote?: (part: { codigo: string; fornecedor: string; produto: string; aplicacao: string }) => void;
  quoteItems?: string[];
}

export function SupplierChatDialog({ open, onOpenChange, supplierName, parts, onAddToQuote, quoteItems = [] }: SupplierChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter parts for this supplier
  const supplierParts = parts.filter(
    p => p.fornecedor.trim().toUpperCase() === supplierName.toUpperCase()
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Reset messages when dialog opens with a new supplier
  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput('');
    }
  }, [open, supplierName]);

  const getRelevantPartsForAI = (query: string): string => {
    console.log(`[SupplierChat] Buscando "${query}" em ${supplierParts.length} peças de ${supplierName}`);
    const result = getRelevantPartsForAIFromList(supplierParts, query, 80);
    console.log(`[SupplierChat] Resultado: ${result ? result.split('\n').length + ' linhas' : 'VAZIO'}`);
    if (!result) {
      const golParts = supplierParts.filter(p => (p.modelo || '').toLowerCase().includes('gol'));
      console.log(`[SupplierChat] Peças com "gol" no modelo:`, golParts.length, golParts.slice(0, 3).map(p => ({ fab: p.fabricante, mod: p.modelo, chave: (p.chaveDeBusca || '').substring(0, 80) })));
    }
    return result;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Você precisa estar logado para usar o chat.',
        timestamp: new Date(),
      }]);
      setIsLoading(false);
      return;
    }

    const partsData = getRelevantPartsForAI(userMessage.content);
    let assistantContent = '';

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          partsData,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Erro ao comunicar com o assistente');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              assistantContent += deltaContent;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) =>
                    i === prev.length - 1
                      ? { ...m, content: assistantContent }
                      : m
                  );
                }
                return [...prev, {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: new Date(),
                }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error('Chat error:', e);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Erro ao processar sua consulta. Tente novamente.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border bg-card">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {supplierName.substring(0, 2)}
            </div>
            <div>
              <span className="text-lg">Consulta Rápida - {supplierName}</span>
              <p className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                <Package className="w-3 h-3" />
                {supplierParts.length.toLocaleString()} peças disponíveis
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Consulta Rápida - {supplierName}</p>
                <p className="text-sm">
                  Faça perguntas sobre as peças deste fornecedor.
                </p>
                <p className="text-sm mt-1">
                  Ex: "Quais peças para Gol G5?" ou "Código 110377"
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const tableData = message.role === 'assistant' ? parseMarkdownTable(message.content) : null;
                const listData = message.role === 'assistant' && !tableData ? parseListToParts(message.content) : null;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[95%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      ) : tableData ? (
                        <div className="space-y-3">
                          {tableData.textBefore && (
                            <p className="text-sm leading-relaxed">{tableData.textBefore}</p>
                          )}
                          <PartsTable rows={tableData.rows} onAddToQuote={onAddToQuote} quoteItems={quoteItems} />
                          {tableData.textAfter && (
                            <p className="text-sm leading-relaxed mt-3">{tableData.textAfter}</p>
                          )}
                        </div>
                      ) : listData ? (
                        <div className="space-y-3">
                          {listData.textBefore && (
                            <p className="text-sm leading-relaxed">{listData.textBefore}</p>
                          )}
                          <PartsCards parts={listData.parts} onAddToQuote={onAddToQuote} quoteItems={quoteItems} />
                          {listData.textAfter && (
                            <p className="text-sm leading-relaxed mt-3">{listData.textAfter}</p>
                          )}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                      <div className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {messages.length > 0 && (
          <div className="flex justify-center py-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Nova conversa
            </Button>
          </div>
        )}

        <div className="p-4 border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Consultar peças de ${supplierName}...`}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const searchQuery = input.trim() || supplierName;
                const googleUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}+${encodeURIComponent(supplierName)}+peça+automotiva`;
                window.open(googleUrl, '_blank');
                toast.success(`Pesquisando: ${searchQuery} - ${supplierName}`);
              }}
              className="border-primary/30 text-primary hover:bg-primary/10"
              title="Pesquisar catálogo na web"
            >
              <Globe className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
