import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, ExternalLink, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { PartThumbnail } from '@/components/PartThumbnail';
import { toast } from 'sonner';

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

export function InventorySearch() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [markup, setMarkup] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
          id: r.id,
          codigo: r.codigo,
          produto: r.produto,
          fornecedor: r.fornecedor || '',
          aplicacao: r.aplicacao || '',
          qtd_estoque: Number(r.qtd_estoque) || 0,
          preco: Number(r.preco) || 0,
          image_url: r.image_url || '',
        })));
      }
      setMarkup(Number(markupRes.data?.markup_revenda) || 0);
      setLoading(false);
    };
    load();
  }, []);

  const normalizeSearch = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = normalizeSearch(search);
    return items.filter(i =>
      normalizeSearch(`${i.codigo} ${i.produto} ${i.fornecedor} ${i.aplicacao}`).includes(q)
    );
  }, [items, search]);

  const saveStock = useCallback(async (id: string) => {
    const newQty = parseInt(editValue);
    if (isNaN(newQty) || newQty < 0) { toast.error('Quantidade inválida'); return; }
    const { error } = await supabase.from('inventory_items').update({ qtd_estoque: newQty }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar estoque'); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, qtd_estoque: newQty } : i));
    setEditingId(null);
    toast.success('Estoque atualizado!');
  }, [editValue]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando estoque...</p>;

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center space-y-2">
        <Package className="w-10 h-10 mx-auto text-muted-foreground" />
        <p className="font-medium">Nenhum item no estoque</p>
        <p className="text-sm text-muted-foreground">Importe sua planilha na aba Markup para começar</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Consultar Estoque ({items.length} itens)
        </h3>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, produto, fornecedor ou veículo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-base"
            autoFocus
          />
        </div>

        {search.trim() && (
          <p className="text-xs text-muted-foreground">{filtered.length} resultado(s)</p>
        )}

        <div className="overflow-auto max-h-[600px] rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Foto</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Aplicação</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-right">Preço Revenda</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map(item => {
                const precoRevenda = markup > 0 ? item.preco * (1 + markup / 100) : item.preco;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="p-1">
                      <PartThumbnail imageUrl={item.image_url} alt={`${item.codigo} - ${item.produto}`} className="w-10 h-10" />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                    <TableCell className="text-sm font-medium">{item.produto}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.fornecedor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.aplicacao}</TableCell>
                    <TableCell className="text-center">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="w-16 h-7 text-center text-xs p-1"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') saveStock(item.id); if (e.key === 'Escape') setEditingId(null); }}
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={() => saveStock(item.id)}>
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setEditingId(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <span className={`font-bold ${item.qtd_estoque <= 0 ? 'text-destructive' : item.qtd_estoque <= 3 ? 'text-amber-500' : 'text-green-600'}`}>
                            {item.qtd_estoque}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(item.id); setEditValue(String(item.qtd_estoque)); }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">{fmt(precoRevenda)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          const q = `${item.codigo} ${item.produto} ${item.fornecedor}`;
                          window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`, '_blank');
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length > 200 && (
            <p className="text-center text-xs text-muted-foreground py-2">
              Mostrando 200 de {filtered.length}. Refine sua busca.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
