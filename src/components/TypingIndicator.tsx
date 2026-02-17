import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="chat-bubble-ai px-4 py-3">
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}
