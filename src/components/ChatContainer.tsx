import { useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { usePartsDatabase } from '@/hooks/usePartsDatabase';
import { useQuoteCart } from '@/hooks/useQuoteCart';
import { ChatHeader } from './ChatHeader';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { WelcomeMessage } from './WelcomeMessage';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatContainerProps {
  onLogout?: () => void;
}

export function ChatContainer({ onLogout }: ChatContainerProps) {
  const {
    parts,
    totalParts,
    isLoading: isLoadingDatabase,
    error: dbError,
    loadProgress,
    getRelevantPartsForAI,
  } = usePartsDatabase();

  const quoteCart = useQuoteCart();

  const { messages, isLoading, error, sendMessage, clearMessages } = useChat({
    getRelevantPartsForAI,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleExampleClick = (query: string, options?: { silent?: boolean }) => {
    if (isLoadingDatabase) return;
    sendMessage(query, options);
  };

  const handleConsultAI = (supplierName: string) => {
    sendMessage(`Quais são as principais peças do fornecedor ${supplierName}? Liste os produtos mais importantes.`);
  };

  const handleClearMessages = () => {
    clearMessages();
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-background to-muted/20">
      <ChatHeader 
        totalParts={totalParts} 
        isLoadingDatabase={isLoadingDatabase}
        loadProgress={loadProgress}
        onLogout={onLogout}
        parts={parts}
        onConsultAI={handleConsultAI}
        quoteCart={quoteCart}
      />

      <div className="flex-1 overflow-y-auto scrollbar-custom">
        {messages.length === 0 ? (
          <WelcomeMessage onExampleClick={handleExampleClick} parts={parts} onAddToQuote={quoteCart.addItem} />
        ) : (
          <div className="p-6 space-y-6">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <TypingIndicator />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {(error || dbError) && (
        <div className="mx-6 mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive flex-1">{error || dbError}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearMessages}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reiniciar
          </Button>
        </div>
      )}

      {messages.length > 0 && (
        <>
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearMessages}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Nova conversa
            </Button>
          </div>

          <ChatInput 
            onSend={sendMessage} 
            isLoading={isLoading} 
            disabled={isLoadingDatabase}
          />
        </>
      )}
    </div>
  );
}
