import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Trash2, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `👋 Olá! Sou o **AutoIQ**, seu consultor especialista em peças automotivas.

Posso te ajudar com:
- 🔍 **Códigos de peças** por veículo
- 📋 **Listas completas** de revisão
- 💰 **Comparativo** de fornecedores
- ⚠️ **Alertas** de aplicação
- 🛒 **Sugestão** de venda adicional

**Como posso ajudar hoje?**
Me informe o veículo e as peças que precisa!`,
};

const QUICK_ACTIONS = [
  { label: '🚗 Revisão completa por veículo', prompt: 'Quero uma lista de revisão completa. Qual veículo você precisa?' },
  { label: '🔍 Buscar código de peça', prompt: 'Preciso buscar o código de uma peça. Qual peça e veículo?' },
  { label: '📋 Cotar lista de peças', prompt: 'Quero cotar uma lista de peças. Me informe os itens e o veículo.' },
  { label: '⚖️ Comparar fornecedores', prompt: 'Quero comparar fornecedores para uma peça. Qual peça e veículo?' },
];

export default function AutoIQ() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Você precisa estar logado para usar o AutoIQ');
      navigate('/login');
      return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content };
    const newMessages = [...messages.filter(m => m.id !== 'welcome'), userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autoiq-consultant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${response.status}`);
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: data.response },
      ]);
    } catch (e) {
      console.error('AutoIQ error:', e);
      toast.error(e instanceof Error ? e.message : 'Erro ao consultar o AutoIQ');
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: '❌ Desculpe, ocorreu um erro ao processar sua consulta. Tente novamente.' },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, isLoading, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">AutoIQ</h1>
              <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                NOVO
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Consultor de Peças Automotivas IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Powered by Claude AI
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
            🔍 Web Search Ativo
          </Badge>
          <Button variant="ghost" size="icon" onClick={clearChat} title="Nova Consulta">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/vendas')}>
            Voltar
          </Button>
        </div>
      </header>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4 pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 border border-border'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>🤖 AutoIQ está consultando... 🔍 Buscando códigos na web...</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions (only on welcome) */}
          {messages.length === 1 && messages[0].id === 'welcome' && !isLoading && (
            <div className="flex flex-wrap gap-2 pt-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2 px-3"
                  onClick={() => sendMessage(action.prompt)}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Gol G4 1.0 2008 — preciso de pastilha, disco e amortecedor dianteiro"
            disabled={isLoading}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
