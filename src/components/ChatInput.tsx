import { useState, KeyboardEvent, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !isLoading && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim() && !isLoading && !disabled;

  return (
    <div className="glass-card border-t border-border p-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite: Peça + Veículo + Ano (ex: 'Rolamento GOL 2010')"
            className="min-h-[52px] max-h-[200px] resize-none bg-input border-border focus:border-primary focus:ring-primary/20 placeholder:text-muted-foreground/60"
            disabled={isLoading || disabled}
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={!canSend}
          className="h-[52px] w-[52px] bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all hover:scale-105 active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
      
      <div className="flex items-center justify-end mt-2 px-1">
        <p className="text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Enter</kbd> para enviar
        </p>
      </div>
    </div>
  );
}
