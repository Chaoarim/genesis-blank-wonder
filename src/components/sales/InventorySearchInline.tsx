import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, X, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface InventoryItem {
  id: string;
  codigo: string;
  produto: string;
  fornecedor: string;
  aplicacao: string;
  qtd_estoque: number;
  preco: number;
  image_url?: string;
}

interface InventorySearchInlineProps {
  onAddItem: (item: InventoryItem, precoRevenda: number) => void;
}

export function InventorySearchInline({ onAddItem }: InventorySearchInlineProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [markup, setMarkup] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [itemsRes, markupRes] = await Promise.all([
        supabase.from('inventory_items').select('*').eq('user_id', user.id).order('produto'),
        supabase.from('markup_settings').select('markup_revenda').eq('user_id', user.id).maybeSingle(),
      ]);
      if (itemsRes.data) {
        setItems(itemsRes.data.map((r: any) => ({
          id: r.id, codigo: r.codigo, produto: r.produto,
          fornecedor: r.fornecedor || '', aplicacao: r.aplicacao || '',
          qtd_estoque: Number(r.qtd_estoque) || 0, preco: Number(r.preco) || 0,
          image_url: r.image_url || '',
        })));
      }
      setMarkup(Number(markupRes.data?.markup_revenda) || 0);
      setLoading(false);
    };
    load();
  }, []);

  const normalize = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = normalize(query);
    return items.filter(i =>
      normalize(`${i.codigo} ${i.produto} ${i.fornecedor} ${i.aplicacao}`).includes(q)
    ).slice(0, 20);
  }, [items, query]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleAdd = (item: InventoryItem) => {
    const precoRevenda = markup > 0 ? item.preco * (1 + markup / 100) : item.preco;
    onAddItem(item, precoRevenda);
    setQuery('');
    setOpen(false);
  };

  if (loading) return <p className="text-xs text-muted-foreground">Carregando estoque...</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no estoque por código, produto, fornecedor..."
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="pl-9"
          />
        </div>
        {query && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setQuery(''); }}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="border border-border rounded-lg max-h-72 overflow-y-auto bg-card shadow-lg">
          {results.map((item) => {
            const precoRevenda = markup > 0 ? item.preco * (1 + markup / 100) : item.preco;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 border-b border-border last:border-b-0 cursor-pointer group"
                onClick={() => handleAdd(item)}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt={item.codigo} className="w-9 h-9 object-cover rounded" loading="lazy" />
                ) : (
                  <div className="w-9 h-9 bg-muted rounded flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-primary">{item.codigo}</span>
                    <span className="text-xs text-muted-foreground truncate">{item.fornecedor}</span>
                  </div>
                  <p className="text-sm truncate">{item.produto}</p>
                  {item.aplicacao && <p className="text-xs text-muted-foreground truncate">{item.aplicacao}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-primary">{fmt(precoRevenda)}</p>
                  <p className={`text-xs ${item.qtd_estoque <= 2 ? 'text-destructive' : 'text-green-600'}`}>
                    Est: {item.qtd_estoque}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-green-600 shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum item encontrado no estoque</p>
      )}
    </div>
  );
}
