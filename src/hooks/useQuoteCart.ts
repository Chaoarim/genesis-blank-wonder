import { useState, useCallback } from 'react';

export interface QuoteItem {
  id: string;
  codigo: string;
  fornecedor: string;
  produto: string;
  aplicacao: string;
  quantidade: number;
  precoUnitario: number;
}

export function useQuoteCart() {
  const [items, setItems] = useState<QuoteItem[]>([]);

  const addItem = useCallback((part: { codigo: string; fornecedor: string; produto: string; aplicacao: string }) => {
    setItems(prev => {
      // Check if already exists
      const existing = prev.find(i => i.codigo === part.codigo && i.fornecedor === part.fornecedor);
      if (existing) return prev;

      return [...prev, {
        id: crypto.randomUUID(),
        codigo: part.codigo,
        fornecedor: part.fornecedor,
        produto: part.produto,
        aplicacao: part.aplicacao,
        quantidade: 1,
        precoUnitario: 0,
      }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateItem = useCallback((id: string, field: 'quantidade' | 'precoUnitario', value: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.quantidade * i.precoUnitario, 0);

  const sendToWhatsApp = useCallback((phone?: string) => {
    if (items.length === 0) return;

    const lines = items.map((item, idx) => {
      const subtotal = item.quantidade * item.precoUnitario;
      return `${idx + 1}. ${item.codigo} - ${item.produto}\n   Fornecedor: ${item.fornecedor}\n   Qtde: ${item.quantidade} x R$ ${item.precoUnitario.toFixed(2)} = R$ ${subtotal.toFixed(2)}`;
    });

    const text = `*ORÇAMENTO DE PEÇAS*\n\n${lines.join('\n\n')}\n\n*TOTAL: R$ ${total.toFixed(2)}*`;
    const encoded = encodeURIComponent(text);
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(url, '_blank');
  }, [items, total]);

  return { items, addItem, removeItem, updateItem, clearCart, total, sendToWhatsApp };
}
