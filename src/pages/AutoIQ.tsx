import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Zap, Trash2, ArrowLeft, Sun, Moon } from 'lucide-react';
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

const themes = {
  dark: {
    bg: '#0d0d0d',
    text: '#e8e8e8',
    border: '#1a1a1a',
    userBubble: '#2a2a2a',
    userText: '#e8e8e8',
    assistantText: '#d4d4d4',
    inputBg: '#1a1a1a',
    inputBorder: '#2a2a2a',
    inputText: '#e8e8e8',
    placeholder: '#666',
    sendBg: '#e8e8e8',
    sendIcon: '#0d0d0d',
    hoverBg: 'hover:bg-white/5',
    iconColor: 'text-neutral-400',
    titleColor: 'text-neutral-200',
    subtitleColor: 'text-neutral-500',
    footerColor: 'text-neutral-600',
    dotColor: 'bg-neutral-500',
  },
  claude: {
    bg: '#f5f0e8',
    text: '#2d2b28',
    border: '#e5ddd0',
    userBubble: '#e8e0d2',
    userText: '#2d2b28',
    assistantText: '#3d3a36',
    inputBg: '#ffffff',
    inputBorder: '#d9d0c3',
    inputText: '#2d2b28',
    placeholder: '#7a7068',
    sendBg: '#2d2b28',
    sendIcon: '#f5f0e8',
    hoverBg: 'hover:bg-black/5',
    iconColor: 'text-stone-600',
    titleColor: 'text-stone-800',
    subtitleColor: 'text-stone-600',
    footerColor: 'text-stone-500',
    dotColor: 'bg-stone-400',
  },
} as const;

type ThemeKey = keyof typeof themes;

export default function AutoIQ() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>(() => {
    return (localStorage.getItem('autoiq-theme') as ThemeKey) || 'claude';
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const t = themes[theme];

  useEffect(() => {
    localStorage.setItem('autoiq-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'claude' : 'dark');
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen transition-colors duration-300" style={{ backgroundColor: t.bg, color: t.text }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b transition-colors duration-300" style={{ borderColor: t.border }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/sales')} className={`p-1.5 rounded-lg ${t.hoverBg} transition-colors`}>
            <ArrowLeft className={`w-4 h-4 ${t.iconColor}`} />
          </button>
          <span className={`text-sm font-medium ${t.titleColor}`}>⚡ AutoIQ — Maurício Chaparim</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} className={`p-1.5 rounded-lg ${t.hoverBg} transition-colors`} title="Alternar tema">
            {theme === 'dark' ? <Sun className={`w-4 h-4 ${t.iconColor}`} /> : <Moon className={`w-4 h-4 ${t.iconColor}`} />}
          </button>
          <button onClick={clearChat} className={`p-1.5 rounded-lg ${t.hoverBg} transition-colors`} title="Nova conversa">
            <Trash2 className={`w-4 h-4 ${t.iconColor}`} />
          </button>
        </div>
      </header>

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-4 py-6">
          {isEmpty && !isLoading && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <Zap className="w-10 h-10 text-amber-500 mb-4" />
              <h2 className={`text-xl font-medium ${t.titleColor} mb-2`}>AutoIQ</h2>
              <p className={`text-sm ${t.subtitleColor} max-w-md`}>
                Consultor de peças automotivas com 25 anos de experiência. Pergunte sobre qualquer peça, veículo ou revisão.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="rounded-2xl px-4 py-2.5 max-w-[85%] text-sm transition-colors duration-300" style={{ backgroundColor: t.userBubble, color: t.userText }}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-1">
                      <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="autoiq-prose min-w-0 text-sm leading-relaxed transition-colors duration-300" style={{ color: t.assistantText }}>
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
                  <span className={`w-2 h-2 rounded-full ${t.dotColor} animate-bounce`} style={{ animationDelay: '0ms' }} />
                  <span className={`w-2 h-2 rounded-full ${t.dotColor} animate-bounce`} style={{ animationDelay: '150ms' }} />
                  <span className={`w-2 h-2 rounded-full ${t.dotColor} animate-bounce`} style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 transition-colors duration-300" style={{ borderColor: t.border }}>
        <div className="max-w-[760px] mx-auto">
          <div className="flex items-end gap-2 rounded-2xl border px-4 py-2 transition-colors duration-300" style={{ borderColor: t.inputBorder, backgroundColor: t.inputBg }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre peças..."
              disabled={isLoading}
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none outline-none"
              style={{ color: t.inputText, maxHeight: 200, '::placeholder': { color: t.placeholder } } as React.CSSProperties}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="shrink-0 p-1.5 rounded-lg transition-colors disabled:opacity-30"
              style={{ backgroundColor: input.trim() ? t.sendBg : 'transparent' }}
            >
              {isLoading ? (
                <Loader2 className={`w-4 h-4 animate-spin ${t.iconColor}`} />
              ) : (
                <Send className="w-4 h-4" style={{ color: input.trim() ? t.sendIcon : t.placeholder }} />
              )}
            </button>
          </div>
          <p className={`text-[10px] ${t.footerColor} text-center mt-2`}>
            Maurício Chaparim • 25 anos de mercado automotivo
          </p>
        </div>
      </div>
    </div>
  );
}
