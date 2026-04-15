import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, User, Trash2, Loader2, Zap, Search, Car, FileText, RefreshCw, Scale, Truck } from 'lucide-react';
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
  content: `👋 Olá! Sou o **AutoIQ**.

Carrego **25 anos de conhecimento técnico de Maurício Chaparim** no mercado automotivo brasileiro — linha leve e pesada.

Estou aqui como seu **especialista particular**, disponível 24 horas, para nunca deixar você errar numa compra de peças.

**O que precisa hoje?**`,
};

const QUICK_ACTIONS = [
  { label: '🚗 Consultar peças por veículo', icon: Car, prompt: 'Quero consultar peças para um veículo. Qual veículo você precisa?' },
  { label: '🔍 Buscar código de peça', icon: Search, prompt: 'Preciso buscar o código de uma peça específica. Qual peça e veículo?' },
  { label: '📋 Cotar lista completa', icon: FileText, prompt: 'Quero cotar uma lista completa de peças. Me informe os itens e o veículo.' },
  { label: '🔄 Revisão por km rodado', icon: RefreshCw, prompt: 'Preciso de uma lista de revisão por quilometragem. Qual veículo e km atual?' },
  { label: '⚖️ Comparar fornecedores', icon: Scale, prompt: 'Quero comparar fornecedores para uma peça. Qual peça e veículo?' },
  { label: '🚛 Linha pesada / caminhão', icon: Truck, prompt: 'Preciso de peças para linha pesada / caminhão. Qual veículo e peças?' },
];

export default function AutoIQ() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Animate loading phases
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingPhase(p => (p + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadingMessages = [
    '⚡ Consultando base de conhecimento...',
    '🔍 Verificando códigos na web...',
    '✅ Preparando resposta...',
  ];

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
    setLoadingPhase(0);

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
      <header className="border-b border-border bg-card px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">⚡ AutoIQ</h1>
              </div>
              <p className="text-xs text-muted-foreground">A inteligência de Maurício Chaparim trabalhando para sua empresa 24h</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex border-amber-500/30 text-amber-600 bg-amber-500/5">
              ★ 25 Anos de Expertise
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              IA Ativa
            </Badge>
            <Button variant="ghost" size="icon" onClick={clearChat} title="Nova Consulta">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/vendas')}>
              Voltar
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4 pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-1">
                  <Zap className="w-4 h-4 text-amber-500" />
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
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-1">
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{loadingMessages[loadingPhase]}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions (only on welcome) */}
          {messages.length === 1 && messages[0].id === 'welcome' && !isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-3 px-3 flex flex-col items-center gap-1 whitespace-normal text-center"
                  onClick={() => sendMessage(action.prompt)}
                >
                  <action.icon className="h-4 w-4 shrink-0" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer / Input Area */}
      <div className="border-t border-border bg-card shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: HB20 1.0 2020 — filtro óleo e ar · Hilux diesel 2022 — revisão 60.000km"
              disabled={isLoading}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Powered by <span className="font-semibold">Maurício Chaparim</span> · Especialista em Peças Automotivas · 25 anos de mercado · Linha leve e pesada
          </p>
        </div>
      </div>
    </div>
  );
}
