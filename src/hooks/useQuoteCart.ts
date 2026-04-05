import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QuoteItem {
  id: string;
  codigo: string;
  fornecedor: string;
  produto: string;
  aplicacao: string;
  quantidade: number;
}

export interface SavedQuote {
  id: string;
  name: string;
  items: QuoteItem[];
  createdAt: string;
}

const STORAGE_KEY = 'quote-cart-saved';

function getStorageKey(userId: string) {
  return `${STORAGE_KEY}:${userId}`;
}

function loadSavedQuotes(storageKey: string): SavedQuote[] {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persistQuotes(storageKey: string, quotes: SavedQuote[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(quotes));
  } catch {
    // Ignore storage write errors to avoid breaking the quote flow.
  }
}

export function useQuoteCart() {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [quoteName, setQuoteName] = useState('');
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const syncQuotesForUser = (userId: string | null) => {
      if (activeUserIdRef.current === userId) return;

      activeUserIdRef.current = userId;

      if (!userId) {
        setStorageKey(null);
        setSavedQuotes([]);
        setItems([]);
        setQuoteName('');
        return;
      }

      const nextStorageKey = getStorageKey(userId);
      setStorageKey(nextStorageKey);
      setSavedQuotes(loadSavedQuotes(nextStorageKey));
      setItems([]);
      setQuoteName('');
    };

    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      syncQuotesForUser(session?.user.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncQuotesForUser(session?.user.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    persistQuotes(storageKey, savedQuotes);
  }, [savedQuotes, storageKey]);

  const addItem = useCallback((part: { codigo: string; fornecedor: string; produto: string; aplicacao: string }) => {
    setItems(prev => {
      const existing = prev.find(i => i.codigo === part.codigo && i.fornecedor === part.fornecedor);
      if (existing) return prev;
      return [...prev, {
        id: crypto.randomUUID(),
        codigo: part.codigo,
        fornecedor: part.fornecedor,
        produto: part.produto,
        aplicacao: part.aplicacao,
        quantidade: 1,
      }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateItem = useCallback((id: string, field: 'quantidade', value: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }, []);

  const clearCart = useCallback(() => { setItems([]); setQuoteName(''); }, []);

  const saveQuote = useCallback((name: string) => {
    if (items.length === 0 || !name.trim()) return;
    const newQuote: SavedQuote = {
      id: crypto.randomUUID(),
      name: name.trim(),
      items: [...items],
      createdAt: new Date().toISOString(),
    };
    setSavedQuotes(prev => [newQuote, ...prev]);
    setItems([]);
    setQuoteName('');
    return newQuote;
  }, [items]);

  const loadQuote = useCallback((quoteId: string) => {
    const q = savedQuotes.find(s => s.id === quoteId);
    if (q) {
      setItems(q.items.map(i => ({ ...i, id: crypto.randomUUID() })));
      setQuoteName(q.name);
    }
  }, [savedQuotes]);

  const deleteSavedQuote = useCallback((quoteId: string) => {
    setSavedQuotes(prev => prev.filter(q => q.id !== quoteId));
  }, []);

  const sendToWhatsApp = useCallback((phone?: string) => {
    if (items.length === 0) return;
    const title = quoteName.trim() || 'COTAÇÃO DE PEÇAS';

    const lines = items.map((item, idx) => {
      return `${idx + 1}. *${item.codigo}* - ${item.produto}\n   Fornecedor: ${item.fornecedor}\n   Aplicação: ${item.aplicacao}\n   Qtde: ${item.quantidade}`;
    });

    const text = `*${title.toUpperCase()}*\n\nSegue a lista de peças para cotação:\n\n${lines.join('\n\n')}\n\n_Total de itens: ${items.length}_\n\nAguardo retorno com valores. Obrigado!`;
    const encoded = encodeURIComponent(text);
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(url, '_blank');
  }, [items, quoteName]);

  return {
    items, addItem, removeItem, updateItem, clearCart,
    quoteName, setQuoteName, saveQuote, savedQuotes, loadQuote, deleteSavedQuote,
    sendToWhatsApp,
  };
}
