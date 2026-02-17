import { Bot, User } from 'lucide-react';
import { Message } from '@/hooks/useChat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PartsTable, parseMarkdownTable } from './PartsTable';
import { PartsCards, parseListToParts } from './PartsCards';

interface ChatMessageProps {
  message: Message;
  onAddToQuote?: (part: { codigo: string; fornecedor: string; produto: string; aplicacao: string }) => void;
  quoteItems?: string[];
}

export function ChatMessage({ message, onAddToQuote, quoteItems = [] }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Try to parse parts table from assistant messages
  const tableData = !isUser ? parseMarkdownTable(message.content) : null;
  const listData = !isUser && !tableData ? parseListToParts(message.content) : null;

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
        isUser 
          ? 'bg-primary/20 border border-primary/30' 
          : 'bg-secondary border border-border'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-primary" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block px-4 py-3 ${
          isUser ? 'chat-bubble-user' : 'chat-bubble-ai'
        }`}>
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
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
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-border">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted/50">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left font-medium text-foreground border-b border-border">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 border-b border-border/50 text-muted-foreground">
                      {children}
                    </td>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-primary">{children}</strong>
                  ),
                  code: ({ children }) => (
                    <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
                      {children}
                    </code>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm text-muted-foreground">{children}</li>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 px-1">
          {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
