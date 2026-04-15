import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Zap, Trash2, ArrowLeft } from 'lucide-react';
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

export default function AutoIQ() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Você precisa estar logado');
      navigate('/login');
      return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content };
    const newMessages = [...messages, userMsg];
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
      toast.error(e instanceof Error ? e.message : 'Erro ao consultar');
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: '❌ Erro ao processar. Tente novamente.' },
      ]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }, [messages, isLoading, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#0d0d0d', color: '#e8e8e8' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/vendas')} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-4 h-4 text-neutral-400" />
          </button>
          <span className="text-sm font-medium text-neutral-200">⚡ AutoIQ — Maurício Chaparim</span>
        </div>
        <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Nova conversa">
          <Trash2 className="w-4 h-4 text-neutral-400" />
        </button>
      </header>

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-4 py-6">
          {isEmpty && !isLoading && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <Zap className="w-10 h-10 text-amber-500 mb-4" />
              <h2 className="text-xl font-medium text-neutral-200 mb-2">AutoIQ</h2>
              <p className="text-sm text-neutral-500 max-w-md">
                Consultor de peças automotivas com 25 anos de experiência. Pergunte sobre qualquer peça, veículo ou revisão.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="rounded-2xl px-4 py-2.5 max-w-[85%] text-sm" style={{ backgroundColor: '#2a2a2a', color: '#e8e8e8' }}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-1">
                      <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="autoiq-prose min-w-0 text-sm leading-relaxed" style={{ color: '#d4d4d4' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="shrink-0 mt-1">
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex items-center gap-1 py-2">
                  <span className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3" style={{ borderColor: '#1a1a1a' }}>
        <div className="max-w-[760px] mx-auto">
          <div className="flex items-end gap-2 rounded-2xl border px-4 py-2" style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre peças..."
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-neutral-600"
              style={{ color: '#e8e8e8', maxHeight: 200 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="shrink-0 p-1.5 rounded-lg transition-colors disabled:opacity-30"
              style={{ backgroundColor: input.trim() ? '#e8e8e8' : 'transparent' }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
              ) : (
                <Send className="w-4 h-4" style={{ color: input.trim() ? '#0d0d0d' : '#666' }} />
              )}
            </button>
          </div>
          <p className="text-[10px] text-neutral-600 text-center mt-2">
            Maurício Chaparim • 25 anos de mercado automotivo
          </p>
        </div>
      </div>
    </div>
  );
}
